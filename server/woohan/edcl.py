"""
Event-Driven Continuous Learning (EDCL) - Adaptive learning engine for WOOHAN.

This module implements event detection, significance thresholding, and adaptive learning
that updates the Dynamic Memory Model only upon significant interaction events.

Key Features:
- Significance scoring based on prediction error and model uncertainty
- Adaptive threshold tuning using exponential moving average
- AdamW optimizer with gradient clipping for stable learning
- Convergence analysis and learning metrics

References:
- Kingma & Ba (2014): Adam Optimizer
- Loshchilov & Hutter (2019): Decoupled Weight Decay Regularization (AdamW)
"""

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from typing import Tuple, Optional, List, Dict
from dataclasses import dataclass
from collections import deque


@dataclass
class EDCLConfig:
    """Configuration for Event-Driven Continuous Learning."""
    learning_rate: float = 0.001  # Learning rate for AdamW
    weight_decay: float = 0.01  # L2 regularization
    gradient_clip_norm: float = 1.0  # Max norm for gradient clipping
    initial_threshold: float = 0.5  # Initial significance threshold
    threshold_alpha: float = 0.1  # EMA smoothing factor for threshold
    uncertainty_lambda: float = 0.5  # Weight for uncertainty in significance score
    max_gradient_norm: float = 1.0  # Maximum gradient norm before clipping
    device: str = "cpu"


class EventDetector:
    """
    Detects significant events in the input stream.
    
    Significance is measured as:
    S(E_t) = ||x_t - Predict(x_{t-1})||_2 + λ * Uncertainty(h_{t-1})
    
    Where:
    - ||x_t - Predict(x_{t-1})||_2 is the prediction error (L2 norm)
    - Uncertainty(h_{t-1}) is the model's confidence measure
    - λ is a tuning parameter (uncertainty_lambda)
    """
    
    def __init__(self, config: EDCLConfig, input_size: int):
        self.config = config
        self.input_size = input_size
        self.device = torch.device(config.device)
        
        # Prediction network: simple feedforward to predict next input
        self.predictor = nn.Sequential(
            nn.Linear(input_size, 128),
            nn.ReLU(),
            nn.Linear(128, input_size)
        ).to(self.device)
        
        # History for uncertainty estimation (Monte Carlo dropout)
        self.prediction_history: deque = deque(maxlen=100)
    
    def calculate_significance(
        self,
        x_t: torch.Tensor,
        h_prev: torch.Tensor,
        use_uncertainty: bool = True
    ) -> float:
        """
        Calculate the significance score for an event.
        
        Args:
            x_t: Current input event vector
            h_prev: Previous hidden state from DMM
            use_uncertainty: Whether to include uncertainty in the score
        
        Returns:
            Significance score (float)
        """
        x_t = x_t.to(self.device)
        h_prev = h_prev.to(self.device)
        
        # Prediction error: ||x_t - Predict(x_{t-1})||_2
        with torch.no_grad():
            x_pred = self.predictor(x_t)
            prediction_error = torch.norm(x_t - x_pred).item()
        
        # Uncertainty measure: variance of hidden state
        uncertainty = 0.0
        if use_uncertainty:
            uncertainty = h_prev.var().item()
        
        # Combined significance score
        significance = prediction_error + self.config.uncertainty_lambda * uncertainty
        
        # Store for history
        self.prediction_history.append({
            'error': prediction_error,
            'uncertainty': uncertainty,
            'significance': significance
        })
        
        return significance
    
    def get_event_statistics(self) -> Dict:
        """Get statistics about recent events."""
        if not self.prediction_history:
            return {}
        
        errors = [h['error'] for h in self.prediction_history]
        uncertainties = [h['uncertainty'] for h in self.prediction_history]
        significances = [h['significance'] for h in self.prediction_history]
        
        return {
            'mean_error': np.mean(errors),
            'std_error': np.std(errors),
            'mean_uncertainty': np.mean(uncertainties),
            'std_uncertainty': np.std(uncertainties),
            'mean_significance': np.mean(significances),
            'std_significance': np.std(significances),
            'num_events': len(self.prediction_history)
        }


class AdaptiveThreshold:
    """
    Adaptive significance threshold using exponential moving average.
    
    The threshold is updated based on recent event significances:
    τ_{t+1} = (1 - α) * τ_t + α * S_t
    
    Where α is the smoothing factor (threshold_alpha).
    """
    
    def __init__(self, initial_threshold: float, alpha: float = 0.1):
        self.threshold = initial_threshold
        self.alpha = alpha
        self.history: List[float] = [initial_threshold]
    
    def update(self, significance: float) -> None:
        """Update threshold based on new significance score."""
        self.threshold = (1 - self.alpha) * self.threshold + self.alpha * significance
        self.history.append(self.threshold)
    
    def get_threshold(self) -> float:
        """Get current threshold."""
        return self.threshold
    
    def should_trigger(self, significance: float) -> bool:
        """Determine if an event should trigger a memory update."""
        return significance > self.threshold
    
    def get_history(self) -> List[float]:
        """Get threshold history."""
        return self.history.copy()


class EDCLEngine:
    """
    Event-Driven Continuous Learning Engine.
    
    Orchestrates event detection, threshold adaptation, and model learning.
    Updates the DMM only when significant events are detected.
    """
    
    def __init__(self, dmm_model: nn.Module, config: EDCLConfig, input_size: int):
        self.dmm = dmm_model
        self.config = config
        self.device = torch.device(config.device)
        
        # Event detection
        self.event_detector = EventDetector(config, input_size)
        
        # Adaptive threshold
        self.threshold = AdaptiveThreshold(
            config.initial_threshold,
            config.threshold_alpha
        )
        
        # Optimizer
        self.optimizer = optim.AdamW(
            list(self.dmm.parameters()) + list(self.event_detector.predictor.parameters()),
            lr=config.learning_rate,
            weight_decay=config.weight_decay
        )
        
        # Learning metrics
        self.learning_metrics: Dict = {
            'total_events': 0,
            'triggered_updates': 0,
            'total_loss': 0.0,
            'update_history': []
        }
    
    def process_event(
        self,
        x_t: torch.Tensor,
        target: Optional[torch.Tensor] = None,
        force_update: bool = False
    ) -> Dict:
        """
        Process an input event and potentially trigger a memory update.
        
        Args:
            x_t: Input event vector
            target: Target output for supervised learning (optional)
            force_update: Force an update regardless of significance threshold
        
        Returns:
            Dictionary with event processing results
        """
        x_t = x_t.to(self.device)
        self.learning_metrics['total_events'] += 1
        
        # Get current memory state
        h_prev, c_prev = self.dmm.get_state()
        
        # Forward pass through DMM
        output, h_t, c_t = self.dmm(x_t, h_prev, c_prev)
        
        # Calculate event significance
        significance = self.event_detector.calculate_significance(x_t, h_prev)
        
        # Check if update should be triggered
        should_update = force_update or self.threshold.should_trigger(significance)
        
        result = {
            'significance': significance,
            'threshold': self.threshold.get_threshold(),
            'triggered': should_update,
            'loss': None,
            'output': output.detach().cpu()
        }
        
        if should_update:
            # Perform learning update
            loss = self._perform_update(x_t, target, output, h_t, c_t)
            result['loss'] = loss.item()
            self.learning_metrics['triggered_updates'] += 1
            self.learning_metrics['total_loss'] += loss.item()
            self.learning_metrics['update_history'].append({
                'event': self.learning_metrics['total_events'],
                'significance': significance,
                'loss': loss.item()
            })
        else:
            # No update: apply time decay to memory
            self.dmm.apply_time_decay()
        
        # Update adaptive threshold
        self.threshold.update(significance)
        
        return result
    
    def _perform_update(
        self,
        x_t: torch.Tensor,
        target: Optional[torch.Tensor],
        output: torch.Tensor,
        h_t: torch.Tensor,
        c_t: torch.Tensor
    ) -> torch.Tensor:
        """
        Perform a learning update using AdamW with gradient clipping.
        
        Args:
            x_t: Input event vector
            target: Target output (if None, use reconstruction loss)
            output: DMM output
            h_t: New hidden state
            c_t: New cell state
        
        Returns:
            Loss tensor
        """
        self.optimizer.zero_grad()
        
        # Compute loss
        if target is not None:
            # Supervised loss
            loss = nn.MSELoss()(output, target.to(self.device))
        else:
            # Reconstruction loss (unsupervised)
            x_pred = self.event_detector.predictor(output)
            loss = nn.MSELoss()(x_pred, x_t)
        
        # Backward pass
        loss.backward()
        
        # Gradient clipping
        torch.nn.utils.clip_grad_norm_(
            list(self.dmm.parameters()) + list(self.event_detector.predictor.parameters()),
            self.config.max_gradient_norm
        )
        
        # Optimizer step
        self.optimizer.step()
        
        # Update memory state
        self.dmm.set_state(h_t, c_t)
        
        return loss
    
    def get_learning_metrics(self) -> Dict:
        """Get current learning metrics."""
        metrics = self.learning_metrics.copy()
        metrics['event_statistics'] = self.event_detector.get_event_statistics()
        metrics['threshold_history'] = self.threshold.get_history()
        
        if metrics['triggered_updates'] > 0:
            metrics['average_loss'] = metrics['total_loss'] / metrics['triggered_updates']
            metrics['update_rate'] = metrics['triggered_updates'] / metrics['total_events']
        else:
            metrics['average_loss'] = 0.0
            metrics['update_rate'] = 0.0
        
        return metrics
    
    def reset_metrics(self) -> None:
        """Reset learning metrics."""
        self.learning_metrics = {
            'total_events': 0,
            'triggered_updates': 0,
            'total_loss': 0.0,
            'update_history': []
        }

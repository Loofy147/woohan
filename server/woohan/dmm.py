"""
Dynamic Memory Model (DMM) - LSTM-based memory engine for WOOHAN.

This module implements the core memory state evolution using Long Short-Term Memory (LSTM)
with time-decay mechanisms and support for event-driven updates.

Mathematical Foundation:
- Input Gate: i_t = σ(W_i x_t + U_i h_{t-1} + b_i)
- Forget Gate: f_t = σ(W_f x_t + U_f h_{t-1} + b_f)
- Output Gate: o_t = σ(W_o x_t + U_o h_{t-1} + b_o)
- Candidate State: c̃_t = tanh(W_c x_t + U_c h_{t-1} + b_c)
- Cell State: c_t = f_t ⊙ c_{t-1} + i_t ⊙ c̃_t
- Hidden State: h_t = o_t ⊙ tanh(c_t)

References:
- Hochreiter & Schmidhuber (1997): LSTM
- Pham et al. (2016): DeepCare - A Deep Dynamic Memory Model for Predictive Medicine
"""

import torch
import torch.nn as nn
import numpy as np
from typing import Tuple, Optional
from dataclasses import dataclass


@dataclass
class DMMConfig:
    """Configuration for the Dynamic Memory Model."""
    input_size: int = 128  # Size of input event vectors
    hidden_size: int = 256  # Size of hidden state (memory cell)
    num_layers: int = 1  # Number of stacked LSTM layers
    dropout: float = 0.1  # Dropout rate for regularization
    time_decay_factor: float = 0.99  # Exponential decay for memory over time
    device: str = "cpu"  # Device for computation (cpu or cuda)


class DynamicMemoryModel(nn.Module):
    """
    LSTM-based Dynamic Memory Model with time-decay and event-driven capabilities.
    
    This model maintains a continuous memory state that evolves based on input events.
    The memory is updated only when significant events are detected (event-driven learning).
    
    Attributes:
        config: DMMConfig object with model hyperparameters
        lstm: PyTorch LSTM layer(s)
        time_decay_factor: Exponential decay applied to memory over time
    """
    
    def __init__(self, config: DMMConfig):
        super().__init__()
        self.config = config
        self.device = torch.device(config.device)
        
        # LSTM layers
        self.lstm = nn.LSTM(
            input_size=config.input_size,
            hidden_size=config.hidden_size,
            num_layers=config.num_layers,
            dropout=config.dropout if config.num_layers > 1 else 0.0,
            batch_first=True
        ).to(self.device)
        
        # Time-decay factor for memory consolidation
        self.time_decay_factor = config.time_decay_factor
        
        # Initialize hidden and cell states
        self.register_buffer(
            'h_t',
            torch.zeros(config.num_layers, 1, config.hidden_size, device=self.device)
        )
        self.register_buffer(
            'c_t',
            torch.zeros(config.num_layers, 1, config.hidden_size, device=self.device)
        )
    
    def forward(
        self,
        x_t: torch.Tensor,
        h_prev: Optional[torch.Tensor] = None,
        c_prev: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Forward pass through the LSTM memory model.
        
        Args:
            x_t: Input event vector of shape (batch_size, input_size) or (1, input_size)
            h_prev: Previous hidden state (batch_size, hidden_size) or None
            c_prev: Previous cell state (batch_size, hidden_size) or None
        
        Returns:
            h_t: New hidden state (batch_size, hidden_size)
            c_t: New cell state (batch_size, hidden_size)
            output: LSTM output (batch_size, hidden_size)
        """
        # Ensure input is on the correct device
        x_t = x_t.to(self.device)
        
        # Use provided states or initialize
        if h_prev is None:
            h_prev = self.h_t
        else:
            h_prev = h_prev.to(self.device)
        
        if c_prev is None:
            c_prev = self.c_t
        else:
            c_prev = c_prev.to(self.device)
        
        # Reshape input if necessary
        if x_t.dim() == 1:
            x_t = x_t.unsqueeze(0).unsqueeze(0)  # (1, 1, input_size)
        elif x_t.dim() == 2:
            x_t = x_t.unsqueeze(1)  # (batch_size, 1, input_size)
        
        # LSTM forward pass
        output, (h_t, c_t) = self.lstm(x_t, (h_prev, c_prev))
        
        # Apply time-decay to cell state (memory consolidation)
        c_t_decayed = c_t * self.time_decay_factor
        
        return output.squeeze(1), h_t, c_t_decayed
    
    def apply_time_decay(self) -> None:
        """
        Apply exponential time-decay to the current memory state.
        This simulates natural forgetting over time when no events occur.
        """
        self.c_t.data = self.c_t.data * self.time_decay_factor
    
    def reset_state(self) -> None:
        """Reset the memory state to zero (amnesia)."""
        self.h_t.zero_()
        self.c_t.zero_()
    
    def get_state(self) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Get the current memory state.
        
        Returns:
            Tuple of (hidden_state, cell_state)
        """
        return self.h_t.clone(), self.c_t.clone()
    
    def set_state(self, h_t: torch.Tensor, c_t: torch.Tensor) -> None:
        """
        Set the memory state explicitly.
        
        Args:
            h_t: Hidden state tensor
            c_t: Cell state tensor
        """
        self.h_t = h_t.to(self.device)
        self.c_t = c_t.to(self.device)
    
    def get_memory_summary(self) -> dict:
        """
        Get a summary of the current memory state.
        
        Returns:
            Dictionary with memory statistics
        """
        h_norm = torch.norm(self.h_t).item()
        c_norm = torch.norm(self.c_t).item()
        h_mean = self.h_t.mean().item()
        c_mean = self.c_t.mean().item()
        
        return {
            "hidden_norm": h_norm,
            "cell_norm": c_norm,
            "hidden_mean": h_mean,
            "cell_mean": c_mean,
            "hidden_size": self.config.hidden_size,
            "num_layers": self.config.num_layers
        }


class MemoryBank:
    """
    Persistent memory storage for multiple WOOHAN instances.
    Stores and retrieves memory states indexed by user/session ID.
    """
    
    def __init__(self, device: str = "cpu"):
        self.device = device
        self.memories: dict = {}  # {user_id: (h_t, c_t)}
    
    def store(self, user_id: str, h_t: torch.Tensor, c_t: torch.Tensor) -> None:
        """Store memory state for a user."""
        self.memories[user_id] = (
            h_t.clone().detach().cpu(),
            c_t.clone().detach().cpu()
        )
    
    def retrieve(self, user_id: str) -> Optional[Tuple[torch.Tensor, torch.Tensor]]:
        """Retrieve memory state for a user, or None if not found."""
        if user_id in self.memories:
            h_t, c_t = self.memories[user_id]
            return h_t.to(self.device), c_t.to(self.device)
        return None
    
    def delete(self, user_id: str) -> bool:
        """Delete memory state for a user. Returns True if deleted, False if not found."""
        if user_id in self.memories:
            del self.memories[user_id]
            return True
        return False
    
    def list_users(self) -> list:
        """List all user IDs with stored memories."""
        return list(self.memories.keys())
    
    def clear(self) -> None:
        """Clear all stored memories."""
        self.memories.clear()

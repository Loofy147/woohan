"""
WOOHAN: Workflow-Optimized Heuristic Adaptive Network

A foundational AI framework for dynamic memory, event-driven continuous learning,
and secure identity encoding with Hugging Face semantic understanding.

Main Components:
- Dynamic Memory Model (DMM): LSTM-based memory with time-decay
- Event-Driven Continuous Learning (EDCL): Adaptive learning on significant events
- Secure Identity Encoding (SIE): Privacy-preserving identity embeddings
- Hugging Face Integration: Semantic understanding and advanced NLP

Usage:
    from woohan import WOOHANSystem
    
    system = WOOHANSystem()
    result = system.process_event(event_data)
"""

from .dmm import DynamicMemoryModel, DMMConfig, MemoryBank
from .edcl import EDCLEngine, EDCLConfig, EventDetector, AdaptiveThreshold
from .sie import IdentityEmbedding, SIEConfig, IdentityEncoder, PIIHasher
from .hf_integration import (
    SemanticEventAnalyzer,
    TransformerFeatureExtractor,
    HFEnhancedIdentityEncoder,
    HFConfig
)

__version__ = "0.1.0"
__author__ = "Manus AI"

__all__ = [
    "DynamicMemoryModel",
    "DMMConfig",
    "MemoryBank",
    "EDCLEngine",
    "EDCLConfig",
    "EventDetector",
    "AdaptiveThreshold",
    "IdentityEmbedding",
    "SIEConfig",
    "IdentityEncoder",
    "PIIHasher",
    "SemanticEventAnalyzer",
    "TransformerFeatureExtractor",
    "HFEnhancedIdentityEncoder",
    "HFConfig",
]

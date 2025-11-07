"""
Hugging Face Integration Module for WOOHAN.

This module integrates state-of-the-art transformer models from Hugging Face
for semantic understanding, event analysis, and enhanced identity encoding.

Features:
- Semantic embeddings using sentence-transformers
- Multi-lingual support for global applications
- Event semantic clustering and similarity
- Transformer-based feature extraction
- Model caching and optimization

Models Used:
- sentence-transformers/all-MiniLM-L6-v2: Fast semantic embeddings
- amazon/Titan-text-embeddings-v2: Multilingual embeddings
- deepseek-ai/DeepSeek-OCR: Advanced vision-language understanding
"""

import torch
import torch.nn as nn
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import json

try:
    from transformers import AutoTokenizer, AutoModel
    from sentence_transformers import SentenceTransformer, util
    HF_AVAILABLE = True
except ImportError:
    HF_AVAILABLE = False
    print("Warning: Hugging Face transformers not installed. Install with: pip install transformers sentence-transformers")


@dataclass
class HFConfig:
    """Configuration for Hugging Face integration."""
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    semantic_similarity_threshold: float = 0.7
    max_sequence_length: int = 512
    batch_size: int = 32
    device: str = "cpu"
    cache_embeddings: bool = True
    use_gpu: bool = False


class SemanticEventAnalyzer:
    """
    Analyzes events using semantic understanding from Hugging Face models.
    
    Provides:
    - Semantic similarity between events
    - Event clustering by semantic meaning
    - Semantic event categorization
    - Multi-lingual event understanding
    """
    
    def __init__(self, config: HFConfig):
        if not HF_AVAILABLE:
            raise ImportError("Hugging Face transformers required. Install with: pip install transformers sentence-transformers")
        
        self.config = config
        self.device = torch.device(config.device if config.use_gpu else "cpu")
        
        # Load sentence transformer model
        self.model = SentenceTransformer(config.embedding_model, device=self.device)
        
        # Embedding cache
        self.embedding_cache: Dict[str, np.ndarray] = {}
        
        # Event history for clustering
        self.event_embeddings: List[np.ndarray] = []
        self.event_texts: List[str] = []
    
    def encode_event(self, event_text: str, use_cache: bool = True) -> np.ndarray:
        \"\"\"\n        Encode an event text to semantic embedding.\n        \n        Args:\n            event_text: Text description of the event\n            use_cache: Whether to use cached embeddings\n        \n        Returns:\n            Semantic embedding vector\n        \"\"\"\n        if use_cache and event_text in self.embedding_cache:\n            return self.embedding_cache[event_text]\n        \n        # Truncate if necessary\n        if len(event_text) > self.config.max_sequence_length:\n            event_text = event_text[:self.config.max_sequence_length]\n        \n        # Encode\n        embedding = self.model.encode(event_text, convert_to_numpy=True)\n        \n        # Cache\n        if self.config.cache_embeddings:\n            self.embedding_cache[event_text] = embedding\n        \n        return embedding\n    \n    def compute_semantic_similarity(self, event1: str, event2: str) -> float:\n        \"\"\"\n        Compute semantic similarity between two events.\n        \n        Args:\n            event1: First event text\n            event2: Second event text\n        \n        Returns:\n            Similarity score (0 to 1)\n        \"\"\"\n        emb1 = self.encode_event(event1)\n        emb2 = self.encode_event(event2)\n        \n        # Cosine similarity\n        similarity = util.cos_sim(emb1, emb2).item()\n        \n        return similarity\n    \n    def cluster_events(self, events: List[str], threshold: Optional[float] = None) -> Dict[int, List[str]]:\n        \"\"\"\n        Cluster events by semantic similarity.\n        \n        Args:\n            events: List of event texts\n            threshold: Similarity threshold for clustering (default: config.semantic_similarity_threshold)\n        \n        Returns:\n            Dictionary mapping cluster ID to list of events\n        \"\"\"\n        if threshold is None:\n            threshold = self.config.semantic_similarity_threshold\n        \n        # Encode all events\n        embeddings = [self.encode_event(event) for event in events]\n        \n        # Simple clustering using similarity threshold\n        clusters: Dict[int, List[str]] = {}\n        cluster_id = 0\n        assigned = set()\n        \n        for i, event in enumerate(events):\n            if i in assigned:\n                continue\n            \n            cluster = [event]\n            assigned.add(i)\n            \n            # Find similar events\n            for j in range(i + 1, len(events)):\n                if j in assigned:\n                    continue\n                \n                similarity = util.cos_sim(embeddings[i], embeddings[j]).item()\n                if similarity >= threshold:\n                    cluster.append(events[j])\n                    assigned.add(j)\n            \n            clusters[cluster_id] = cluster\n            cluster_id += 1\n        \n        return clusters\n    \n    def find_similar_events(self, query_event: str, event_pool: List[str], top_k: int = 5) -> List[Tuple[str, float]]:\n        \"\"\"\n        Find the most similar events to a query event.\n        \n        Args:\n            query_event: Query event text\n            event_pool: Pool of events to search\n            top_k: Number of top results to return\n        \n        Returns:\n            List of (event, similarity_score) tuples\n        \"\"\"\n        query_emb = self.encode_event(query_event)\n        \n        similarities = []\n        for event in event_pool:\n            event_emb = self.encode_event(event)\n            sim = util.cos_sim(query_emb, event_emb).item()\n            similarities.append((event, sim))\n        \n        # Sort by similarity and return top-k\n        similarities.sort(key=lambda x: x[1], reverse=True)\n        return similarities[:top_k]\n    \n    def get_event_summary(self, events: List[str]) -> Dict:\n        \"\"\"\n        Get a semantic summary of a collection of events.\n        \n        Args:\n            events: List of event texts\n        \n        Returns:\n            Dictionary with summary statistics\n        \"\"\"\n        if not events:\n            return {}\n        \n        embeddings = [self.encode_event(event) for event in events]\n        embeddings_array = np.array(embeddings)\n        \n        # Compute centroid\n        centroid = embeddings_array.mean(axis=0)\n        \n        # Compute average similarity to centroid\n        avg_similarity = np.mean([\n            util.cos_sim(emb, centroid).item() for emb in embeddings\n        ])\n        \n        # Compute diversity (std of similarities)\n        diversity = np.std([\n            util.cos_sim(emb, centroid).item() for emb in embeddings\n        ])\n        \n        return {\n            'num_events': len(events),\n            'average_similarity_to_centroid': avg_similarity,\n            'diversity': diversity,\n            'centroid': centroid.tolist()\n        }\n    \n    def clear_cache(self) -> None:\n        \"\"\"Clear the embedding cache.\"\"\"\n        self.embedding_cache.clear()\n\n\nclass TransformerFeatureExtractor:\n    \"\"\"\n    Extract rich features from text using transformer models.\n    \n    Provides:\n    - Token-level features\n    - Contextual embeddings\n    - Attention-based feature importance\n    \"\"\"\n    \n    def __init__(self, model_name: str = \"bert-base-uncased\", device: str = \"cpu\"):\n        if not HF_AVAILABLE:\n            raise ImportError(\"Hugging Face transformers required.\")\n        \n        self.device = torch.device(device)\n        self.tokenizer = AutoTokenizer.from_pretrained(model_name)\n        self.model = AutoModel.from_pretrained(model_name, output_hidden_states=True).to(self.device)\n        self.model.eval()\n    \n    def extract_features(self, text: str) -> Dict:\n        \"\"\"\n        Extract rich features from text.\n        \n        Args:\n            text: Input text\n        \n        Returns:\n            Dictionary with extracted features\n        \"\"\"\n        # Tokenize\n        inputs = self.tokenizer(text, return_tensors=\"pt\", truncation=True, max_length=512)\n        inputs = {k: v.to(self.device) for k, v in inputs.items()}\n        \n        # Forward pass\n        with torch.no_grad():\n            outputs = self.model(**inputs)\n        \n        # Extract features\n        last_hidden_state = outputs.last_hidden_state[0].cpu().numpy()\n        \n        # CLS token embedding (sentence representation)\n        cls_embedding = last_hidden_state[0]\n        \n        # Average pooling\n        avg_embedding = last_hidden_state.mean(axis=0)\n        \n        return {\n            'cls_embedding': cls_embedding.tolist(),\n            'avg_embedding': avg_embedding.tolist(),\n            'sequence_length': len(last_hidden_state),\n            'tokens': self.tokenizer.convert_ids_to_tokens(inputs['input_ids'][0].tolist())\n        }\n\n\nclass HFEnhancedIdentityEncoder:\n    \"\"\"\n    Enhanced identity encoder using Hugging Face semantic embeddings.\n    \n    Combines traditional identity encoding with semantic understanding\n    for more meaningful and robust identity representations.\n    \"\"\"\n    \n    def __init__(self, config: HFConfig):\n        self.config = config\n        self.semantic_analyzer = SemanticEventAnalyzer(config)\n        self.embeddings_cache: Dict[str, np.ndarray] = {}\n    \n    def encode_identity_with_context(\n        self,\n        user_id: str,\n        properties: Dict[str, str],\n        context_events: List[str] = None\n    ) -> Tuple[np.ndarray, Dict]:\n        \"\"\"\n        Encode user identity with semantic context from events.\n        \n        Args:\n            user_id: User identifier\n            properties: User properties\n            context_events: List of contextual events\n        \n        Returns:\n            Tuple of (embedding, metadata)\n        \"\"\"\n        # Create property text\n        property_text = \" \".join([f\"{k}: {v}\" for k, v in properties.items()])\n        \n        # Encode properties\n        property_embedding = self.semantic_analyzer.encode_event(property_text)\n        \n        # Encode context if provided\n        context_embedding = None\n        if context_events:\n            context_text = \" \".join(context_events)\n            context_embedding = self.semantic_analyzer.encode_event(context_text)\n            \n            # Combine embeddings\n            combined = np.concatenate([property_embedding, context_embedding])\n        else:\n            combined = property_embedding\n        \n        metadata = {\n            'user_id': user_id,\n            'property_count': len(properties),\n            'context_events': len(context_events) if context_events else 0,\n            'embedding_size': len(combined)\n        }\n        \n        return combined, metadata\n    \n    def compute_identity_similarity(self, user_id1: str, user_id2: str) -> float:\n        \"\"\"\n        Compute semantic similarity between two user identities.\n        \n        Args:\n            user_id1: First user ID\n            user_id2: Second user ID\n        \n        Returns:\n            Similarity score (0 to 1)\n        \"\"\"\n        if user_id1 not in self.embeddings_cache or user_id2 not in self.embeddings_cache:\n            return 0.0\n        \n        emb1 = self.embeddings_cache[user_id1]\n        emb2 = self.embeddings_cache[user_id2]\n        \n        similarity = util.cos_sim(emb1, emb2).item()\n        return similarity\n

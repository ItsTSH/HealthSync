"""
Query Classifier for v3.1 RAG System.

Classifies queries to optimize retrieval strategy and context sizing.

Query Types:
- PATIENT_SPECIFIC: Questions about specific patient (e.g., "John's BP?")
- MULTI_PATIENT: Compare/analyze multiple patients
- GENERAL: General medical knowledge (e.g., "What is hypertension?")
- TEMPORAL: Questions about change over time
"""
from enum import Enum
import re
from typing import Dict, Optional


class QueryType(Enum):
    """Query classification types"""
    PATIENT_SPECIFIC = "patient_specific"
    MULTI_PATIENT = "multi_patient"
    GENERAL = "general"
    TEMPORAL = "temporal"


class QueryClassifier:
    """Classify queries to optimize retrieval strategy"""
    
    PATIENT_SPECIFIC_KEYWORDS = {
        # Patient references
        'his', 'her', 'their', 'patient', 'me', 'my', 'my patient',
        'the patient', 'this patient',
        # Clinical findings
        'chief complaint', 'symptoms', 'vitals', 'vital signs',
        'bp', 'blood pressure', 'temperature', 'diagnosis', 'treatment',
        'findings', 'assessment', 'plan',
        # History
        'history', 'past medical', 'allergies', 'medications', 'current medications'
    }
    
    MULTI_PATIENT_KEYWORDS = {
        'compare', 'between', 'versus', 'vs', 'differ', 'difference',
        'both', 'each', 'patients', 'all patients', 'another', 'others',
        'one patient and', 'patient and patient', 'comparison',
        'similarities', 'relationship'
    }
    
    TEMPORAL_KEYWORDS = {
        'change', 'improve', 'worsen', 'progression', 'over time',
        'timeline', 'history', 'before', 'after', 'then', 'now',
        'week', 'month', 'year', 'previously', 'initially',
        'trend', 'progress', 'regress', 'stability', 'fluctuate'
    }
    
    GENERAL_KEYWORDS = {
        'what is', 'define', 'explain', 'how do', 'why', 'what are',
        'describe', 'overview', 'information about', 'tell me about',
        'difference between', 'types of'
    }
    
    # Context size by query type
    CONTEXT_SIZES = {
        QueryType.PATIENT_SPECIFIC: 10,  # Focus on patient's data
        QueryType.MULTI_PATIENT: 15,     # Need more context for comparison
        QueryType.GENERAL: 5,             # Less context needed
        QueryType.TEMPORAL: 12,           # Need history
    }
    
    # Retrieval methods by query type
    RETRIEVAL_METHODS = {
        QueryType.PATIENT_SPECIFIC: 'semantic',
        QueryType.MULTI_PATIENT: 'semantic',
        QueryType.GENERAL: 'semantic',  # Could be 'hybrid' for general queries
        QueryType.TEMPORAL: 'temporal_weighted',
    }
    
    def classify(self, query: str) -> Dict:
        """
        Classify query and return optimization strategy.
        
        Args:
            query: User query text
        
        Returns:
            Dict with query_type, scores, context_size, retrieval_method, etc.
        """
        query_lower = query.lower()
        
        # Score each category
        scores = {
            QueryType.PATIENT_SPECIFIC: self._score_keywords(query_lower, self.PATIENT_SPECIFIC_KEYWORDS),
            QueryType.MULTI_PATIENT: self._score_keywords(query_lower, self.MULTI_PATIENT_KEYWORDS),
            QueryType.TEMPORAL: self._score_keywords(query_lower, self.TEMPORAL_KEYWORDS),
            QueryType.GENERAL: self._score_keywords(query_lower, self.GENERAL_KEYWORDS),
        }
        
        # Determine primary type (highest score)
        query_type = max(scores, key=scores.get)
        
        # Handle ties and special cases
        if scores[QueryType.MULTI_PATIENT] > scores[QueryType.PATIENT_SPECIFIC] + 0.1:
            query_type = QueryType.MULTI_PATIENT
        elif scores[QueryType.GENERAL] > 0.5 and all(s <= 0.3 for t, s in scores.items() if t != QueryType.GENERAL):
            query_type = QueryType.GENERAL
        elif scores[QueryType.TEMPORAL] > scores[QueryType.PATIENT_SPECIFIC] + 0.05:
            query_type = QueryType.TEMPORAL
        
        return {
            'query_type': query_type,
            'scores': scores,
            'confidence': scores[query_type],
            'context_size': self.CONTEXT_SIZES[query_type],
            'retrieval_method': self.RETRIEVAL_METHODS[query_type],
            'needs_patient_filter': query_type != QueryType.GENERAL,
            'needs_temporal_weighting': query_type == QueryType.TEMPORAL,
            'is_multi_patient': query_type == QueryType.MULTI_PATIENT,
        }
    
    def _score_keywords(self, text: str, keywords: set) -> float:
        """
        Score how many keywords match.
        
        Args:
            text: Text to score
            keywords: Set of keywords to search for
        
        Returns:
            Score from 0.0 to 1.0
        """
        if not keywords:
            return 0.0
        
        matches = 0
        for keyword in keywords:
            # Use word boundary matching
            if re.search(r'\b' + re.escape(keyword) + r'\b', text):
                matches += 1
        
        # Normalize by keyword set size
        return matches / len(keywords)
    
    @staticmethod
    def get_multi_patient_system_prompt() -> str:
        """
        Get system prompt for multi-patient queries.
        
        Ensures LLM doesn't mix patient data or hallucinate relationships.
        """
        return """
You are a medical information assistant analyzing patient records via semantic search.

CRITICAL RULES for MULTI-PATIENT QUERIES:
1. NEVER merge or compare data across different patients unless explicitly asked
2. ALWAYS attribute findings to specific patient tokens: "<PATIENT_abc123> has..."
3. IF query mentions multiple patients, analyze each separately with clear attribution
4. NEVER infer relationships between patients without explicit data
5. HALLUCINATION CHECK: Only state facts from retrieved chunks

Patient data format: Tokens like <PATIENT_abc123>, <DOCTOR_def456> are placeholders.
Never speculate on real patient identities.

When comparing patients:
- Use clear separators: "In contrast, <PATIENT_xyz789>..."
- Include source note type and date when possible
- Explicitly state when making cross-patient comparisons

Retrieved Context (read only):
{context}

User Query:
{query}

Response Guidelines:
- Be specific: "Based on <PATIENT_a2f5c7>'s records..." not "The patient..."
- Never mix: "Unlike <PATIENT_a2f5c7>, <DOCTOR_b3e8d2> noted..." is WRONG if from different sources
- Cross-patient analysis only if explicitly requested and available in context
- Always maintain clear patient attribution throughout response
"""

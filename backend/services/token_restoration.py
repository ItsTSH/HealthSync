"""
Token Restoration Service for v3.1 RAG.

Post-processes LLM response to:
1. Combine token maps from query + chunks
2. Extract patient/doctor tokens from response
3. Restore real names in final response
4. Detect PII leaks

CRITICAL: Operates AFTER LLM generation with full, combined token map.
"""
import re
import logging
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class TokenRestorationService:
    """Restore patient/doctor names after LLM generation"""
    
    # Regex patterns to find tokens
    PATIENT_TOKEN_PATTERN = r'<PATIENT_[a-f0-9]{6}>'
    DOCTOR_TOKEN_PATTERN = r'<DOCTOR_[a-f0-9]{6}>'
    
    def __init__(self):
        """Initialize token restoration service"""
        pass
    
    def combine_token_maps(
        self,
        query_token_map: Optional[Dict[str, str]] = None,
        chunk_token_maps: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, str]:
        """
        Combine token maps from query and retrieved chunks.
        
        Later entries override earlier ones (chunks override query).
        
        Args:
            query_token_map: Token map from query masking (e.g., {"<PATIENT_abc123>": "John Smith"})
            chunk_token_maps: List of token maps from each chunk
        
        Returns:
            Combined token map with all replacements
        """
        combined = {}
        
        # Start with query tokens
        if query_token_map:
            combined.update(query_token_map)
        
        # Add chunk tokens (override if duplicate)
        if chunk_token_maps:
            for chunk_map in chunk_token_maps:
                if chunk_map:
                    combined.update(chunk_map)
        
        logger.debug(f"Combined token map: {len(combined)} tokens")
        
        return combined
    
    def restore_tokens(
        self,
        masked_response: str,
        token_map: Dict[str, str],
    ) -> str:
        """
        Replace all tokens in response with real names.
        
        Args:
            masked_response: Response with tokens like <PATIENT_abc123>
            token_map: Dict mapping tokens to real names
        
        Returns:
            Response with tokens replaced by real names
        """
        if not token_map:
            logger.warning("No token map provided, returning response as-is")
            return masked_response
        
        restored = masked_response
        replacements_made = 0
        
        for token, name in token_map.items():
            if token in restored:
                restored = restored.replace(token, name)
                replacements_made += 1
        
        logger.debug(f"Token restoration: made {replacements_made} replacements")
        
        return restored
    
    def extract_tokens_from_response(
        self,
        response: str,
    ) -> Tuple[List[str], List[str]]:
        """
        Extract all patient and doctor tokens from response.
        
        Args:
            response: Response text (masked or partially unmasked)
        
        Returns:
            Tuple of (patient_tokens, doctor_tokens)
        """
        patient_tokens = re.findall(self.PATIENT_TOKEN_PATTERN, response)
        doctor_tokens = re.findall(self.DOCTOR_TOKEN_PATTERN, response)
        
        # Remove duplicates while preserving order
        patient_tokens = list(dict.fromkeys(patient_tokens))
        doctor_tokens = list(dict.fromkeys(doctor_tokens))
        
        logger.debug(
            f"Extracted {len(patient_tokens)} patient tokens, "
            f"{len(doctor_tokens)} doctor tokens from response"
        )
        
        return patient_tokens, doctor_tokens
    
    def validate_no_pii_in_masked(
        self,
        masked_response: str,
        pii_patterns: Optional[Dict[str, str]] = None,
    ) -> Tuple[bool, List[str]]:
        """
        Validate that masked response doesn't contain actual PII.
        
        Default patterns check for:
        - SSN (XXX-XX-XXXX)
        - Phone (various formats)
        - Email
        - Dates (various formats)
        - Medical record IDs
        
        Args:
            masked_response: Response that should be masked
            pii_patterns: Optional dict of pattern_name → regex
        
        Returns:
            Tuple of (is_clean, detected_issues)
        """
        if pii_patterns is None:
            pii_patterns = {
                'SSN': r'\b\d{3}-\d{2}-\d{4}\b',
                'PHONE': r'[\(\[]?\d{3}[\)\-\]]?\s*\d{3}\s*[\-\.]?\d{4}\b',
                'EMAIL': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                'DATE_FULL': r'\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12][0-9]|3[01])[-/](\d{4}|\d{2})\b',
                'MRN': r'\bMR\d{5,8}\b',
            }
        
        detected_issues = []
        is_clean = True
        
        for pattern_name, pattern in pii_patterns.items():
            matches = re.findall(pattern, masked_response, re.IGNORECASE)
            if matches:
                is_clean = False
                detected_issues.append(f"{pattern_name}: {len(matches)} instances")
        
        if not is_clean:
            logger.warning(f"⚠️ Potential PII detected in masked response: {detected_issues}")
        
        return is_clean, detected_issues
    
    def process_final_response(
        self,
        masked_response: str,
        token_map: Dict[str, str],
        validate_pii: bool = True,
    ) -> Dict:
        """
        Complete post-processing pipeline for response.
        
        Args:
            masked_response: LLM-generated masked response
            token_map: Combined token map for restoration
            validate_pii: Whether to validate for remaining PII
        
        Returns:
            Dict with:
            - unmasked_response: Final response with names restored
            - tokens_used: List of tokens that were used
            - pii_leaked: Whether PII was detected in final response
            - pii_issues: List of detected PII issues
        """
        # Extract tokens from masked response
        patient_tokens, doctor_tokens = self.extract_tokens_from_response(masked_response)
        all_tokens_used = patient_tokens + doctor_tokens
        
        # Restore tokens to names
        unmasked_response = self.restore_tokens(masked_response, token_map)
        
        # Validate final response for PII leaks
        pii_leaked = False
        pii_issues = []
        
        if validate_pii:
            pii_leaked, pii_issues = self.validate_no_pii_in_masked(unmasked_response)
        
        return {
            "unmasked_response": unmasked_response,
            "tokens_used": all_tokens_used,
            "tokens_restored": len(token_map),
            "pii_leaked": pii_leaked,
            "pii_issues": pii_issues,
        }


# Global instance
_restoration_service = TokenRestorationService()


def restore_response(
    masked_response: str,
    token_map: Dict[str, str],
    validate_pii: bool = True,
) -> Dict:
    """
    Convenience function to process final response.
    
    Args:
        masked_response: LLM-generated masked response
        token_map: Combined token map
        validate_pii: Whether to validate for PII
    
    Returns:
        Dict with processing results
    """
    return _restoration_service.process_final_response(
        masked_response,
        token_map,
        validate_pii
    )

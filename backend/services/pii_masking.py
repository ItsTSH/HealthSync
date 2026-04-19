"""
PII Masking Service v3.1
Comprehensive PII detection and masking with token generation and confidence scoring.
"""

import re
import hashlib
import json
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime
import uuid


@dataclass
class MaskingResult:
    """Result of masking operation with metadata."""
    masked_text: str
    masks_applied: List[Dict[str, Any]]
    confidence_scores: Dict[str, float]
    failed_masks: List[Dict[str, str]]
    original_length: int
    masked_length: int
    timestamp: str


class PIITokenGenerator:
    """Deterministic token generation using SHA256 hashing."""
    
    def __init__(self, salt: str = "healthsync_pii"):
        """
        Initialize token generator with salt.
        
        Args:
            salt: Salt string for deterministic hashing
        """
        self.salt = salt
        self.token_cache: Dict[str, str] = {}
    
    def generate_token(self, pii_value: str, pii_type: str) -> str:
        """
        Generate deterministic token for PII value.
        
        Args:
            pii_value: The actual PII value
            pii_type: Type of PII (SSN, PHONE, EMAIL, etc.)
        
        Returns:
            Deterministic token string
        """
        cache_key = f"{pii_type}:{pii_value}"
        
        if cache_key in self.token_cache:
            return self.token_cache[cache_key]
        
        # Create deterministic hash
        hash_input = f"{self.salt}:{pii_type}:{pii_value}".encode('utf-8')
        hash_object = hashlib.sha256(hash_input)
        token = f"{pii_type.upper()[:3]}_{hash_object.hexdigest()[:16].upper()}"
        
        self.token_cache[cache_key] = token
        return token
    
    def validate_token(self, token: str, pii_value: str, pii_type: str) -> bool:
        """
        Validate if token matches the PII value.
        
        Args:
            token: The token to validate
            pii_value: The original PII value
            pii_type: Type of PII
        
        Returns:
            True if token is valid for the given PII
        """
        expected_token = self.generate_token(pii_value, pii_type)
        return token == expected_token
    
    def clear_cache(self):
        """Clear token cache."""
        self.token_cache.clear()


class PIILeakDetector:
    """Detects PII leaks using regex patterns with confidence scoring."""
    
    def __init__(self):
        """Initialize with regex patterns for different PII types."""
        self.patterns = {
            'SSN': {
                'regex': r'\b(?!000|666|9\d{2})\d{3}-\d{2}-\d{4}\b|\b\d{9}\b',
                'confidence': 0.95,
                'description': 'Social Security Number'
            },
            'PHONE': {
                'regex': r'(?:\+?1[-.\s]?)?\(?(?!0{3})\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
                'confidence': 0.85,
                'description': 'Phone Number'
            },
            'EMAIL': {
                'regex': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                'confidence': 0.90,
                'description': 'Email Address'
            },
            'DOB': {
                'regex': r'\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)?\d{2}\b',
                'confidence': 0.80,
                'description': 'Date of Birth'
            },
            'CREDIT_CARD': {
                'regex': r'\b(?:\d[ -]*?){13,19}\b',
                'confidence': 0.75,
                'description': 'Credit Card Number'
            },
            'MRN': {
                'regex': r'\b(?:MRN|Medical Record Number|patient id)[\s:]*([A-Z0-9\-]{6,20})\b',
                'confidence': 0.85,
                'description': 'Medical Record Number',
                'flags': re.IGNORECASE
            }
        }
    
    def detect_pii(self, text: str) -> List[Dict[str, Any]]:
        """
        Detect all PII in text.
        
        Args:
            text: Text to scan for PII
        
        Returns:
            List of detected PII with metadata
        """
        detections = []
        
        for pii_type, pattern_info in self.patterns.items():
            regex = pattern_info['regex']
            flags = pattern_info.get('flags', 0)
            
            matches = re.finditer(regex, text, flags)
            
            for match in matches:
                detection = {
                    'type': pii_type,
                    'value': match.group(0),
                    'start': match.start(),
                    'end': match.end(),
                    'confidence': pattern_info['confidence'],
                    'description': pattern_info['description']
                }
                detections.append(detection)
        
        # Sort by position
        detections.sort(key=lambda x: x['start'])
        return detections
    
    def get_confidence_score(self, pii_type: str) -> float:
        """Get confidence score for PII type."""
        return self.patterns.get(pii_type, {}).get('confidence', 0.0)


class PIIMaskingService:
    """Complete PII masking service with token generation and tracking."""
    
    def __init__(self, salt: str = "healthsync_pii"):
        """
        Initialize masking service.
        
        Args:
            salt: Salt for token generation
        """
        self.token_generator = PIITokenGenerator(salt)
        self.leak_detector = PIILeakDetector()
        self.unmask_map: Dict[str, str] = {}
        self.masking_history: List[Dict[str, Any]] = []
        self.failed_masks: List[Dict[str, str]] = []
    
    def mask_note(self, note: str, aggressive: bool = False) -> MaskingResult:
        """
        Mask PII in clinical note.
        
        Args:
            note: Clinical note text
            aggressive: If True, apply stricter masking
        
        Returns:
            MaskingResult with masked text and metadata
        """
        try:
            detections = self.leak_detector.detect_pii(note)
            
            masks_applied = []
            failed_masks = []
            confidence_scores = {}
            masked_text = note
            offset = 0
            
            for detection in detections:
                try:
                    pii_type = detection['type']
                    pii_value = detection['value']
                    confidence = detection['confidence']
                    
                    # Generate deterministic token
                    token = self.token_generator.generate_token(pii_value, pii_type)
                    
                    # Create mask placeholder
                    mask_placeholder = f"[{token}]"
                    
                    # Store unmask mapping
                    self.unmask_map[token] = pii_value
                    
                    # Apply mask with offset adjustment
                    start = detection['start'] + offset
                    end = detection['end'] + offset
                    masked_text = masked_text[:start] + mask_placeholder + masked_text[end:]
                    
                    # Update offset
                    offset += len(mask_placeholder) - len(pii_value)
                    
                    # Track mask
                    masks_applied.append({
                        'type': pii_type,
                        'original': pii_value,
                        'token': token,
                        'position': detection['start'],
                        'length': len(pii_value)
                    })
                    
                    # Track confidence
                    if pii_type not in confidence_scores:
                        confidence_scores[pii_type] = []
                    confidence_scores[pii_type].append(confidence)
                    
                except Exception as e:
                    failed_masks.append({
                        'pii_type': detection['type'],
                        'error': str(e),
                        'value': detection['value']
                    })
            
            # Calculate average confidence scores
            avg_confidence = {
                pii_type: sum(scores) / len(scores)
                for pii_type, scores in confidence_scores.items()
            }
            
            # Store in history
            history_entry = {
                'timestamp': datetime.utcnow().isoformat(),
                'original_length': len(note),
                'masked_length': len(masked_text),
                'masks_count': len(masks_applied),
                'failed_count': len(failed_masks)
            }
            self.masking_history.append(history_entry)
            
            return MaskingResult(
                masked_text=masked_text,
                masks_applied=masks_applied,
                confidence_scores=avg_confidence,
                failed_masks=failed_masks,
                original_length=len(note),
                masked_length=len(masked_text),
                timestamp=datetime.utcnow().isoformat()
            )
        
        except Exception as e:
            self.failed_masks.append({
                'operation': 'mask_note',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
            raise
    
    def unmask_response(self, masked_text: str, tokens: Optional[List[str]] = None) -> str:
        """
        Unmask response text back to original values.
        
        Args:
            masked_text: Masked text with tokens
            tokens: Optional list of specific tokens to unmask (if None, unmasks all)
        
        Returns:
            Unmasked text
        """
        try:
            unmasked = masked_text
            tokens_to_unmask = tokens if tokens else list(self.unmask_map.keys())
            
            for token in tokens_to_unmask:
                if token in self.unmask_map:
                    original_value = self.unmask_map[token]
                    token_placeholder = f"[{token}]"
                    unmasked = unmasked.replace(token_placeholder, original_value)
            
            return unmasked
        
        except Exception as e:
            self.failed_masks.append({
                'operation': 'unmask_response',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
            raise
    
    def get_masking_confidence(self) -> Dict[str, Any]:
        """Get overall masking confidence metrics."""
        if not self.masking_history:
            return {'average_confidence': 0.0, 'total_masks': 0}
        
        total_masks = sum(entry['masks_count'] for entry in self.masking_history)
        total_failed = sum(entry['failed_count'] for entry in self.masking_history)
        
        return {
            'total_masking_operations': len(self.masking_history),
            'total_masks_applied': total_masks,
            'total_failed_masks': total_failed,
            'success_rate': (total_masks / (total_masks + total_failed)) if (total_masks + total_failed) > 0 else 0.0
        }
    
    def get_failed_masks_report(self) -> List[Dict[str, str]]:
        """Get report of all failed masking operations."""
        return self.failed_masks.copy()
    
    def clear_unmask_map(self):
        """Clear unmask mapping (security measure)."""
        self.unmask_map.clear()
    
    def export_history(self) -> str:
        """Export masking history as JSON."""
        return json.dumps(self.masking_history, indent=2)


# Utility functions
def mask_clinical_note(note: str, salt: str = "healthsync_pii") -> MaskingResult:
    """
    Convenience function to mask a clinical note.
    
    Args:
        note: Clinical note text
        salt: Salt for token generation
    
    Returns:
        MaskingResult
    """
    service = PIIMaskingService(salt)
    return service.mask_note(note)


def unmask_text(masked_text: str, unmask_map: Dict[str, str]) -> str:
    """
    Convenience function to unmask text.
    
    Args:
        masked_text: Text with mask tokens
        unmask_map: Mapping of tokens to original values
    
    Returns:
        Unmasked text
    """
    service = PIIMaskingService()
    service.unmask_map = unmask_map
    return service.unmask_response(masked_text)

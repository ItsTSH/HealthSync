"""
Encryption service for PII protection using AES-256-GCM.

This service handles encryption/decryption of sensitive data like patient names,
doctor names, and original note text. Each data type uses a separate key for:
- Better key rotation management
- Isolation of concerns
- Compliance with data minimization principle
"""
import os
import base64
import logging
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from typing import Optional

logger = logging.getLogger(__name__)


class EncryptionKeyManager:
    """Manage encryption keys from environment or external KMS"""
    
    def __init__(self, environment: Optional[str] = None):
        """
        Initialize key manager.
        
        Args:
            environment: 'dev', 'staging', 'prod'. If None, reads from ENVIRONMENT env var.
        """
        if environment is None:
            environment = os.getenv('ENVIRONMENT', 'dev')
        self.environment = environment
        self._load_keys()
    
    def _load_keys(self):
        """Load encryption keys from environment variables"""
        # Patient name encryption key (32 bytes = 256 bits)
        patient_name_key_b64 = os.getenv('ENCRYPTION_KEY_PATIENT_NAME')
        if not patient_name_key_b64:
            if self.environment == 'prod':
                raise ValueError(
                    "ENCRYPTION_KEY_PATIENT_NAME required in production. "
                    "Generate with: python -c \"from cryptography.hazmat.primitives.ciphers.aead import AESGCM; "
                    "import base64; print(base64.b64encode(AESGCM.generate_key(bit_length=256)).decode())\""
                )
            logger.warning("ENCRYPTION_KEY_PATIENT_NAME not set, generating ephemeral key for dev")
            self.patient_name_key = AESGCM.generate_key(bit_length=256)
        else:
            try:
                self.patient_name_key = base64.b64decode(patient_name_key_b64)
                if len(self.patient_name_key) != 32:
                    raise ValueError(f"Key must be 32 bytes, got {len(self.patient_name_key)}")
            except Exception as e:
                raise ValueError(f"Failed to decode ENCRYPTION_KEY_PATIENT_NAME: {e}")
        
        # Original text encryption key (separate key for larger data)
        original_text_key_b64 = os.getenv('ENCRYPTION_KEY_ORIGINAL_TEXT')
        if not original_text_key_b64:
            if self.environment == 'prod':
                raise ValueError("ENCRYPTION_KEY_ORIGINAL_TEXT required in production")
            logger.warning("ENCRYPTION_KEY_ORIGINAL_TEXT not set, generating ephemeral key for dev")
            self.original_text_key = AESGCM.generate_key(bit_length=256)
        else:
            try:
                self.original_text_key = base64.b64decode(original_text_key_b64)
                if len(self.original_text_key) != 32:
                    raise ValueError(f"Key must be 32 bytes, got {len(self.original_text_key)}")
            except Exception as e:
                raise ValueError(f"Failed to decode ENCRYPTION_KEY_ORIGINAL_TEXT: {e}")
        
        logger.info(f"Encryption keys loaded for environment: {self.environment}")


class EncryptionService:
    """
    Encrypt/decrypt sensitive data using AES-256-GCM.
    
    Security properties:
    - 256-bit keys (32 bytes) provide 2^256 keyspace
    - 128-bit IV (16 bytes) provides 2^128 unique IVs for key
    - GCM mode provides authenticated encryption (detects tampering)
    - 128-bit authentication tag prevents forgery attacks
    
    Format returned: IV (16 bytes) + Ciphertext + Authentication Tag (16 bytes)
    """
    
    IV_LENGTH = 16  # 128-bit IV
    TAG_LENGTH = 16  # 128-bit authentication tag (built into GCM)
    
    def __init__(self, key_manager: EncryptionKeyManager):
        self.key_manager = key_manager
    
    def encrypt_patient_name(self, plaintext: str) -> bytes:
        """
        Encrypt patient name.
        
        Args:
            plaintext: Patient name to encrypt (e.g., "John Smith")
        
        Returns:
            bytes: IV (16 bytes) + Ciphertext + Auth Tag (total: 16 + len(plaintext) + 16)
        
        Raises:
            ValueError: If encryption fails
        """
        try:
            # Generate random 128-bit IV
            iv = os.urandom(self.IV_LENGTH)
            
            # Initialize cipher in GCM mode
            cipher = AESGCM(self.key_manager.patient_name_key)
            
            # Encrypt plaintext (GCM automatically appends 16-byte auth tag)
            ciphertext_and_tag = cipher.encrypt(iv, plaintext.encode('utf-8'), None)
            
            # Return: IV + (Ciphertext + Tag)
            return iv + ciphertext_and_tag
        
        except Exception as e:
            logger.error(f"Patient name encryption failed: {e}")
            raise ValueError(f"Encryption failed: {e}")
    
    def decrypt_patient_name(self, encrypted_data: bytes) -> str:
        """
        Decrypt patient name.
        
        Args:
            encrypted_data: bytes from encrypt_patient_name()
        
        Returns:
            str: Decrypted patient name
        
        Raises:
            ValueError: If decryption fails (invalid key, corrupted data, tag verification failed)
        """
        try:
            # Extract IV (first 16 bytes)
            iv = encrypted_data[:self.IV_LENGTH]
            
            # Remainder is ciphertext + auth tag
            ciphertext_and_tag = encrypted_data[self.IV_LENGTH:]
            
            # Initialize cipher and decrypt
            cipher = AESGCM(self.key_manager.patient_name_key)
            plaintext = cipher.decrypt(iv, ciphertext_and_tag, None)
            
            return plaintext.decode('utf-8')
        
        except Exception as e:
            logger.error(f"Patient name decryption failed: {e}")
            raise ValueError(f"Decryption failed - possibly wrong key or corrupted data: {e}")
    
    def encrypt_original_text(self, plaintext: str) -> bytes:
        """
        Encrypt original note text.
        
        Uses a separate key from patient names for better key management.
        
        Args:
            plaintext: Original note text to encrypt
        
        Returns:
            bytes: IV (16 bytes) + Ciphertext + Auth Tag
        """
        try:
            iv = os.urandom(self.IV_LENGTH)
            cipher = AESGCM(self.key_manager.original_text_key)
            ciphertext_and_tag = cipher.encrypt(iv, plaintext.encode('utf-8'), None)
            return iv + ciphertext_and_tag
        
        except Exception as e:
            logger.error(f"Original text encryption failed: {e}")
            raise ValueError(f"Encryption failed: {e}")
    
    def decrypt_original_text(self, encrypted_data: bytes) -> str:
        """
        Decrypt original note text.
        
        Args:
            encrypted_data: bytes from encrypt_original_text()
        
        Returns:
            str: Decrypted original note text
        
        Raises:
            ValueError: If decryption fails
        """
        try:
            iv = encrypted_data[:self.IV_LENGTH]
            ciphertext_and_tag = encrypted_data[self.IV_LENGTH:]
            cipher = AESGCM(self.key_manager.original_text_key)
            plaintext = cipher.decrypt(iv, ciphertext_and_tag, None)
            return plaintext.decode('utf-8')
        
        except Exception as e:
            logger.error(f"Original text decryption failed: {e}")
            raise ValueError(f"Decryption failed - possibly wrong key or corrupted data: {e}")


def generate_encryption_keys_for_env() -> dict:
    """
    Helper function to generate encryption keys for .env file.
    
    Run this once to generate keys:
        python -c "from services.encryption import generate_encryption_keys_for_env; print(generate_encryption_keys_for_env())"
    
    Then add the output to your .env file.
    """
    patient_name_key = base64.b64encode(AESGCM.generate_key(bit_length=256)).decode()
    original_text_key = base64.b64encode(AESGCM.generate_key(bit_length=256)).decode()
    
    return {
        'ENCRYPTION_KEY_PATIENT_NAME': patient_name_key,
        'ENCRYPTION_KEY_ORIGINAL_TEXT': original_text_key,
    }

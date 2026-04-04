import os
from core.initialization import fernet

def encryptValues(value: str) -> bytes:
    if value is None:
        return None
    return fernet.encrypt(value.encode())

def decryptValues(value: bytes | None) -> str | None:
    if value is None:
        return None
    return fernet.decrypt(value).decode()
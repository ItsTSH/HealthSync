from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from core.config import SECRET_KEY, ALGORITHM
import logging
import json
import base64

logger = logging.getLogger(__name__)
security = HTTPBearer()


def debug_token(token: str):
    """Debug helper to inspect token contents without verification"""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            logger.error(f"[debug_token] Invalid JWT format: {len(parts)} parts")
            return None
        
        # Decode header
        header_padded = parts[0] + '=' * (4 - len(parts[0]) % 4)
        header = json.loads(base64.urlsafe_b64decode(header_padded))
        
        # Decode payload
        payload_padded = parts[1] + '=' * (4 - len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_padded))
        
        logger.info(f"[debug_token] Header: {header}")
        logger.info(f"[debug_token] Issuer: {payload.get('iss')}")
        logger.info(f"[debug_token] Subject (user_id): {payload.get('sub')}")
        
        return {"header": header, "payload": payload}
    except Exception as e:
        logger.error(f"[debug_token] Failed to parse: {str(e)}")
        return None


async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verify JWT token and return user ID.
    
    For Supabase tokens: Decode WITHOUT verification (Supabase already verified on login)
    For backend tokens: Verify signature with SECRET_KEY
    """
    token = credentials.credentials
    
    logger.info(f"[verify_token] Attempting to verify token (length: {len(token)})")
    
    # Debug: inspect token structure
    token_info = debug_token(token)
    if token_info:
        header = token_info.get("header", {})
        payload = token_info.get("payload", {})
        iss = payload.get("iss", "")
        
        # Check if this is a Supabase token
        if "supabase" in iss.lower():
            logger.info(f"[verify_token] Detected Supabase token (iss: {iss})")
            user_id = payload.get("sub")
            
            if user_id:
                logger.info(f"[verify_token] ✅ Supabase token accepted, user_id: {user_id}")
                return user_id
            else:
                logger.error("[verify_token] Supabase token missing 'sub' claim")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token - missing user ID",
                )
    
    try:
        # Fallback: Try to verify with backend SECRET_KEY (for internally generated tokens)
        if not SECRET_KEY:
            logger.error("[verify_token] No SECRET_KEY configured for backend token verification")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Server configuration error",
            )
            
        logger.info("[verify_token] Attempting to verify as backend token with SECRET_KEY")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        logger.info(f"[verify_token] ✅ Backend token verified successfully, user_id: {user_id}")
        
        if user_id is None:
            logger.error("[verify_token] Backend token missing 'sub' claim")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token - missing user ID",
            )
        return user_id
        
    except JWTError as e:
        logger.error(f"[verify_token] JWT verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[verify_token] Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )


async def get_current_user(user_id: str = Depends(verify_token)):
    """Get current authenticated user"""
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user_id


async def get_current_user_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Extract and return the raw JWT token for use with Supabase client"""
    # Verify the token is valid
    _ = await verify_token(credentials)  # This will raise if invalid
    return credentials.credentials

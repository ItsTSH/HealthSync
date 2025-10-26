from fastapi import APIRouter, Depends, HTTPException, status, Cookie
from sqlalchemy.orm import Session
from datetime import timedelta
from db.models import User
import jwt
from core.dependencies import get_db
from schema.authSchema import UserCreate, UserLogin, UserResponse, Token
from services.authService import (
    createUser,
    getUserByEmail,
    verifyPassword,
    createAccessToken,
    createRefreshToken
)
from core.config import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Signup
@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        db_user = getUserByEmail(db, user.email_id)
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        created_user = createUser(db, user.username, user.email_id, user.password)
        return created_user
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Login
@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    try:
        db_user = getUserByEmail(db, user.email_id)
        if not db_user or not verifyPassword(user.password, db_user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials")
        
        token_data = {"sub": str(db_user.uuid)}
        access_token = createAccessToken(token_data, expiresDelta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        refresh_token = createRefreshToken(token_data)
        return Token(access_token=access_token, refresh_token=refresh_token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/refresh", response_model=Token)
def refreshNewToken(refresh_token: str = Cookie(None)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh Token Missing")
    
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_uuid = payload.get("user_uuid")
        if not user_uuid:
            raise HTTPException(status_code=401, detail="Invalid Token")
        
        # Issue new access token
        token_data = {"sub": user_uuid}
        access_token = createAccessToken(token_data, expiresDelta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        new_refresh_token = createRefreshToken(token_data)

        return Token(access_token=access_token, refresh_token=new_refresh_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh Token Expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid Refresh Token")
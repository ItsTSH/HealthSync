from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import jwt
from db.models import User
from core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import HTTPException
from core.dependencies import get_db

security=HTTPBearer()

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def hashPassword(password: str) -> str:
    return pwd_context.hash(password)

def verifyPassword(password: str, hashedPassword: str) -> bool:
    return pwd_context.verify(password, hashedPassword)

# JWT Token Creation
def createAccessToken(data: dict, expiresDelta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expiresDelta if expiresDelta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def createRefreshToken(data: dict, expiresDelta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire=  datetime.now(timezone.utc) + (expiresDelta if expiresDelta else timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# User service functions
def getUserByEmail(db: Session, email: str):
    return db.query(User).filter(User.email_id == email).first()

def createUser(db: Session, username: str, email: str, password: str) -> User:
    hashed_pw = hashPassword(password)
    user = User(username=username, email_id = email, hashed_password=hashed_pw)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def getCurrentUser(token: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_uuid = payload.get("sub")
        if not user_uuid:
            raise HTTPException(status_code=401, detail="Invalid Token")
        user = db.query(User).filter(User.uuid == user_uuid).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Access Token Expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
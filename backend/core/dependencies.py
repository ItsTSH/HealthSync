from sqlalchemy.orm import sessionmaker
from .config import DATABASE_URL
from sqlalchemy import create_engine
from db.base import Base

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base.metadata.create_all(bind=engine)

def get_db():
    db=SessionLocal()
    try:
        yield db
    finally:
        db.close()
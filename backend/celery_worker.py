#!/usr/bin/env python
"""Celery worker entry point

Run with:
    celery -A backend.core.celery_app worker --loglevel=info

Or with this script:
    python celery_worker.py
"""
import logging
from core.celery_app import app

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def start_worker():
    """Start Celery worker with standard configuration"""
    logger.info("Starting HealthSync Celery worker...")
    
    app.worker_main([
        "worker",
        "--loglevel=info",
        "--concurrency=4",
        "--prefetch-multiplier=1",
        "--time-limit=1800",  # 30 minutes hard limit
        "--soft-time-limit=1500",  # 25 minutes soft limit
    ])


if __name__ == "__main__":
    start_worker()

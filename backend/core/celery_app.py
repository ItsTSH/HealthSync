"""Celery application configuration

Initializes Celery app with Redis broker and configures task settings.
This is the main Celery instance used throughout the application.
"""
import os
from celery import Celery
from kombu import Exchange, Queue
from core.config import REDIS_NOTES_URL

# Create Celery app instance
app = Celery("healthsync")

# Configure Redis as broker and result backend
if not REDIS_NOTES_URL:
    raise ValueError("REDIS_NOTES_URL environment variable is required for Celery")

app.conf.broker_url = REDIS_NOTES_URL
app.conf.result_backend = REDIS_NOTES_URL

# Task configuration
app.conf.task_serializer = "json"
app.conf.accept_content = ["json"]
app.conf.result_serializer = "json"
app.conf.timezone = "UTC"
app.conf.enable_utc = True

# Task routing
app.conf.task_routes = {
    "tasks.embedding_tasks.process_note_embedding": {"queue": "embeddings"},
    "tasks.embedding_tasks.batch_embed_notes": {"queue": "embeddings"},
    "tasks.embedding_tasks.retry_failed_embedding": {"queue": "embeddings"},
}

# Define queues explicitly
app.conf.task_queues = (
    Queue("embeddings", Exchange("embeddings"), routing_key="embeddings"),
    Queue("default", Exchange("default"), routing_key="default"),
)

app.conf.task_default_queue = "default"
app.conf.task_default_exchange = "default"
app.conf.task_default_routing_key = "default"

# Task execution settings
app.conf.task_track_started = True
app.conf.task_time_limit = 30 * 60  # 30 minutes hard limit
app.conf.task_soft_time_limit = 25 * 60  # 25 minutes soft limit
app.conf.task_acks_late = True  # Only ack after successful completion
app.conf.worker_prefetch_multiplier = 1  # Fetch one task at a time (fair distribution)

# Result backend configuration
app.conf.result_expires = 3600  # Store results for 1 hour
app.conf.result_backend_transport_options = {
    "master_name": "mymaster",
    "retry_on_timeout": True,
}

# Worker configuration
app.conf.worker_log_format = "[%(asctime)s: %(levelname)s/%(processName)s] %(message)s"
app.conf.worker_task_log_format = "[%(asctime)s: %(levelname)s/%(processName)s] [%(task_name)s(%(task_id)s)] %(message)s"

# Import tasks to register them
# This must be at the end to avoid circular imports
from tasks import embedding_tasks  # noqa: E402, F401

__all__ = ["app"]

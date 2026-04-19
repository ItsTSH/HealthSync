# HealthSync RAG Backend - Environment Variables

Complete list of environment variables needed for production deployment.

## Critical: API Keys

```env
# Gemini API (embedding + extraction)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_EMBEDDING_API_KEY=your-gemini-api-key  # Can be same as above

# Groq API (LLM inference)
GROQ_API_KEY=your-groq-api-key

# ElevenLabs (transcription)
ELEVENLABS_API_KEY=your-elevenlabs-key
```

## Database & Storage

```env
# Supabase PostgreSQL + pgvector
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://user:pass@host/dbname

# Redis (cache + Celery broker)
REDIS_NOTES_URL=redis://localhost:6379/0
# For production with password:
# REDIS_NOTES_URL=redis://:password@host:port/db
```

## Authentication

```env
# JWT Configuration
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Encryption
FERNET_KEY=your-fernet-key  # Generate with: from cryptography.fernet import Fernet; Fernet.generate_key()
```

## RAG Configuration

```env
# Embedding Models
EMBEDDING_MODEL=all-MiniLM-L6-v2  # Legacy (sentence-transformers)
EMBEDDING_MODEL_RAG=text-embedding-004  # New (Gemini)
EMBEDDING_DIMENSION=768

# Chunking Parameters
CHUNK_SIZE_TOKENS=300
CHUNK_OVERLAP_TOKENS=50
MAX_CHUNK_SIZE_TOKENS=500

# Embedding Pipeline
EMBEDDING_BATCH_SIZE=20
EMBEDDING_RETRY_MAX=3
EMBEDDING_TIMEOUT_SECONDS=30

# Retrieval Configuration
RETRIEVAL_TOP_K=50
RERANK_TOP_K=5
TEMPORAL_WEIGHT=0.2
SIMILARITY_WEIGHT=0.8
RECENCY_BOOST_DAYS=7

# LLM Configuration
LLM_MODEL_RAG=mixtral-8x7b-32768
LLM_MAX_TOKENS=500
LLM_TEMPERATURE=0.2
LLM_TIMEOUT_SECONDS=10

# Query Caching
QUERY_CACHE_TTL_SECONDS=1800
ENABLE_QUERY_CACHE=true

# PII Masking
ENABLE_PII_MASKING=true

# Audit Logging
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_TABLE=rag_queries_audit

# ChromaDB (Legacy - can be removed after migration)
CHROMA_PERSIST_DIR=./chroma_db
```

## Application Settings

```env
# Database
DATABASE_URL=your-database-url  # PostgreSQL for user auth

# Supabase
SUPABASE_TABLE_NOTES=notes
SUPABASE_SECRET_KEY=your-secret  # For JWT signing

# Application
PORT=8000
DEBUG=false
ENVIRONMENT=production  # development, staging, production
```

## Development vs Production

### Development (.env.local)
```env
DEBUG=true
ENVIRONMENT=development
LOG_LEVEL=DEBUG
EMBEDDING_BATCH_SIZE=5  # Slower in dev
LLM_TIMEOUT_SECONDS=30  # More forgiving
```

### Production (.env)
```env
DEBUG=false
ENVIRONMENT=production
LOG_LEVEL=INFO
EMBEDDING_BATCH_SIZE=20  # Optimal batch
LLM_TIMEOUT_SECONDS=10   # Strict timeout
REDIS_NOTES_URL=redis://:password@prod-redis:6379/0
```

## Setup Instructions

### 1. Generate Required Keys

```bash
# Generate Fernet key (for encryption)
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Generate SECRET_KEY (32+ random characters)
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. Create .env file

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Validate Environment

```bash
python scripts/validate_env.py
```

### 4. Initialize Database

```bash
# Apply migrations
psql $DATABASE_URL < backend/migrations/001_create_pgvector_tables.sql
```

### 5. Test API Keys

```bash
python scripts/test_gemini_embeddings.py
python scripts/test_groq_llm.py
python scripts/test_redis.py
```

## Common Issues

### "GEMINI_EMBEDDING_API_KEY not set"
- Make sure `GEMINI_EMBEDDING_API_KEY` is in your `.env`
- Can be same as `GEMINI_API_KEY`

### "Redis connection refused"
- Start Redis: `redis-server`
- Or set correct URL: `REDIS_NOTES_URL=redis://host:port/db`

### "Table rag_queries_audit not found"
- Run migrations: `psql $DATABASE_URL < backend/migrations/001_create_pgvector_tables.sql`
- Ensure Supabase has pgvector extension enabled

### "Groq rate limit exceeded"
- Check `GROQ_API_KEY` is valid
- Free tier has limits (~30 req/min)
- Upgrade plan if needed

### "PII masking too aggressive"
- Adjust `MASKING_PATTERNS` in `core/config.py`
- Or disable: `ENABLE_PII_MASKING=false`

## Production Checklist

- [ ] All API keys configured
- [ ] Redis running and accessible
- [ ] Supabase pgvector migration applied
- [ ] Database backups configured
- [ ] HTTPS/SSL enabled
- [ ] Rate limiting configured in main.py
- [ ] Logging level set to INFO
- [ ] Error monitoring (Sentry, etc.) configured
- [ ] Celery workers running
- [ ] Health checks passing

## Secrets Management

### Using AWS Secrets Manager
```bash
aws secretsmanager create-secret --name healthsync/prod --secret-string file://env.json
```

### Using HashiCorp Vault
```bash
vault write secret/healthsync/prod < env.json
```

### Using Azure Key Vault
```bash
az keyvault secret set --vault-name healthsync-vault --name GEMINI-API-KEY --value $KEY
```

# HealthSync v4.0 Deployment Checklist

**Version:** 4.0  
**Date:** April 19, 2026  
**Status:** Ready for Production Deployment

---

## Pre-Deployment (48 hours before)

### Code Verification
- [x] All unit tests passing (36/36)
- [x] All integration tests passing (6/6)
- [x] Frontend build successful (16 routes, 8.3s)
- [x] No TypeScript errors
- [x] No console warnings in browser
- [x] Git branch chatbotFix is clean (all changes committed)

### Environment Setup
- [ ] Staging environment provisioned (copy of prod)
- [ ] Staging database has test data
- [ ] Staging Redis running
- [ ] Staging API keys validated
- [ ] VPN access verified

### Documentation
- [ ] RAG_V4_MIGRATION.md reviewed
- [ ] CLAUDE.md updated to v4.0
- [ ] API documentation updated
- [ ] Deployment guide reviewed

---

## 24 Hours Before

### Final Testing
- [ ] Run smoke tests on staging
  - [ ] Create chat
  - [ ] Send query (patient with match)
  - [ ] Send query (patient with ambiguity) → select
  - [ ] Send 10 queries → see "Chat Full"
  - [ ] Create new chat after full
- [ ] Check performance metrics on staging
  - [ ] First query < 2.5s
  - [ ] Subsequent query < 2.2s
  - [ ] Cache hit < 150ms
- [ ] Verify email notifications working
- [ ] Check database backups current

### Team Communication
- [ ] Notify ops/support of deployment
- [ ] Schedule post-deployment QA call
- [ ] Prepare rollback procedure documentation
- [ ] Brief customer success team on changes

---

## Deployment Day

### Pre-Deployment (Morning)

#### Database Migration
```bash
# 1. Backup current database
pg_dump healthsync_prod > backup_v3.1_$(date +%Y%m%d).sql

# 2. Apply migration in Supabase SQL Editor:
#    Execute: 006_create_chat_tables.sql
#
# Tables created:
# - chats (user's conversations)
# - chat_messages (individual messages)
# - chat_sessions (server-side context)
#
# Functions created:
# - increment_chat_query_count()
# - get_chat_with_context()
# - list_user_chats()
```

- [ ] Database migration applied successfully
- [ ] Verify new tables exist and have correct schema:
  ```sql
  SELECT * FROM information_schema.tables 
  WHERE table_name IN ('chats', 'chat_messages', 'chat_sessions');
  ```
- [ ] RLS policies enabled
  ```sql
  SELECT * FROM pg_policies WHERE tablename IN ('chats', 'chat_messages', 'chat_sessions');
  ```
- [ ] Test database backup restoration successful

#### Backend Deployment
```bash
# 1. Deploy to production
#    Method: [Cloud Run / Heroku / On-Premise - specify your method]
#
# Required environment variables:
# - GEMINI_API_KEY ✓ (existing)
# - GROQ_API_KEY ✓ (existing)
# - REDIS_URL ✓ (existing)
# - SUPABASE_URL ✓ (existing)
# - SUPABASE_KEY ✓ (existing)
#
# New installations:
# - spacy==3.7.2
# - python -m spacy download en_core_web_sm
```

- [ ] Backend deployed successfully
- [ ] Health check: `GET /` returns 200
- [ ] Redis connection verified: `redis-cli -u $REDIS_URL ping`
- [ ] Database connection verified: `curl -s http://backend/health | grep "status": "healthy"`
- [ ] Logs monitored for errors (first 15 minutes)

#### Frontend Deployment
```bash
# 1. Deploy to Vercel (or equivalent)
#    Production build: npm run build
#    Environment: production
```

- [ ] Frontend deployed successfully
- [ ] All routes accessible (16 routes)
- [ ] `/chatbot` shows chat list
- [ ] `/chatbot/[chat_id]` loads chat interface
- [ ] Verify no 404s or broken links
- [ ] Check build deploy logs for warnings

### During Deployment (Real-Time Monitoring)

#### Backend Monitoring
- [ ] No spike in error rate (baseline: <0.1%)
- [ ] Response time normal (P50 < 1.5s)
- [ ] No memory leaks
- [ ] Redis connection stable
- [ ] Database connections stable

```bash
# Monitor logs in real-time
gcloud logs tail "prod-healthsync" --limit 100 &  # GCP
# OR heroku logs --tail  # Heroku
```

#### Frontend Monitoring
- [ ] No JavaScript errors in console
- [ ] Page load time normal (Core Web Vitals)
- [ ] No broken components
- [ ] Chat list loads correctly
- [ ] Stream events display correctly

```bash
# Monitor in browser DevTools
# - Console: Check for errors
# - Network: Check for failed requests
# - Lighthouse: Run audit
```

### Post-Deployment Validation (Immediate)

#### User-Facing Features
- [ ] **Chat Creation**: Create new chat → appears in list
- [ ] **Send Query**: Query executes and displays response
- [ ] **Patient Extraction**: Query with patient name → auto-identified
- [ ] **Disambiguation**: Ambiguous query → modal appears with options
- [ ] **Query Counter**: Counter increments (0→1→2...→10)
- [ ] **Chat Full**: 10th query → "Chat Full" message
- [ ] **Chat Switch**: Switch between chats → message history correct
- [ ] **Chat Delete**: Delete chat → removed from list

#### Backend Validation
```bash
# Test RAG endpoint with v4.0 features
curl -X POST http://api.healthsync.com/search/rag-stream \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Check patient John Smiths vitals",
    "chat_id": "test-chat-id",
    "patient_id": null
  }' \
  | jq .

# Expected response includes:
# - "type": "ambiguity" (if multiple Johns)
# - "type": "metadata" with chat_status
# - "type": "token" (streaming tokens)
# - "type": "completion" with final answer
```

- [ ] RAG stream endpoint returns NDJSON format
- [ ] Ambiguity events properly formatted
- [ ] Chat status tracking correct
- [ ] Patient extraction working
- [ ] Query counter incremented

#### Performance Baselines
- [ ] First query: 2000-2500ms (acceptable)
- [ ] Subsequent query: 1900-2200ms (acceptable)
- [ ] Cache hit: <150ms (excellent)
- [ ] P95 latency: <3000ms (good)

---

## Immediate Post-Deployment (Within 1 Hour)

### User Communication
- [ ] Announce v4.0 release in platform (banner or notification)
- [ ] Send email to users with v4.0 features highlight
- [ ] Update in-app help documentation
- [ ] Publish blog post (if applicable)

### Monitoring Setup
- [ ] Enable detailed Sentry error tracking
- [ ] Set up CloudWatch/Datadog dashboards
- [ ] Create alerts for:
  - [ ] Error rate > 1%
  - [ ] Response time > 3s (P99)
  - [ ] Database connection pool exhausted
  - [ ] Redis connection failures

### Data Validation
- [ ] Verify first users creating chats successfully
- [ ] Check chat_sessions table being populated
- [ ] Confirm no data loss from migration
- [ ] Audit logs recording correctly

---

## 24 Hours Post-Deployment

### Stability Check
- [ ] No major errors in logs
- [ ] Error rate < 0.5%
- [ ] Response times stable
- [ ] All 16 routes accessible
- [ ] No customer complaints escalated

### Feature Validation
- [ ] Multi-chat working for multiple users
- [ ] Patient disambiguation working correctly
- [ ] Query counter accurate
- [ ] Session context persisting properly
- [ ] Chat full detection working

### Database Health
- [ ] All new tables populated correctly:
  ```sql
  SELECT COUNT(*) FROM chats;
  SELECT COUNT(*) FROM chat_messages;
  SELECT COUNT(*) FROM chat_sessions;
  ```
- [ ] RLS policies enforcing correctly
- [ ] No N+1 query issues
- [ ] Index performance adequate

### Backend Performance
```bash
# Verify performance metrics
curl -X GET http://api.healthsync.com/metrics \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Expected:
# {
#   "rag_queries_total": 150,
#   "avg_latency_ms": 2100,
#   "p95_latency_ms": 2800,
#   "error_count": 0,
#   "cache_hit_rate": 0.45
# }
```

- [ ] Query volume normal for time of day
- [ ] Cache hit rate > 30%
- [ ] Error count < 2

---

## 48 Hours Post-Deployment

### User Adoption
- [ ] Track feature usage metrics:
  - [ ] Chats created per user (average)
  - [ ] Queries per chat (average)
  - [ ] Patient disambiguation modal shown % (should be low after training)
  - [ ] Chat full events (% of active users)

### Issue Triage
- [ ] Review all support tickets related to v4.0
- [ ] Classify as:
  - [ ] User training needed
  - [ ] Bug requiring hotfix
  - [ ] Enhancement for v4.1
- [ ] Priority 1 bugs: Fix immediately
- [ ] Priority 2 bugs: Plan for next release

### Documentation Updates
- [ ] Update FAQs based on support tickets
- [ ] Clarify confusion points in migration guide
- [ ] Add troubleshooting section if needed

---

## Rollback Procedure (If Needed)

**Trigger Condition:** Error rate > 5% sustained for 15 minutes, or critical feature broken

```bash
# 1. Notify team
# 2. Execute rollback

# Git rollback
git checkout v3.1-stable
git push origin v3.1-stable:main

# Database rollback
# In Supabase:
# - Drop new tables (if necessary)
# - Restore from backup: backup_v3.1_20260419.sql

# Backend rollback
#  Method: [Redeploy from v3.1]

# Frontend rollback
# Method: [Revert to previous Vercel deployment]

# Verify
curl -X GET http://api.healthsync.com/
# Should return v3.1 response
```

- [ ] Rollback completed in < 30 minutes
- [ ] Backup restored successfully
- [ ] All systems operational
- [ ] Users notified of incident

---

## Success Criteria

**Deployment is successful if:**

1. ✅ All automated tests passing (36 unit + 6 integration)
2. ✅ No critical errors in first 48 hours
3. ✅ Error rate stays < 1% (baseline: <0.1%)
4. ✅ Response times within SLA (<2.5s for new queries)
5. ✅ All v4.0 features working (chat, disambiguation, counter)
6. ✅ User adoption positive (no mass complaints)
7. ✅ Database migrated cleanly with no data loss
8. ✅ Security: RLS policies enforced, no data leaks

---

## Sign-Off

- [ ] Development Team Lead: _____________ Date: _______
- [ ] QA Team Lead: _____________ Date: _______
- [ ] DevOps/Infrastructure: _____________ Date: _______
- [ ] Product Manager: _____________ Date: _______

---

**Document Version:** 1.0  
**Last Updated:** April 19, 2026  
**Next Review:** June 19, 2026

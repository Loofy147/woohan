# WOOHAN Operations Guide

## Table of Contents

1. [Deployment Strategy](#deployment-strategy)
2. [Monitoring and Observability](#monitoring-and-observability)
3. [Runbooks](#runbooks)
4. [Incident Management](#incident-management)
5. [Scaling and Performance](#scaling-and-performance)
6. [Backup and Disaster Recovery](#backup-and-disaster-recovery)
7. [Security Operations](#security-operations)

---

## Deployment Strategy

### Pre-Deployment Checklist

- [ ] All tests passing (target: >95%)
- [ ] Code review completed
- [ ] Security audit passed
- [ ] Performance benchmarks acceptable
- [ ] Staging environment validated
- [ ] Database migrations tested
- [ ] Backup created
- [ ] Rollback plan documented
- [ ] Team notified
- [ ] Monitoring alerts configured

### Deployment Environments

#### Development
- **Purpose:** Local development and testing
- **Database:** SQLite (local)
- **Logging:** Console output
- **Monitoring:** Disabled
- **Deployment:** Manual via `pnpm dev`

#### Staging
- **Purpose:** Pre-production validation
- **Database:** MySQL/TiDB (staging)
- **Logging:** File-based with rotation
- **Monitoring:** Full monitoring enabled
- **Deployment:** Automated via CI/CD on `staging` branch

#### Production
- **Purpose:** Live user-facing service
- **Database:** MySQL/TiDB (production, replicated)
- **Logging:** Centralized (ELK stack or Sentry)
- **Monitoring:** Full monitoring with alerting
- **Deployment:** Automated via CI/CD on `main` branch with approval

### Deployment Process

#### 1. Pre-Deployment

```bash
# Run full test suite
pnpm test

# Build application
pnpm build

# Run security scan
pnpm security:audit

# Validate configuration
pnpm config:validate
```

#### 2. Staging Deployment

```bash
# Push to staging branch
git push origin main:staging

# Automated CI/CD runs:
# - Tests
# - Build
# - Deploy to staging
# - Run smoke tests
# - Validate endpoints

# Manual validation
curl https://staging.woohan.app/health
```

#### 3. Production Deployment

```bash
# Create release tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Automated CI/CD runs:
# - Tests
# - Build
# - Deploy to production (canary: 10%)
# - Monitor metrics
# - Gradual rollout (25%, 50%, 100%)
```

#### 4. Post-Deployment

```bash
# Verify deployment
curl https://api.woohan.app/health

# Check metrics
# - Error rate < 0.1%
# - Latency p99 < 100ms
# - CPU < 70%
# - Memory < 80%

# Monitor logs for errors
tail -f /var/log/woohan/app.log
```

### Rollback Procedure

If deployment fails or critical issues detected:

```bash
# Immediate rollback
git revert <commit-hash>
git push origin main

# Or use blue-green deployment
kubectl set image deployment/woohan-api \
  woohan-api=woohan:v1.0.0-previous

# Verify rollback
curl https://api.woohan.app/health
```

---

## Monitoring and Observability

### Key Metrics

#### Application Metrics
- **Request Rate:** Requests per second (target: <1000 RPS)
- **Error Rate:** Errors per second (target: <1%)
- **Latency:** p50, p95, p99 (target: <50ms, <100ms, <200ms)
- **Memory Usage:** RAM consumption (target: <500MB)
- **CPU Usage:** CPU percentage (target: <70%)

#### Business Metrics
- **Active Users:** Concurrent users (target: >1000)
- **Memory Operations:** Events processed per second (target: >100)
- **Identity Encodings:** Encodings per second (target: >50)
- **Semantic Queries:** Queries per second (target: >200)

#### Infrastructure Metrics
- **Database Connections:** Active connections (target: <100)
- **Database Query Time:** Query latency (target: <10ms p95)
- **Cache Hit Rate:** Cache effectiveness (target: >90%)
- **Disk Usage:** Storage utilization (target: <80%)

### Monitoring Stack

#### Prometheus
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'woohan-api'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/metrics'
```

#### Grafana Dashboards
- **System Dashboard:** CPU, memory, disk, network
- **Application Dashboard:** Request rate, error rate, latency
- **Business Dashboard:** Active users, operations, revenue
- **Database Dashboard:** Connections, query time, replication lag

#### Sentry Integration
```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Capture exceptions
try {
  // code
} catch (error) {
  Sentry.captureException(error);
}
```

### Alerting Rules

#### Critical Alerts (Page On-Call)
- Error rate > 1%
- Latency p99 > 500ms
- Database unavailable
- Memory usage > 90%
- Disk usage > 95%

#### Warning Alerts (Slack Notification)
- Error rate > 0.5%
- Latency p99 > 200ms
- Memory usage > 80%
- Disk usage > 80%
- Cache hit rate < 80%

---

## Runbooks

### Runbook: High Error Rate

**Symptoms:** Error rate > 1%, Sentry alerts triggered

**Investigation:**
```bash
# Check recent logs
tail -f /var/log/woohan/app.log | grep ERROR

# Check error distribution
curl https://api.woohan.app/metrics | grep error_total

# Check database connectivity
curl https://api.woohan.app/health/db

# Check external service status
curl https://api.woohan.app/health/external
```

**Resolution:**
1. Identify error pattern (database, external service, code)
2. If database: Check replication lag, restart if needed
3. If external service: Check status page, retry with exponential backoff
4. If code: Rollback to previous version or apply hotfix

### Runbook: High Latency

**Symptoms:** Latency p99 > 200ms, users reporting slow responses

**Investigation:**
```bash
# Check database query performance
mysql> SELECT * FROM performance_schema.events_statements_summary_by_digest
  ORDER BY SUM_TIMER_WAIT DESC LIMIT 10;

# Check slow query log
tail -f /var/log/mysql/slow.log

# Check CPU and memory
top -b -n 1 | head -20

# Check network latency
ping -c 10 database.example.com
```

**Resolution:**
1. Identify slow queries
2. Add database indexes if needed
3. Scale horizontally (add more API instances)
4. Optimize code (profiling, caching)
5. Increase database resources if needed

### Runbook: Database Connection Pool Exhaustion

**Symptoms:** "Too many connections" errors, connection pool warnings

**Investigation:**
```bash
# Check active connections
mysql> SHOW PROCESSLIST;

# Check connection pool status
curl https://api.woohan.app/metrics | grep db_connections

# Check for connection leaks
grep -i "connection" /var/log/woohan/app.log | tail -100
```

**Resolution:**
1. Identify long-running queries and kill them
2. Increase connection pool size (if safe)
3. Implement connection pooling (PgBouncer, ProxySQL)
4. Optimize query performance
5. Scale database vertically or horizontally

### Runbook: Memory Leak

**Symptoms:** Memory usage gradually increasing, OOM kills

**Investigation:**
```bash
# Check memory usage over time
free -h
ps aux | grep node

# Check heap dump
node --inspect app.js
# Then use Chrome DevTools

# Check for circular references
grep -r "circular" /var/log/woohan/
```

**Resolution:**
1. Identify memory leak source (profiling)
2. Fix circular references or event listener leaks
3. Implement memory limits and auto-restart
4. Deploy fix and monitor

---

## Incident Management

### Incident Severity Levels

| Level | Response Time | Impact | Example |
|-------|--------------|--------|---------|
| P1 (Critical) | 5 min | Complete outage | Database down, all users affected |
| P2 (High) | 15 min | Partial outage | 50% of users affected, core feature broken |
| P3 (Medium) | 1 hour | Degraded service | Some users affected, workaround exists |
| P4 (Low) | 4 hours | Minor issue | Edge case, cosmetic issue |

### Incident Response Process

#### 1. Detection
- Automated monitoring alert
- User report via support
- Team member observation

#### 2. Acknowledgment
- On-call engineer acknowledges alert within response time
- Creates incident ticket
- Notifies team in Slack

#### 3. Investigation
- Gather logs and metrics
- Identify root cause
- Assess impact

#### 4. Mitigation
- Apply temporary fix if needed
- Scale resources if needed
- Communicate with users

#### 5. Resolution
- Deploy permanent fix
- Verify resolution
- Close incident

#### 6. Retrospective
- Document incident
- Identify prevention measures
- Update runbooks

### Incident Communication Template

```
INCIDENT: [Title]
SEVERITY: P[1-4]
STATUS: Investigating/Mitigating/Resolved

IMPACT:
- [Number] users affected
- [Feature] unavailable
- [Duration] of outage

ROOT CAUSE:
[Description of root cause]

RESOLUTION:
[Steps taken to resolve]

TIMELINE:
- [Time] - Incident detected
- [Time] - Investigation started
- [Time] - Mitigation applied
- [Time] - Resolved

PREVENTION:
- [Measure 1]
- [Measure 2]
```

---

## Scaling and Performance

### Horizontal Scaling

#### Add API Instances
```bash
# Kubernetes
kubectl scale deployment woohan-api --replicas=5

# Docker Compose
docker-compose up -d --scale api=5
```

#### Load Balancing
```nginx
upstream woohan_api {
  server api1.example.com:3000;
  server api2.example.com:3000;
  server api3.example.com:3000;
}

server {
  listen 80;
  location / {
    proxy_pass http://woohan_api;
  }
}
```

### Vertical Scaling

#### Increase Resources
```bash
# Kubernetes
kubectl set resources deployment woohan-api \
  --limits=cpu=2,memory=2Gi \
  --requests=cpu=1,memory=1Gi
```

### Caching Strategy

#### Redis Caching
```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

// Cache memory state
const cacheKey = `memory:${userId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Fetch and cache
const memory = await getMemoryState(userId);
await redis.setex(cacheKey, 3600, JSON.stringify(memory));
```

### Database Optimization

#### Indexing Strategy
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_user_id ON memories(user_id);
CREATE INDEX idx_created_at ON events(created_at);
CREATE INDEX idx_significance ON events(significance);

-- Composite indexes for common queries
CREATE INDEX idx_user_created ON memories(user_id, created_at);
```

#### Query Optimization
```sql
-- Use EXPLAIN to analyze queries
EXPLAIN SELECT * FROM memories WHERE user_id = 1;

-- Add indexes for slow queries
ALTER TABLE memories ADD INDEX idx_user_id (user_id);

-- Use query hints if needed
SELECT /*+ INDEX(memories idx_user_id) */ * FROM memories;
```

---

## Backup and Disaster Recovery

### Backup Strategy

#### Daily Backups
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/woohan"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
mysqldump -u root -p"$DB_PASSWORD" woohan > "$BACKUP_DIR/db_$DATE.sql"

# Backup application files
tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" /app/woohan

# Upload to S3
aws s3 cp "$BACKUP_DIR/db_$DATE.sql" s3://woohan-backups/
aws s3 cp "$BACKUP_DIR/app_$DATE.tar.gz" s3://woohan-backups/

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -mtime +30 -delete
```

#### Point-in-Time Recovery
```bash
# Restore from backup
mysql -u root -p"$DB_PASSWORD" woohan < /backups/woohan/db_20250113_120000.sql

# Verify restoration
mysql -u root -p"$DB_PASSWORD" -e "SELECT COUNT(*) FROM woohan.memories;"
```

### Disaster Recovery Plan

#### RTO (Recovery Time Objective): 1 hour
#### RPO (Recovery Point Objective): 15 minutes

#### Recovery Steps
1. Assess damage and scope
2. Restore from most recent backup
3. Apply transaction logs if available
4. Verify data integrity
5. Perform smoke tests
6. Restore user access
7. Monitor closely

---

## Security Operations

### Security Checklist

- [ ] All dependencies up-to-date
- [ ] No known vulnerabilities (npm audit)
- [ ] Secrets not committed to git
- [ ] HTTPS enforced
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF tokens implemented
- [ ] Rate limiting enabled
- [ ] Authentication enforced
- [ ] Authorization checks in place

### Vulnerability Management

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

### Secret Rotation

```bash
# Rotate API keys
1. Generate new key
2. Update in all services
3. Test with new key
4. Revoke old key
5. Document rotation date
```

### Access Control

```typescript
// Implement role-based access control
enum Role {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

// Check authorization
function authorize(requiredRole: Role) {
  return (req, res, next) => {
    if (req.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

---

## Operational Metrics Dashboard

### Daily Review
- Error rate
- Latency p99
- Active users
- Memory operations count
- Deployment status

### Weekly Review
- Incident count and severity
- Performance trends
- Resource utilization
- Cost analysis
- Security updates needed

### Monthly Review
- Capacity planning
- Cost optimization
- Performance improvements
- Security audit
- Team retrospective

---

## Contact and Escalation

### On-Call Rotation
- Primary: [Name] ([Phone])
- Secondary: [Name] ([Phone])
- Manager: [Name] ([Phone])

### Escalation Path
1. On-call engineer (5 min response)
2. Secondary on-call (15 min)
3. Team lead (30 min)
4. Manager (1 hour)

### Communication Channels
- **Urgent:** Phone call
- **Important:** Slack #incidents
- **Updates:** Email to team@woohan.app

---

## Additional Resources

- [Runbook Template](./RUNBOOK_TEMPLATE.md)
- [Incident Report Template](./INCIDENT_TEMPLATE.md)
- [Monitoring Setup Guide](./MONITORING_SETUP.md)
- [Disaster Recovery Plan](./DR_PLAN.md)

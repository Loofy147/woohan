# WOOHAN Deployment Guide

Complete guide for deploying WOOHAN to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Cloud Platforms](#cloud-platforms)
6. [Environment Configuration](#environment-configuration)
7. [Database Setup](#database-setup)
8. [Monitoring & Logging](#monitoring--logging)
9. [Security Hardening](#security-hardening)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **OS:** Linux (Ubuntu 20.04+), macOS, or Windows with WSL2
- **CPU:** 2+ cores recommended
- **RAM:** 4GB minimum, 8GB+ recommended
- **Storage:** 20GB+ free space

### Software Requirements

- **Node.js:** 22.13.0 or later
- **Python:** 3.11 or later
- **Docker:** 20.10+ (for containerized deployment)
- **Docker Compose:** 2.0+ (for multi-container setup)
- **Git:** 2.30+

### External Services

- **Database:** MySQL 8.0+ or TiDB
- **OAuth Provider:** Manus OAuth configured
- **Monitoring:** Sentry account (optional but recommended)
- **Storage:** S3-compatible storage (optional for file uploads)

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/woohan/woohan.git
cd woohan
```

### 2. Install Dependencies

```bash
# Install Node dependencies
pnpm install

# Install Python dependencies
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install torch transformers sentence-transformers numpy
```

### 3. Configure Environment

Create `.env.local` file:

```bash
# Database
DATABASE_URL=mysql://user:password@localhost:3306/woohan

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# Application
VITE_APP_TITLE=WOOHAN
VITE_APP_LOGO=https://example.com/logo.svg
VITE_APP_ID=your-app-id

# Monitoring
SENTRY_DSN=https://key@sentry.io/project

# AI Services
HUGGING_FACE_API_KEY=your-hf-key
```

### 4. Initialize Database

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE woohan;"

# Run migrations
pnpm db:push
```

### 5. Start Development Server

```bash
pnpm dev
```

Access the application at `http://localhost:3000`

---

## Docker Deployment

### 1. Build Docker Image

```bash
# Build production image
docker build -t woohan:latest .

# Build with specific tag
docker build -t woohan:v1.0.0 .
```

### 2. Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: woohan
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  woohan:
    build: .
    environment:
      DATABASE_URL: mysql://root:root@mysql:3306/woohan
      JWT_SECRET: ${JWT_SECRET}
      OAUTH_SERVER_URL: ${OAUTH_SERVER_URL}
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs

volumes:
  mysql_data:
```

### 3. Run with Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f woohan

# Stop services
docker-compose down
```

### 4. Dockerfile

```dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Runtime stage
FROM node:22-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/server.js"]
```

---

## Kubernetes Deployment

### 1. Create Kubernetes Manifests

**woohan-deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: woohan
spec:
  replicas: 3
  selector:
    matchLabels:
      app: woohan
  template:
    metadata:
      labels:
        app: woohan
    spec:
      containers:
      - name: woohan
        image: woohan:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: woohan-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: woohan-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

**woohan-service.yaml:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: woohan-service
spec:
  selector:
    app: woohan
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### 2. Deploy to Kubernetes

```bash
# Create secrets
kubectl create secret generic woohan-secrets \
  --from-literal=database-url=$DATABASE_URL \
  --from-literal=jwt-secret=$JWT_SECRET

# Apply manifests
kubectl apply -f woohan-deployment.yaml
kubectl apply -f woohan-service.yaml

# Check deployment status
kubectl get deployments
kubectl get pods
kubectl get services
```

### 3. Scaling

```bash
# Scale to 5 replicas
kubectl scale deployment woohan --replicas=5

# Auto-scaling (requires metrics server)
kubectl autoscale deployment woohan --min=3 --max=10 --cpu-percent=80
```

---

## Cloud Platforms

### AWS Deployment

**Using Elastic Container Service (ECS):**

```bash
# Push image to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker tag woohan:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/woohan:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/woohan:latest

# Create ECS task definition and service
# (See AWS documentation for detailed steps)
```

### Google Cloud Platform

**Using Cloud Run:**

```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/woohan

# Deploy to Cloud Run
gcloud run deploy woohan \
  --image gcr.io/PROJECT_ID/woohan \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL=$DATABASE_URL,JWT_SECRET=$JWT_SECRET
```

### Heroku Deployment

```bash
# Login to Heroku
heroku login

# Create app
heroku create woohan-app

# Set environment variables
heroku config:set DATABASE_URL=$DATABASE_URL JWT_SECRET=$JWT_SECRET

# Deploy
git push heroku main
```

---

## Environment Configuration

### Production Environment Variables

```bash
# Application
NODE_ENV=production
VITE_APP_TITLE=WOOHAN
VITE_APP_LOGO=https://cdn.example.com/logo.svg

# Database
DATABASE_URL=mysql://user:pass@host:3306/woohan
DATABASE_POOL_SIZE=20

# Authentication
JWT_SECRET=your-very-long-secret-key-min-32-chars
JWT_EXPIRY=7d
OAUTH_SERVER_URL=https://api.manus.im

# Monitoring
SENTRY_DSN=https://key@sentry.io/project
LOG_LEVEL=info

# Performance
CACHE_TTL=3600
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# AI Services
HUGGING_FACE_API_KEY=your-key
MINIMAX_API_KEY=your-key
```

### Configuration Files

Create `config/production.ts`:

```typescript
export const productionConfig = {
  database: {
    poolSize: 20,
    connectionTimeout: 10000,
    idleTimeout: 30000,
  },
  cache: {
    ttl: 3600,
    maxSize: 1000,
  },
  rateLimit: {
    windowMs: 60000,
    maxRequests: 100,
  },
  logging: {
    level: 'info',
    format: 'json',
  },
};
```

---

## Database Setup

### MySQL Setup

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE woohan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Create user
mysql -u root -p -e "CREATE USER 'woohan'@'localhost' IDENTIFIED BY 'password';"

# Grant privileges
mysql -u root -p -e "GRANT ALL PRIVILEGES ON woohan.* TO 'woohan'@'localhost'; FLUSH PRIVILEGES;"

# Run migrations
pnpm db:push
```

### Backup Strategy

```bash
# Daily backup
0 2 * * * mysqldump -u woohan -p woohan > /backups/woohan-$(date +\%Y\%m\%d).sql

# Backup to S3
0 3 * * * aws s3 cp /backups/woohan-$(date +\%Y\%m\%d).sql s3://woohan-backups/
```

### Replication Setup

For high availability, set up MySQL replication:

```sql
-- On primary server
CHANGE MASTER TO
  MASTER_HOST='replica-host',
  MASTER_USER='replication_user',
  MASTER_PASSWORD='password',
  MASTER_LOG_FILE='mysql-bin.000001',
  MASTER_LOG_POS=154;

START SLAVE;
```

---

## Monitoring & Logging

### Sentry Integration

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### Logging Setup

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

### Health Checks

```typescript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/ready', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false });
  }
});
```

---

## Security Hardening

### TLS/SSL Configuration

```nginx
server {
  listen 443 ssl http2;
  server_name woohan.example.com;

  ssl_certificate /etc/ssl/certs/cert.pem;
  ssl_certificate_key /etc/ssl/private/key.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;

  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### Security Headers

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

### CORS Configuration

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
```

---

## Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check MySQL service
systemctl status mysql

# Test connection
mysql -u woohan -p -h localhost woohan -e "SELECT 1;"
```

**Memory Leaks**
```bash
# Monitor memory usage
node --inspect=0.0.0.0:9229 dist/server.js

# Use Chrome DevTools: chrome://inspect
```

**High CPU Usage**
```bash
# Profile CPU
node --prof dist/server.js
node --prof-process isolate-*.log > profile.txt
```

### Performance Optimization

```typescript
// Enable query caching
const cache = new Map();

function getCachedQuery(key, fn) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  const result = fn();
  cache.set(key, result);
  setTimeout(() => cache.delete(key), 3600000); // 1 hour TTL
  return result;
}
```

---

## Maintenance

### Regular Tasks

- **Daily:** Monitor logs and alerts
- **Weekly:** Review performance metrics
- **Monthly:** Update dependencies
- **Quarterly:** Security audit
- **Annually:** Capacity planning

### Update Procedure

```bash
# Test updates in staging
git pull origin main
pnpm install
pnpm build
pnpm test

# Deploy to production
docker build -t woohan:v1.0.1 .
docker push woohan:v1.0.1
kubectl set image deployment/woohan woohan=woohan:v1.0.1
```

---

**WOOHAN Deployment Guide** © 2025 | Manus AI

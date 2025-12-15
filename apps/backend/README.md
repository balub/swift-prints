# Swift Prints Backend

NestJS backend for the Swift Prints 3D printing platform.

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- pnpm

### Development Setup

1. **Start infrastructure services:**

```bash
# From project root
docker-compose up -d db minio minio-init slicer
```

2. **Install dependencies:**

```bash
cd apps/backend
pnpm install
```

3. **Generate Prisma client:**

```bash
pnpm prisma:generate
```

4. **Run database migrations:**

```bash
pnpm prisma:migrate
```

5. **Seed the database:**

```bash
pnpm seed
```

6. **Start the dev server:**

```bash
pnpm start:dev
```

The backend will be available at http://localhost:3001

### Environment Variables

Create a `.env` file in this directory or the project root:

```env
# Database
DATABASE_URL=postgres://swiftprints:swiftprints@localhost:5432/swiftprints

# S3/MinIO Storage
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio123
S3_BUCKET=swiftprints
S3_REGION=us-east-1

# Backend
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Slicer
SLICER_CONTAINER=swiftprints-slicer
SLICER_JOBS_PATH=/tmp/slicer_jobs
SLICER_CONFIG_PATH=/config

# Email (Resend)
# If RESEND_API_KEY is not set, emails will be logged to console (mock mode)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

## API Endpoints

### Health

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check |

### Uploads (Phase 1)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/uploads/analyze` | Upload and analyze STL file |
| GET | `/uploads/:uploadId` | Get upload details |
| GET | `/uploads/:uploadId/download` | Get signed download URL |

### Printers

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/printers` | List all active printers |
| GET | `/printers/:printerId` | Get printer details |

### Pricing (Phase 2)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/pricing/estimate` | Get detailed estimate (runs slicing) |
| GET | `/pricing/quick-estimate` | Get quick estimate (no slicing) |

### Orders

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/orders` | Create a new order |
| GET | `/orders/:orderId` | Get order status |

### Admin (Organizer)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/orders` | List all orders |
| GET | `/admin/orders/stats` | Get order statistics |
| GET | `/admin/orders/:orderId` | Get order details with downloads |
| PATCH | `/admin/orders/:orderId/status` | Update order status |
| GET | `/admin/printers` | List all printers |
| POST | `/admin/printers` | Create printer |
| PATCH | `/admin/printers/:printerId` | Update printer |
| POST | `/admin/printers/:printerId/filaments` | Add filament to printer |
| PATCH | `/admin/filaments/:filamentId` | Update filament pricing |

## Project Structure

```
src/
├── app.module.ts          # Root module
├── app.controller.ts      # Health check
├── main.ts                # Bootstrap
├── prisma/                # Prisma service
├── common/                # Shared utilities
├── storage/               # S3/MinIO integration
├── uploads/               # STL upload & analysis
├── slicing/               # PrusaSlicer integration
├── pricing/               # Cost calculation
├── printers/              # Printer management
├── orders/                # Order lifecycle
├── admin/                 # Organizer routes
└── email/                 # Email notifications (Resend integration)
```

## Docker

Build and run with Docker Compose:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Run migrations inside container
docker-compose exec backend npx prisma migrate dev
```

## MinIO Console

Access MinIO at http://localhost:9001
- Username: `minio`
- Password: `minio123`


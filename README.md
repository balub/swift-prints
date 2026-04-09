# Swift Prints Monorepo

A pnpm monorepo containing the Swift Prints application with separate frontend and backend apps.

## Project Structure

```
swift-prints/
├── apps/
│   ├── frontend/       # React + Vite frontend application
│   └── backend/        # FastAPI (Python) backend API
├── pnpm-workspace.yaml # pnpm workspace configuration
└── package.json        # Root package.json with workspace scripts
```

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- pnpm (version 8 or higher)
- Docker and Docker Compose (for running services)

### Environment Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Copy the frontend environment file:

   ```bash
   cp apps/frontend-hack/.env.example apps/frontend-hack/.env
   ```

3. Edit `.env` files as needed for your environment. The root `.env` file is used by Docker Compose for all services.

### Installation

Install dependencies for all workspaces:

```bash
pnpm install
```

### Development

Start both frontend and backend in development mode:

```bash
pnpm dev
```

Or start them individually:

```bash
# Frontend only (runs on http://localhost:5173)
pnpm dev:frontend

# Backend only (runs on http://localhost:3001)
pnpm dev:backend
```

### Building

Build all applications:

```bash
pnpm build
```

Or build individually:

```bash
pnpm build:frontend
pnpm build:backend
```

### Linting

Run linting for all workspaces:

```bash
pnpm lint
```

## Applications

### Frontend (`apps/frontend`)

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Port**: 5173 (development)

### Backend (`apps/backend`)

- **Framework**: NestJS (Node.js/TypeScript)
- **Port**: 3001 (development)
- **Database**: PostgreSQL
- **Storage**: MinIO (S3-compatible)
- **Development**: Uses Docker Compose with hot reload

## Docker Development

Start all services (database, MinIO, backend) using Docker Compose:

```bash
# Development mode
docker compose --profile dev up -d

# Production mode
docker compose --profile prod up -d
```

Stop services:

```bash
docker compose --profile dev down
```

## Available Scripts

- `dev` - Start all applications in development mode
- `dev:frontend` - Start only the frontend
- `dev:frontend-hack` - Start the hackathon frontend
- `build` - Build all applications
- `build:frontend` - Build only the frontend
- `build:backend` - Build only the backend
- `lint` - Run linting for all workspaces
- `type-check` - Run TypeScript type checking for all workspaces

## Environment Variables

All environment variables are configured in the root `.env` file. See `.env.example` for a template with default values.

Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `S3_*` - MinIO/S3 configuration
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` - Admin login credentials
- `JWT_SECRET` - JWT token secret key
- `CORS_ORIGIN` - Allowed CORS origins (comma-separated)

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
- Python 3.10 or higher (for the backend)

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

- **Framework**: FastAPI (Python)
- **Port**: 3001 (development)
- **Features**: Minimal service exposing `/health` and `/ping`
- **Development**: `cd apps/backend && pip install -r requirements.txt && uvicorn main:app --reload`

## Available Scripts

- `dev` - Start all applications in development mode
- `dev:frontend` - Start only the frontend
- `dev:backend` - Start only the backend
- `build` - Build all applications
- `build:frontend` - Build only the frontend
- `build:backend` - Build only the backend
- `lint` - Run linting for all workspaces
- `type-check` - Run TypeScript type checking for all workspaces

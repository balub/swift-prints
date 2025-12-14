FROM ubuntu:24.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 20.x and PrusaSlicer with dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    gnupg \
    # PrusaSlicer dependencies
    prusa-slicer \
    libglu1-mesa \
    libgtk-3-0 \
    libdbus-1-3 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy slicer config
COPY slicer-config/ /config/

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create slicer jobs directory
RUN mkdir -p /tmp/slicer_jobs

EXPOSE 3001

CMD ["npm", "run", "start:prod"]

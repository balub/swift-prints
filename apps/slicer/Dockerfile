FROM ubuntu:24.04

# Install PrusaSlicer and dependencies
RUN apt-get update && apt-get install -y \
    prusa-slicer \
    libglu1-mesa \
    libgtk-3-0 \
    libdbus-1-3 \
    libwebkit2gtk-4.1-0 \
    && rm -rf /var/lib/apt/lists/*

# Working directory for slicing jobs
WORKDIR /data

# Default entrypoint for CLI usage
ENTRYPOINT ["prusa-slicer"]
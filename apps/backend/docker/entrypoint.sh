#!/bin/bash

# Start virtual display for headless operation
Xvfb :99 -screen 0 1024x768x24 &

# Execute PrusaSlicer with provided arguments
exec prusaslicer "$@"
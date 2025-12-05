#!/bin/bash
# Use PORT from environment, default to 5000
PORT=${PORT:-5000}
echo "Starting server on port $PORT"
exec gunicorn --bind 0.0.0.0:$PORT --workers 1 --timeout 300 app:app

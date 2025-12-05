#!/bin/bash
# Use PORT from environment, default to 5000

echo "Starting server on port 5000"
exec gunicorn --bind 0.0.0.0:5000 --workers 1 --timeout 300 app:app

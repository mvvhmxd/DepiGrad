# Use Python 3.10 slim image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV TF_CPP_MIN_LOG_LEVEL=2

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Cache bust - change this to force rebuild
ARG CACHEBUST=1

# Copy ALL application files including models
COPY . .

# Debug: List model files
RUN ls -la *.h5 || echo "No .h5 files found!"

# Create uploads directory
RUN mkdir -p uploads

# Make start script executable
RUN chmod +x start.sh

# Expose port
EXPOSE 5000

# Run the start script
CMD ["./start.sh"]

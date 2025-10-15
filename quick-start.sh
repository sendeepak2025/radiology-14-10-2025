#!/bin/bash

# Quick Start Script for Medical Imaging PACS System
# Usage: ./quick-start.sh

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Medical Imaging PACS System - Quick Start Setup         ║"
echo "║   USA Hospital Deployment                                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "Please install Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed!"
    echo "Please install Docker Compose"
    exit 1
fi

echo "✅ Docker is installed"
echo "✅ Docker Compose is installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found!"
    echo "Creating .env from template..."
    cp .env.template .env
    echo ""
    echo "📝 Please edit .env file with your credentials:"
    echo "   - MongoDB URI (required)"
    echo "   - Cloudinary credentials (required)"
    echo "   - Emergent LLM Key (required for AI)"
    echo ""
    echo "After editing .env, run this script again."
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check if required environment variables are set
source .env

if [[ "$MONGODB_URI" == *"your-username"* ]] || [[ -z "$MONGODB_URI" ]]; then
    echo "❌ Please set MONGODB_URI in .env file"
    exit 1
fi

if [[ "$CLOUDINARY_CLOUD_NAME" == "your-cloud-name" ]] || [[ -z "$CLOUDINARY_CLOUD_NAME" ]]; then
    echo "❌ Please set Cloudinary credentials in .env file"
    exit 1
fi

if [[ "$EMERGENT_LLM_KEY" == *"your-key"* ]] || [[ -z "$EMERGENT_LLM_KEY" ]]; then
    echo "⚠️  Warning: EMERGENT_LLM_KEY not set - AI features will not work"
fi

echo "✅ Environment variables configured"
echo ""

# Check available ports
echo "Checking if ports are available..."
for port in 3000 4242 8001 8002 8042; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ Port $port is already in use!"
        echo "Please stop the service using port $port or change the port in docker-compose.yml"
        exit 1
    fi
done
echo "✅ All required ports are available"
echo ""

# Check disk space
available_space=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$available_space" -lt 20 ]; then
    echo "⚠️  Warning: Less than 20GB disk space available"
    echo "Available: ${available_space}GB"
    echo "Recommended: 20GB+"
fi
echo ""

# Pull Docker images
echo "📥 Pulling Docker images (this may take a few minutes)..."
docker-compose pull orthanc

# Build custom images
echo "🔨 Building application images..."
docker-compose build --no-cache

echo ""
echo "🚀 Starting all services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy (30 seconds)..."
sleep 30

echo ""
echo "🏥 Checking service health..."

# Check each service
services_healthy=true

if docker-compose ps frontend | grep -q "(healthy)"; then
    echo "✅ Frontend: Running"
else
    echo "❌ Frontend: Not healthy"
    services_healthy=false
fi

if docker-compose ps backend | grep -q "(healthy)"; then
    echo "✅ Backend: Running"
else
    echo "❌ Backend: Not healthy"
    services_healthy=false
fi

if docker-compose ps ai-service | grep -q "(healthy)"; then
    echo "✅ AI Service: Running"
else
    echo "❌ AI Service: Not healthy"
    services_healthy=false
fi

if docker-compose ps orthanc | grep -q "(healthy)"; then
    echo "✅ Orthanc PACS: Running"
else
    echo "❌ Orthanc PACS: Not healthy"
    services_healthy=false
fi

echo ""

if [ "$services_healthy" = true ]; then
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║   🎉 SUCCESS! Your PACS System is Running!                ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "📍 Access your system:"
    echo "   🌐 Main Application: http://localhost:3000"
    echo "   🔧 Backend API: http://localhost:8001"
    echo "   🤖 AI Service: http://localhost:8002"
    echo "   📡 Orthanc PACS: http://localhost:8042"
    echo "      (username: orthanc, password: orthanc)"
    echo ""
    echo "📚 Next Steps:"
    echo "   1. Open http://localhost:3000 in your browser"
    echo "   2. Login with default credentials (admin/admin123)"
    echo "   3. Configure medical machines to send DICOM to port 4242"
    echo "   4. Read DOCKER_SETUP_GUIDE.md for more information"
    echo ""
    echo "🛠️  Management Commands:"
    echo "   Stop:    docker-compose down"
    echo "   Logs:    docker-compose logs -f"
    echo "   Restart: docker-compose restart"
    echo ""
else
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║   ⚠️  Some services are not healthy                        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Please check logs:"
    echo "   docker-compose logs --tail=50"
    echo ""
    echo "Common issues:"
    echo "   - MongoDB connection failed (check MONGODB_URI)"
    echo "   - Cloudinary authentication failed (check credentials)"
    echo "   - Insufficient memory (increase Docker Desktop memory)"
    echo ""
fi

echo "📖 Full documentation: DOCKER_SETUP_GUIDE.md"
echo ""

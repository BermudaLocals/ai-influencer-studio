#!/bin/bash
echo "========================================"
echo "🎭 AI INFLUENCER STUDIO"
echo "========================================"
echo ""

# Navigate to project
cd /root/ai_influencer_studio

# Install dependencies
echo "📦 Installing dependencies..."
pip install -q flask flask-cors numpy

# Start server
echo ""
echo "🚀 Starting server..."
echo "📍 Access at: http://localhost:5000"
echo ""
python app.py

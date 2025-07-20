#!/bin/bash

echo "🏗️  Building ChatUI Desktop App..."

echo "📦 Installing dependencies..."
npm install

echo "🔧 Building frontend..."
cd frontend && npm run build && cd ..

echo "📱 Creating executable..."
npm run dist

echo "✅ Build complete! Check the 'dist' folder for your executable."
echo ""
echo "📁 Available files:"
ls -la dist/ 2>/dev/null || echo "No dist folder found - build may have failed"

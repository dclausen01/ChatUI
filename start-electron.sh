#!/bin/bash

echo "🚀 Starting ChatUI Electron App..."
echo "📦 Building frontend..."
cd frontend && npm run build && cd ..

echo "🖥️  Launching Electron app..."
npm run electron

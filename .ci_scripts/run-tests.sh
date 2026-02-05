#!/bin/bash
set -e

echo "📦 Installing dependencies..."
npm ci

echo "🧪 Running tests..."
npm run test

echo "🔍 Running linting..."
npm run lint

echo "🔍 Running type checks..."
npx tsc --noEmit

echo "✅ All checks passed"

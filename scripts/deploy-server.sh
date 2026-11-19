#!/usr/bin/env bash
set -e

# Change directory to project root
cd "$(dirname "$0")/.."

echo "========================================================"
echo "🚀 DEPLOYING DEBATE GENERATICS 2026 SERVER (MACOS 24/7)"
echo "========================================================"

# 1. Ensure required directories exist
mkdir -p data logs backups

# 2. Sync database schema & generate client
echo "📦 Running Prisma generate & db push..."
npx prisma generate
npx prisma db push

# 3. Build Next.js application
echo "⚡ Building Next.js production build..."
npm run build

# 4. Verify PM2 installation
if command -v pm2 &> /dev/null; then
  PM2_CMD="pm2"
elif [ -f "./node_modules/.bin/pm2" ]; then
  PM2_CMD="./node_modules/.bin/pm2"
else
  echo "🔍 Installing PM2 locally..."
  npm install -D pm2
  PM2_CMD="./node_modules/.bin/pm2"
fi

# 5. Start or reload PM2 process
echo "🔄 Starting or reloading service via PM2..."
$PM2_CMD startOrReload ecosystem.config.js --env production
$PM2_CMD save

echo "========================================================"
echo "✅ SERVER DEPLOYED SUCCESSFULLY!"
echo "📡 Health check: curl -s http://localhost:3000/api/health"
echo "📜 View logs: $PM2_CMD logs debate-generatics-2026"
echo ""
echo "💡 To ensure auto-start on macOS reboot, run:"
echo "   $PM2_CMD startup launchd"
echo "   (and copy-paste the sudo command outputted by PM2)"
echo "========================================================"

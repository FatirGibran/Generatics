#!/usr/bin/env bash

# Change directory to project root
cd "$(dirname "$0")/.."

PORT=${PORT:-3000}

echo "=========================================================="
echo "🛡️  MACOS 24/7 ANTI-SLEEP & PUBLIC TUNNEL EXPOSURE"
echo "=========================================================="

# Check cloudflared availability
if ! command -v cloudflared &> /dev/null; then
  echo "❌ 'cloudflared' command not found."
  echo ""
  echo "Please install cloudflared using Homebrew:"
  echo "   brew install cloudflared"
  echo ""
  echo "Or download standalone binary from Cloudflare:"
  echo "   https://github.com/cloudflare/cloudflared/releases"
  echo "=========================================================="
  exit 1
fi

# Trap termination signals to kill background caffeinate cleanly
cleanup() {
  echo ""
  echo "🛑 Stopping caffeinate and tunnel..."
  if [ -n "$CAFFEINATE_PID" ]; then
    kill "$CAFFEINATE_PID" 2>/dev/null || true
  fi
  echo "👋 macOS normal power management restored."
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Start caffeinate in background to prevent macOS from sleeping
echo "⚡ Activating caffeinate (-dims: display, idle, system, disk awake)..."
caffeinate -dims &
CAFFEINATE_PID=$!
echo "☕ Caffeinate active with PID: $CAFFEINATE_PID (Mac will not sleep)."

echo ""
echo "🌐 Starting Cloudflare Quick Tunnel to http://localhost:${PORT}..."
echo "👉 Look for the 'https://*.trycloudflare.com' URL below to share with participants:"
echo "=========================================================="
echo ""

cloudflared tunnel --url "http://localhost:${PORT}"

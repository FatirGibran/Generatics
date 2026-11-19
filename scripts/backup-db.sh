#!/usr/bin/env bash
set -e

# Change directory to project root
cd "$(dirname "$0")/.."

BACKUP_DIR="./backups"
DB_FILE="./data/generatics.db"
TIMESTAMP=$(date +"%Y%m%d-%H%M")
BACKUP_FILE="${BACKUP_DIR}/generatics-${TIMESTAMP}.db"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_FILE" ]; then
  echo "⚠️ Database file $DB_FILE not found. Nothing to backup."
  exit 0
fi

echo "📦 Creating SQLite backup: $BACKUP_FILE"

# Use sqlite3 online backup if available, otherwise safely copy
if command -v sqlite3 &> /dev/null; then
  sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"
else
  # Force WAL checkpoint before copy if possible
  cp "$DB_FILE" "$BACKUP_FILE"
  if [ -f "${DB_FILE}-wal" ]; then
    cp "${DB_FILE}-wal" "${BACKUP_FILE}-wal" 2>/dev/null || true
  fi
fi

echo "✅ Backup created successfully: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# Prune backups older than 7 days
echo "🧹 Pruning backups older than 7 days..."
find "$BACKUP_DIR" -name "generatics-*.db" -type f -mtime +7 -exec rm -f {} +
find "$BACKUP_DIR" -name "generatics-*.db-wal" -type f -mtime +7 -exec rm -f {} + 2>/dev/null || true

echo "✅ Backup rotation complete."

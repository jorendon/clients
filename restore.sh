#!/bin/bash
# restore.sh
# Restores a SQL dump into the MySQL database.

if [ -z "$1" ]; then
  echo "Usage: ./restore.sh <backup_file.sql>"
  exit 1
fi

FILE="$1"

if [ ! -f "$FILE" ]; then
  echo "Error: File $FILE not found."
  exit 1
fi

echo "Restoring backup from $FILE..."
docker compose exec -T mysql mysql -uclients -pclientssecret clients < "$FILE"

if [ $? -eq 0 ]; then
  echo "Restore successful!"
else
  echo "Restore failed!"
  exit 1
fi

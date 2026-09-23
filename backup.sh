#!/bin/bash
# backup.sh
# Creates a SQL dump of the MySQL database.
# Note: Ensure you have backed up your .env file containing the ENCRYPTION_KEY!

DUMP_DIR="./backups"
mkdir -p "$DUMP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$DUMP_DIR/clients_backup_$TIMESTAMP.sql"

echo "Creating backup..."
docker compose exec mysql mysqldump -uclients -pclientssecret --no-tablespaces clients > "$FILENAME"

if [ $? -eq 0 ]; then
  echo "Backup successful: $FILENAME"
  echo "IMPORTANT: The database identifications are encrypted. You MUST also backup your .env file (specifically ENCRYPTION_KEY and HASH_SALT) to be able to read these backups on a new server."
else
  echo "Backup failed!"
  exit 1
fi

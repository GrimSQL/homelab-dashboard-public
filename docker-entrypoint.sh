#!/bin/sh
set -e

# Sync the Prisma schema with the SQLite file on every container start.
# Idempotent for additive schema changes; creates the DB file on first boot
# if the mounted volume is empty.
./node_modules/.bin/prisma db push --skip-generate --accept-data-loss --schema=./prisma/schema.prisma

exec "$@"

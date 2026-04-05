#!/bin/sh
echo "Waiting for Postgres..."

until pg_isready -h a-mmc-postgres -p 5432 -U postgres; do
  echo "Postgres not ready, retrying in 2s..."
  sleep 2
done

echo "Postgres ready. Starting app..."
exec "$@"
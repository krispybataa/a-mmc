#!/bin/sh
echo "Waiting for Postgres..."

until pg_isready -h $PGHOST -p $PGPORT -U $PGUSER; do
  echo "Postgres not ready, retrying in 2s..."
  sleep 2
done

echo "Postgres ready. Starting app..."
exec "$@"
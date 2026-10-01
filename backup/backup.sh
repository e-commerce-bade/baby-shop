#!/bin/sh
# Nightly logical backup of the shop database: pg_dump, gzip, upload to a private Railway Storage
# Bucket (S3-compatible), prune old copies. Runs as a Railway cron service (root directory /backup).
#
# Railway's managed database backups are a Pro-plan feature, so this stands in for them (the same
# job runs for the digital invitation project, there with Cloudflare R2). A backup job that exits 0
# while producing garbage is worse than no backup at all: it buys false confidence and you only
# learn the truth on the day you need to restore. So every step that could silently produce an
# empty or truncated file is checked, and the job neither uploads nor prunes history unless the new
# dump is provably good.
#
# Restore into an EMPTY database (a fresh Railway Postgres, a local container), with a file
# downloaded from the bucket's Files tab:
#   gzip -dc prod-YYYYMMDD-HHMMSSZ.sql.gz | psql "postgresql://user:password@host:port/database"
# On a server older than Postgres 17 the restore prints one harmless error about
# "transaction_timeout" (a setting newer pg_dump versions write) and carries on.
set -eu

# Connecting the Railway bucket to this service adds its credentials under the bucket's own names
# (BUCKET, ENDPOINT, ACCESS_KEY_ID, SECRET_ACCESS_KEY, REGION); BUCKET_* names win if both are set.
BUCKET_NAME="${BUCKET_NAME:-${BUCKET:-}}"
BUCKET_ENDPOINT="${BUCKET_ENDPOINT:-${ENDPOINT:-}}"
BUCKET_ACCESS_KEY_ID="${BUCKET_ACCESS_KEY_ID:-${ACCESS_KEY_ID:-}}"
BUCKET_SECRET_ACCESS_KEY="${BUCKET_SECRET_ACCESS_KEY:-${SECRET_ACCESS_KEY:-}}"
BUCKET_REGION="${BUCKET_REGION:-${REGION:-auto}}"

: "${DATABASE_URL:?DATABASE_URL is required (the Postgres service's connection string)}"
: "${BUCKET_NAME:?BUCKET is required (connect the Railway bucket to this service)}"
: "${BUCKET_ENDPOINT:?ENDPOINT is required (connect the Railway bucket to this service)}"
: "${BUCKET_ACCESS_KEY_ID:?ACCESS_KEY_ID is required (connect the Railway bucket to this service)}"
: "${BUCKET_SECRET_ACCESS_KEY:?SECRET_ACCESS_KEY is required (connect the Railway bucket to this service)}"

PREFIX="${BACKUP_PREFIX:-prod}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
# The shop database is small (tens to hundreds of KB gzipped). Anything below this means pg_dump
# produced a stub (auth failure, wrong database) and must never be treated as a real backup.
MIN_BYTES="${BACKUP_MIN_BYTES:-10000}"
# The schema has 17 tables (migration V22).
MIN_TABLES="${BACKUP_MIN_TABLES:-15}"

export RCLONE_CONFIG_BUCKET_TYPE=s3
export RCLONE_CONFIG_BUCKET_PROVIDER=Other
export RCLONE_CONFIG_BUCKET_ENDPOINT="$BUCKET_ENDPOINT"
export RCLONE_CONFIG_BUCKET_ACCESS_KEY_ID="$BUCKET_ACCESS_KEY_ID"
export RCLONE_CONFIG_BUCKET_SECRET_ACCESS_KEY="$BUCKET_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_BUCKET_REGION="$BUCKET_REGION"
# Railway buckets use virtual-hosted-style URLs; set BUCKET_FORCE_PATH_STYLE=true only if the
# bucket's Credentials tab asks for path-style.
export RCLONE_CONFIG_BUCKET_FORCE_PATH_STYLE="${BUCKET_FORCE_PATH_STYLE:-false}"
# The bucket already exists; skip the existence probe / create call.
export RCLONE_CONFIG_BUCKET_NO_CHECK_BUCKET=true

TS="$(date -u +%Y%m%d-%H%M%SZ)"
FILE="${PREFIX}-${TS}.sql.gz"
LOCAL="/tmp/${FILE}"
REMOTE="BUCKET:${BUCKET_NAME}/db-backups"

# Railway's private network can need a moment after the container starts; wait up to ~30 s for the
# database instead of failing the night's backup on the first try.
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if pg_isready -q -d "$DATABASE_URL"; then
    break
  fi
  echo "[backup] database not reachable yet (attempt ${attempt}/10), waiting ..."
  sleep 3
done

echo "[backup] ${TS} dumping ..."
# --no-owner/--no-privileges: the dump must restore into ANY empty Postgres without the original
# roles existing.
pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip -9 > "$LOCAL"

SIZE="$(stat -c %s "$LOCAL")"
echo "[backup] compressed size: ${SIZE} bytes"

if [ "$SIZE" -lt "$MIN_BYTES" ]; then
  echo "[backup] FATAL: dump is only ${SIZE} bytes (< ${MIN_BYTES}). Not uploading, not pruning." >&2
  exit 1
fi

# Size alone can be fooled by a dump that carries the schema but lost its data, so assert the
# tables are in there and the catalogue actually has rows.
TABLES="$(gzip -dc "$LOCAL" | grep -c '^CREATE TABLE public\.' || true)"
echo "[backup] tables in dump: ${TABLES}"
if [ "$TABLES" -lt "$MIN_TABLES" ]; then
  echo "[backup] FATAL: only ${TABLES} tables in dump; expected the full schema. Aborting." >&2
  exit 1
fi

PRODUCTS="$(gzip -dc "$LOCAL" | awk '/^COPY public\.products /{f=1; next} f && /^\\\.$/{exit} f{n++} END{print n+0}')"
echo "[backup] product rows in dump: ${PRODUCTS}"
if [ "$PRODUCTS" -lt 1 ]; then
  echo "[backup] FATAL: the dump has no product rows. Aborting." >&2
  exit 1
fi

echo "[backup] uploading -> ${REMOTE}/${FILE}"
rclone copyto "$LOCAL" "${REMOTE}/${FILE}"

# Read the object back. An upload we cannot list is not a backup.
REMOTE_SIZE="$(rclone lsl "$REMOTE" | awk -v f="$FILE" '$NF == f { print $1 }')"
if [ "$REMOTE_SIZE" != "$SIZE" ]; then
  echo "[backup] FATAL: remote size '${REMOTE_SIZE}' != local '${SIZE}'. Aborting before prune." >&2
  exit 1
fi
echo "[backup] upload verified (${SIZE} bytes)"

# Prune ONLY after the new backup is verified, so a broken run can never delete good history.
echo "[backup] pruning copies older than ${RETENTION_DAYS}d ..."
rclone delete --min-age "${RETENTION_DAYS}d" "$REMOTE" || true

echo "[backup] retained:"
rclone lsl "$REMOTE" | sort -k2 | tail -10
echo "[backup] OK"

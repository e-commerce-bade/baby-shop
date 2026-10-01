# Nightly DB backup job (Railway cron service). Runs once, exits; it is not a server.
#
# Base image carries pg_dump. Keep the major version >= the Postgres server being dumped:
# pg_dump refuses to read a server newer than itself.
FROM postgres:18-alpine

# rclone is a single static binary and speaks S3, which is what Railway Storage Buckets expose.
RUN apk add --no-cache curl unzip \
 && curl -fsSL https://downloads.rclone.org/rclone-current-linux-amd64.zip -o /tmp/rclone.zip \
 && unzip -j /tmp/rclone.zip '*/rclone' -d /usr/local/bin \
 && chmod +x /usr/local/bin/rclone \
 && rm /tmp/rclone.zip \
 && apk del unzip

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

ENTRYPOINT ["/usr/local/bin/backup.sh"]

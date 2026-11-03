#!/usr/bin/env bash
# Sao lưu BiHome trên server: Data Pump schema BIHOME + volume tệp tải lên → ~/bihome/backups, giữ KEEP ngày (mặc định 14).
# Cron (user bitrust_pdp):  30 2 * * * ~/bihome/src/deploy/backup.sh >> ~/bihome/backups/backup.log 2>&1
# Khôi phục: xem deploy/README.md.
set -euo pipefail

DIR="$HOME/bihome/backups"
KEEP="${KEEP:-14}"
TS="$(date +%Y%m%d-%H%M)"
mkdir -p "$DIR"
echo "== $(date '+%F %T') sao lưu $TS"

# Chạy trong container Oracle; ORACLE_PASSWORD (SYSTEM) là biến môi trường sẵn có của container, không lộ ra máy chủ.
docker exec -i -e TS="$TS" bihome-oracle bash -s <<'IN'
set -euo pipefail
mkdir -p /opt/oracle/oradata/dpdump
sqlplus -s -L "system/${ORACLE_PASSWORD}@localhost/BIHOMEDB" >/dev/null <<SQL
WHENEVER SQLERROR EXIT FAILURE
CREATE OR REPLACE DIRECTORY BIHOME_DPDUMP AS '/opt/oracle/oradata/dpdump';
EXIT
SQL
expdp "system/${ORACLE_PASSWORD}@localhost/BIHOMEDB" schemas=BIHOME directory=BIHOME_DPDUMP \
  dumpfile="bihome-${TS}.dmp" logfile="bihome-${TS}.log" >/dev/null 2>&1 \
  || { cat "/opt/oracle/oradata/dpdump/bihome-${TS}.log"; exit 1; }
IN

docker cp "bihome-oracle:/opt/oracle/oradata/dpdump/bihome-${TS}.dmp" "$DIR/"
docker exec bihome-oracle rm -f "/opt/oracle/oradata/dpdump/bihome-${TS}.dmp" "/opt/oracle/oradata/dpdump/bihome-${TS}.log"
gzip -f "$DIR/bihome-${TS}.dmp"

docker run --rm --user "$(id -u):$(id -g)" -v bihome-storage:/data:ro -v "$DIR":/backup alpine:3.20 tar czf "/backup/storage-${TS}.tgz" -C /data .

find "$DIR" -maxdepth 1 \( -name 'bihome-*.dmp.gz' -o -name 'storage-*.tgz' \) -mtime +"$KEEP" -delete
ls -lh "$DIR/bihome-${TS}.dmp.gz" "$DIR/storage-${TS}.tgz"

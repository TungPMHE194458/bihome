#!/usr/bin/env bash
# Deploy BiHome lên server: đóng gói mã nguồn → chép lên → build image trên server → khởi động lại → kiểm tra health.
# Chạy từ gốc repo (Git Bash / Linux / macOS), cần SSH vào được server (nên dùng SSH key):
#   deploy/deploy.sh [user@host]
# Rollback về bản trước:  ssh <host> 'cd ~/bihome/src/deploy && BIHOME_TAG=<tag-cũ> docker compose -p bihome \
#   --env-file ~/bihome/.env -f docker-compose.prod.yml up -d --no-build api web'
# (Flyway không lùi migration — chạy deploy/backup.sh trên server trước khi deploy bản có migration mới.)
set -euo pipefail

HOST="${1:-bitrust_pdp@27.72.104.167}"
TAG="$(date +%Y%m%d-%H%M)-$(git rev-parse --short HEAD)"
cd "$(git rev-parse --show-toplevel)"

echo ">> Đóng gói mã nguồn (tag $TAG)"
git ls-files -co --exclude-standard -- backend frontend deploy \
  | grep -vE '^(backend/storage/|frontend/dist/)' \
  | tar czf /tmp/bihome-src.tgz -T -

echo ">> Chép lên $HOST"
scp -q /tmp/bihome-src.tgz "$HOST:~/bihome/bihome-src.tgz"

ssh "$HOST" bash -s -- "$TAG" <<'REMOTE'
set -euo pipefail
TAG="$1"
cd ~/bihome
test -f .env || { echo "Thiếu ~/bihome/.env (xem deploy/.env.example)"; exit 1; }
rm -rf src.new && mkdir src.new && tar xzf bihome-src.tgz -C src.new
rm -rf src && mv src.new src
cd src/deploy
export BIHOME_TAG="$TAG"
docker compose -p bihome --env-file ~/bihome/.env -f docker-compose.prod.yml build
docker compose -p bihome --env-file ~/bihome/.env -f docker-compose.prod.yml up -d
echo "$TAG" >> ~/bihome/deployed-tags.txt
echo ">> Chờ backend healthy..."
for i in $(seq 1 60); do
  s=$(docker inspect -f '{{.State.Health.Status}}' bihome-api 2>/dev/null || true)
  [ "$s" = healthy ] && { echo ">> OK: bihome-api healthy ($TAG)"; exit 0; }
  sleep 5
done
echo ">> bihome-api chưa healthy sau 5 phút — xem: docker logs --tail 200 bihome-api"; exit 1
REMOTE

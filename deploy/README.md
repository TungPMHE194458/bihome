# Triển khai BiHome lên server

Server: `bitrust_pdp@27.72.104.167` (CentOS 7, Docker 26 + Compose v2). **Server này dùng chung với nhiều dự án khác**:
chỉ thao tác với tài nguyên tên `bihome-*`. Không chạy `docker system prune` / `docker image prune -a`, và luôn chạy
`sudo nginx -t` trước khi reload nginx.

```
Internet ─443─> nginx máy chủ (/etc/nginx/conf.d/bihome.bitrust.vn.conf, certbot)
                  └─> 127.0.0.1:18300  bihome-web  (nginx: tệp tĩnh FE + /api/ → bihome-api:8080)
                                         └─> bihome-api (Spring Boot, profile prod) ─> bihome-oracle (Oracle Free 23ai)
Volume: bihome-oracle-data (datafile), bihome-storage (tệp tải lên). Mạng: bihome-net.
```

## Thư mục trên server

| Đường dẫn | Nội dung |
|---|---|
| `~/bihome/.env` | Secret (quyền 600, sinh ngẫu nhiên lúc cài, **không** có trong git). Mẫu: `deploy/.env.example` |
| `~/bihome/src/` | Mã nguồn của lần deploy gần nhất (`backend/`, `frontend/`, `deploy/`) |
| `~/bihome/deployed-tags.txt` | Tag image của từng lần deploy (dùng khi rollback) |
| `~/bihome/backups/` | Bản sao lưu DB + tệp |

## Deploy bản mới

Từ máy dev, ở gốc repo (cần SSH key vào server):

```bash
deploy/deploy.sh                      # mặc định bitrust_pdp@27.72.104.167
```

Script đóng gói `backend/ frontend/ deploy/` (chỉ tệp trong git hoặc chưa bị ignore), chép lên, build image trên server
với tag `yyyyMMdd-HHmm-<commit>`, `up -d`, rồi chờ `bihome-api` healthy. Flyway tự chạy migration mới khi backend khởi
động. **Bản có migration mới: chạy `~/bihome/src/deploy/backup.sh` trước** (migration không lùi được).

Lệnh tay trên server (thư mục `~/bihome/src/deploy`), viết tắt `dc` cho
`docker compose -p bihome --env-file ~/bihome/.env -f docker-compose.prod.yml`:

```bash
dc ps                              # trạng thái
docker logs -f --tail 200 bihome-api
dc restart api
BIHOME_TAG=<tag-cũ> dc up -d --no-build api web     # rollback ứng dụng (DB giữ nguyên)
```

## Dữ liệu mẫu

`.env` đang đặt `BIHOME_FLYWAY_LOCATIONS=classpath:db/migration,classpath:db/seed-local` và `BIHOME_DEMO_IMAGES=true`:
lần chạy đầu nạp dữ liệu mẫu (4 tòa, 34 căn, cư dân giả…) + ảnh demo. Seed là migration lặp (`R__`, dùng MERGE) nên chỉ
chạy lại khi nội dung file đổi. Khi chuyển sang dữ liệu thật: tạo DB mới (xoá volume `bihome-oracle-data` **sau khi
sao lưu**) với hai biến trên về mặc định.

Tài khoản mẫu có mật khẩu công khai trong repo — **đổi ngay sau khi deploy**: `admin` / `Admin@123` (web + app nhân
viên), cư dân `0900000001` / `CuDan@123` (app cư dân).

## Tên miền & HTTPS (một lần)

1. DNS: bản ghi A `bihome.bitrust.vn` → `27.72.104.167`.
2. `sudo cp ~/bihome/src/deploy/nginx-host/bihome.bitrust.vn.conf /etc/nginx/conf.d/ && sudo nginx -t && sudo systemctl reload nginx`
3. `sudo certbot --nginx -d bihome.bitrust.vn` (certbot thêm khối 443 + chuyển hướng 80 → 443).

Đăng nhập web cần HTTPS (cookie refresh token có cờ `Secure`). Trước khi có HTTPS, xem thử qua SSH tunnel:
`ssh -L 18300:127.0.0.1:18300 bitrust_pdp@27.72.104.167` rồi mở http://localhost:18300.

## Sao lưu & khôi phục

`deploy/backup.sh` (cron 02:30 hằng ngày, giữ 14 ngày): `bihome-<ts>.dmp.gz` (Data Pump schema `BIHOME`) +
`storage-<ts>.tgz` (volume tệp). Khôi phục (dừng `api` trước: `dc stop api web`):

```bash
gunzip -k ~/bihome/backups/bihome-<ts>.dmp.gz
docker cp ~/bihome/backups/bihome-<ts>.dmp bihome-oracle:/opt/oracle/oradata/dpdump/
docker exec -it bihome-oracle bash -c 'impdp "system/${ORACLE_PASSWORD}@localhost/BIHOMEDB" schemas=BIHOME \
  directory=BIHOME_DPDUMP dumpfile=bihome-<ts>.dmp table_exists_action=replace'
docker run --rm -v bihome-storage:/data -v ~/bihome/backups:/backup alpine:3.20 \
  sh -c 'rm -rf /data/* && tar xzf /backup/storage-<ts>.tgz -C /data'
dc up -d
```

## App mobile

Đổi `EXPO_PUBLIC_API_URL` trong `mobile/eas.json` và `mobile-staff/eas.json` thành `https://bihome.bitrust.vn` rồi build
lại bằng EAS. Push: đặt `BIHOME_PUSH_ENABLED=true` trong `~/bihome/.env` rồi `dc up -d api`.

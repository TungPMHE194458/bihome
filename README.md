# BiHome — Facility Management System

Hệ thống quản lý vận hành tòa nhà / khu đô thị cho Ban quản lý: tòa nhà, căn hộ, cư dân, xe, thẻ từ, voucher, nhắc nhở,
khảo sát, tiện ích & dịch vụ, yêu cầu hỗ trợ, tài liệu, thông báo phí (số liệu điện nước, đơn giá, phiếu thu, VietQR),
cảnh báo SOS, bảng điều khiển, thông báo và lịch sử hoạt động.

Đặc tả nghiệp vụ: [`docs/SPEC.md`](docs/SPEC.md) · lộ trình theo phase: [`docs/PROMPTS.md`](docs/PROMPTS.md) ·
quy ước code: [`CLAUDE.md`](CLAUDE.md), [`backend/CLAUDE.md`](backend/CLAUDE.md), [`frontend/CLAUDE.md`](frontend/CLAUDE.md).

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Backend | Java 21, Spring Boot 3.5, Spring Security + JWT, Spring Data JPA (Hibernate 6), Flyway, MapStruct, springdoc-openapi, Apache POI (Excel), OpenPDF (PDF), ZXing (QR) |
| Database | Oracle Database Free 23ai (Docker image `gvenzl/oracle-free`), PDB `BIHOMEDB`, schema `BIHOME` |
| Frontend | React 19, TypeScript, Vite, MUI 7, TanStack Query 5, React Router 7, React Hook Form + Zod, MUI X Charts |
| Lưu tệp | Ổ đĩa local `backend/storage/` qua `StorageService` |

## Yêu cầu

- JDK 21, Node.js 20+ và pnpm (`corepack enable`), Docker Desktop (Windows: backend WSL2).
- Khoảng 3 GB RAM trống cho Oracle.

## Chạy local

```bash
# 1. Database — lần đầu mất 1–2 phút để tạo PDB BIHOMEDB và user BIHOME
docker compose up -d oracle
docker compose logs -f oracle          # chờ "DATABASE IS READY TO USE!"

# 2. Backend — http://localhost:8080 (Swagger: http://localhost:8080/swagger-ui.html)
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# 3. Frontend — http://localhost:5173 (Vite proxy /api → :8080)
cd frontend
pnpm install
pnpm dev
```

Profile `local` chạy thêm dữ liệu mẫu (`backend/src/main/resources/db/seed-local`, toàn bộ là dữ liệu giả): 4 tòa nhà,
34 căn hộ, cư dân, xe, thẻ từ, voucher, tiện ích, dịch vụ, đăng ký, yêu cầu hỗ trợ, nhắc nhở, khảo sát, đơn giá và chỉ
số điện / nước 2 kỳ gần nhất của tòa **BiHome Sky Tower (SKY01)**.
Khi khởi động, backend gắn thêm ảnh demo cho tòa nhà, căn hộ, tiện ích, dịch vụ và ảnh đại diện cư dân chưa có ảnh —
tắt bằng `bihome.demo-images.enabled: false`. Ảnh là ảnh chụp từ [Unsplash](https://unsplash.com/license) (dùng miễn
phí, kể cả thương mại) và [randomuser.me](https://randomuser.me) (chân dung cho dữ liệu giả), tải lại bằng
`python backend/tools/download_demo_images.py`.

### Tài khoản mẫu

| Tên đăng nhập | Mật khẩu | Vai trò |
|---|---|---|
| `admin` | `Admin@123` | Admin hệ thống (mọi quyền, mọi tòa) |
| `0900000001` | `CuDan@123` | Cư dân Nguyễn Văn An (căn A0101 SKY01) — đăng nhập **app cư dân** |

Các vai trò có sẵn: Admin hệ thống, Trưởng ban quản lý, Nhân viên vận hành, Kế toán, Cư dân — tạo thêm người dùng ở
**Cài đặt › Người dùng hệ thống** (mật khẩu tạm hiện một lần, đăng nhập lần đầu phải đổi).

### Kết nối database

`jdbc:oracle:thin:@localhost:1521/BIHOMEDB`, user `bihome` / `bihome` (chỉ dùng local).

## Cấu hình

| Biến môi trường | Mặc định local | Ý nghĩa |
|---|---|---|
| `BIHOME_JWT_SECRET` | chuỗi mẫu trong `application-local.yml` | Khoá ký JWT (≥ 32 byte). **Bắt buộc** ở môi trường khác local. |
| `BIHOME_BANK_WEBHOOK_SECRET` | `local-bank-webhook-secret` | Giá trị header `X-Webhook-Secret` của `POST /api/v1/webhooks/bank`. Để trống = từ chối mọi webhook. |

`bihome.bank-webhook.simulation-enabled` chỉ bật ở local / test (nút "Giả lập chuyển khoản" trên trang VietQR).
Email / SMS hiện chỉ ghi log (`LoggingMessageSender`) — thay bằng nhà cung cấp thật khi triển khai.

## Kiểm thử

```bash
# Backend: unit test + integration test (Testcontainers Oracle, cần Docker đang chạy)
cd backend && ./mvnw clean verify

# Frontend
cd frontend && pnpm typecheck && pnpm lint && pnpm test --run
```

Trên máy ít RAM nên tắt container `bihome-oracle` khi chạy `verify` (integration test tự khởi động một Oracle riêng).

## Cấu trúc thư mục

```
bihome/
├── docker-compose.yml            # Oracle Free cho local
├── docs/                         # SPEC.md (đặc tả), PROMPTS.md (lộ trình)
├── backend/                      # Spring Boot (Maven)
│   └── src/main/
│       ├── java/com/bihome/
│       │   ├── common/           # bảo mật, lỗi, phân trang, Excel, PDF, lưu tệp, gửi tin, tiện ích
│       │   ├── auth/ user/       # đăng nhập, người dùng, vai trò & phân quyền, hồ sơ, trang ghim
│       │   ├── building/ apartment/ asset/ resident/ accesscard/ voucher/
│       │   ├── reminder/ survey/ # nhắc nhở, khảo sát
│       │   ├── amenity/ servicecatalog/ booking/ transaction/ amenityreport/
│       │   ├── ticket/ document/
│       │   ├── feerate/ meter/ feenotice/ payment/ vietqr/   # tài chính
│       │   ├── sos/ notification/ audit/ dashboard/ setting/
│       │   ├── residentapp/      # API app cư dân (/api/v1/resident/**), tài khoản app, hộp thư, push
│       └── resources/
│           ├── db/migration/     # Flyway V001…V170 (không sửa file đã chạy)
│           ├── db/seed-local/    # dữ liệu mẫu R__ (chỉ profile local)
│           └── fonts/            # Be Vietnam Pro (SIL OFL) cho PDF
├── frontend/
│   └── src/
│       ├── app/                  # router, theme, providers
│       ├── components/           # DataTable, form, dialog, trạng thái dùng chung
│       ├── features/<module>/    # types, api, hooks, schema, constants, components, pages
│       ├── layouts/              # header (bộ chọn tòa, SOS, thông báo), sidebar (menuConfig)
│       ├── lib/ hooks/ stores/   # http, định dạng, kỳ thu phí, useListParams, Zustand
│       └── pages/                # bảng điều khiển, trang lỗi
└── mobile/                       # app cư dân (Expo / React Native) — xem mobile/README.md
```

## Ghi chú

- Hầu hết dữ liệu thuộc một tòa nhà: frontend gửi header `X-Building-Id` theo tòa đang chọn; backend kiểm tra quyền
  với tòa (bản ghi tòa khác trả 404).
- Lỗi API theo RFC 7807 (`ProblemDetail`), thông báo tiếng Việt; phân trang `page` / `size` (10, 20, 50) / `sort`.
- Windows + Docker Desktop: datafile Oracle phải nằm trên volume (compose đã cấu hình); nếu Docker treo khi tạo
  container, tắt Docker Desktop, chạy `wsl --shutdown` rồi mở lại.

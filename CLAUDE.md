# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# BiHome — Facility Management System

BiHome là hệ thống quản lý vận hành tòa nhà/khu đô thị (Facility Management System) dành cho Ban quản lý:
quản lý tòa nhà, căn hộ, cư dân, tài sản (xe), tiện ích, yêu cầu hỗ trợ, tài liệu và thông báo phí.
Giao diện tham khảo: màn hình "Danh sách tài liệu" (sidebar 2 tầng, header có bộ chọn tòa nhà, bảng có filter theo cột).

> Đặc tả chức năng đầy đủ: `docs/SPEC.md` — ĐỌC phần tương ứng trước khi code bất kỳ module nào.
> Luật nghiệp vụ / chi tiết đã chốt trong code của từng module: `docs/MODULES.md` — ĐỌC mục tương ứng trước khi sửa.
> Lộ trình triển khai theo phase: `docs/PROMPTS.md`. Hạ tầng production / mobile: `docs/MOBILE_PLAN.md`.
> Quy ước chi tiết và các bẫy kỹ thuật từng phía: `backend/CLAUDE.md`, `frontend/CLAUDE.md`, `mobile/CLAUDE.md`,
> `mobile-staff/CLAUDE.md`.

## Trạng thái

- Đã xong Phase 0–16: mọi module trong menu SPEC (trừ mục "Dự án": không làm), app cư dân (`mobile/`) và app nhân viên
  (`mobile-staff/`). Mỗi package backend `com.bihome.<module>` có feature FE cùng tên ở `frontend/src/features/<module>`.
  Migration hiện có: V001–V003, V010–V201.
- Chưa làm: nhà cung cấp email / SMS thật (OTP quên mật khẩu app → liên hệ BQL), danh mục phường/xã theo tỉnh
  (Phường/Xã nhập tay), hạ tầng production (`docs/MOBILE_PLAN.md`).
  - **Nhắc lại sau (2026-10-15, chủ động hoãn theo yêu cầu):** OTP quên mật khẩu qua SMS/email thật — cả web/nhân viên
    (`AuthService.forgotPassword` → `OtpNotifier`) và cư dân (không có OTP, chỉ BQL đặt lại) hiện chỉ có bản ghi log
    (`LoggingOtpNotifier` / `LoggingMessageSender`), chưa nối nhà cung cấp SMS/email thật. Cần hỏi lại nhà cung cấp cụ
    thể (SMTP công ty / Twilio / AWS SES cho email; Viettel / eSMS... cho SMS) và API key trước khi làm.
- Seed local (`backend/src/main/resources/db/seed-local`, chỉ profile `local`): 4 tòa, 34 căn hộ, cư dân, xe, thẻ từ,
  voucher, tiện ích / dịch vụ / đăng ký / giao dịch, yêu cầu, nhắc nhở, khảo sát, đơn giá + tài khoản VietQR giả + chỉ
  số điện / nước 2 kỳ của tòa SKY01 (căn A0203 tăng bất thường), 1 SOS đã xử lý. Danh mục tài liệu / yêu cầu / loại
  dịch vụ mặc định nằm trong migration V050 / V060 / V100 (có ở mọi môi trường).
- Môi trường demo đang chạy ở `bihome.bitrust.vn` (server `bitrust_pdp@27.72.104.167`, dùng chung với dự án khác —
  chỉ đụng tài nguyên `bihome-*`): profile `prod` + dữ liệu mẫu + ảnh demo, sao lưu cron 02:30. Quy trình ở
  `deploy/README.md`.
- `bihome-claude-md.zip` chỉ là bản lưu các file tài liệu, có thể bỏ qua.

## Cấu trúc repo (monorepo)

```
bihome/
├── docker-compose.yml      # Oracle Free (BIHOMEDB) cho local
├── deploy/                 # triển khai server (compose prod, deploy.sh, backup.sh) — xem deploy/README.md
├── docs/                   # SPEC.md (đặc tả), MODULES.md (ghi chú theo module), PROMPTS.md, MOBILE_PLAN.md
├── backend/                # Spring Boot (Java 21, Maven) — API cho web, app nhân viên và app cư dân
├── frontend/               # React + TypeScript + Vite + MUI (web BQL), pnpm
├── mobile/                 # App cư dân (Expo SDK 57, npm) — gọi /api/v1/resident/**
└── mobile-staff/           # App nhân viên "BiHome Quản lý" (Expo SDK 57, npm) — gọi API BQL /api/v1/**
```

## Tech stack

| Phần | Công nghệ |
|---|---|
| Backend | Java 21, Spring Boot 3.5.x, Spring Security 6 + JWT, Spring Data JPA (Hibernate 6), Flyway, MapStruct, Lombok, springdoc-openapi, Apache POI, OpenPDF, ZXing |
| Database | Oracle Database Free 23ai (container `gvenzl/oracle-free`), PDB/service `BIHOMEDB`, schema `BIHOME` |
| Frontend | React 19, TypeScript (strict), Vite, MUI v7, TanStack Query v5, React Router v7, React Hook Form + Zod 4, Axios, Zustand, dayjs |
| Mobile | Expo SDK 57 + Expo Router, build bằng EAS |
| Lưu file | Local disk `backend/storage/` qua interface `StorageService` (sau này đổi sang MinIO/S3) |

## Chạy local & lệnh thường dùng

```bash
# 1. Database (lần đầu mất ~1-2 phút để khởi tạo PDB BIHOMEDB + user BIHOME)
docker compose up -d oracle
docker compose logs -f oracle          # chờ "DATABASE IS READY TO USE!"

# 2. Backend — http://localhost:8080, Swagger: http://localhost:8080/swagger-ui.html
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# 3. Frontend — http://localhost:5173 (Vite proxy /api -> :8080)
cd frontend && pnpm install && pnpm dev

# 4. Mobile (npm, không pnpm) — bản web: mobile cổng 8081, mobile-staff cổng 8082 (đã có trong CORS local)
cd mobile && npm install && npm run web
```

Kiểm tra trước khi coi là xong:

```bash
cd backend  && ./mvnw clean verify                         # unit (surefire) + *IT (failsafe, Testcontainers — cần Docker)
cd frontend && pnpm typecheck && pnpm lint && pnpm test --run
cd mobile   && npm run typecheck && npm run lint && npx expo-doctor   # tương tự cho mobile-staff
```

Chạy riêng 1 test:

```bash
cd backend && ./mvnw test -Dtest=BuildingServiceTest
cd backend && ./mvnw verify -Dit.test=BuildingControllerIT -Dtest=none -Dsurefire.failIfNoSpecifiedTests=false
cd frontend && pnpm test --run src/features/building/schema.test.ts     # hoặc -t "<tên test>"
```

DB local: `jdbc:oracle:thin:@localhost:1521/BIHOMEDB`, user `bihome` / `bihome`.
Tài khoản seed: `admin` / `Admin@123` (Admin hệ thống — web và app nhân viên); cư dân `0900000001` / `CuDan@123`
(CD000001 Nguyễn Văn An — app cư dân).

## Kiến trúc xuyên suốt

Những phần sau trải qua nhiều module; chi tiết từng module ở `docs/MODULES.md`.

- **Ngữ cảnh tòa nhà**: hầu hết dữ liệu thuộc 1 tòa (`BuildingScopedEntity`, cột `BUILDING_ID`). FE gửi header
  `X-Building-Id` theo tòa đang chọn; `BuildingContext` kiểm tra user được gán tòa (Admin hệ thống bỏ qua). Phạm vi danh
  sách: `buildingId` trong filter → tòa đang chọn → mọi tòa được truy cập ("Tất cả"), qua
  `BuildingService.listScope(buildingId)`; xem bản ghi tòa khác → 404 (`canAccess`), tạo mới vào
  `BuildingContext.requireBuildingId()` (tòa phải hoạt động — `requireActive`), không đổi tòa sau khi tạo. Bản ghi gắn
  căn hộ kiểm tra bằng `ApartmentService.requireAccessible(id)`; chọn căn qua `GET /apartments/options` + FE
  `ApartmentPicker`. Danh mục
  dùng chung mọi tòa (danh mục tài liệu / yêu cầu, loại dịch vụ) và màn hình Tòa nhà gọi với `skipBuildingContext`.
  **Module mẫu để bắt chước (full-stack): `backend/.../apartment/*` + `frontend/src/features/apartment/*`.**
- **Phân quyền**: permission `{MODULE}_{READ|WRITE|DELETE|EXPORT}`, `@PreAuthorize` ở controller, `<Can>` ở FE. Mọi
  permission của mọi module SPEC đã seed ở V001 → module mới không seed lại. SUPER_ADMIN không có dòng
  ROLE_PERMISSION mà được cấp **mọi** permission khi nạp `AuthUser`. `AuthUser` nạp lại từ DB mỗi request (khoá user /
  đổi quyền có hiệu lực ngay); lấy qua `@AuthenticationPrincipal AuthUser` hoặc `CurrentUser`. User có
  `mustChangePassword` chỉ gọi được `/api/v1/auth/**` (403 `PASSWORD_CHANGE_REQUIRED`).
- **Ba loại client, hai chuỗi bảo mật**:
  - Web BQL: access token JWT trong body, refresh token trong cookie HttpOnly.
  - App nhân viên: cùng API BQL, gửi `X-Client-Type: mobile` để nhận `refreshToken` trong body, rồi gửi lại qua header
    `X-Refresh-Token`.
  - App cư dân: chuỗi riêng `ResidentSecurityConfig` (`/api/v1/resident/**`, JWT `typ=resident`, không dùng chéo được
    với token BQL). Principal là `AuthUser` giả của cư dân để gọi lại service của module với nguyên luật nghiệp vụ.
- **Lịch sử hoạt động**: entity có `@AuditTrail` được ghi tự động vào `AUDIT_LOG` trước commit (cùng transaction) bởi
  `audit/AuditEventListener`. Entity mới cần lịch sử chỉ cần thêm annotation; cập nhật bằng JPQL bulk không được ghi.
- **Thông báo / hộp thư / push**: nhân viên nhận `NotificationService.notify` (bỏ qua chính người thao tác, push sau
  commit); cư dân nhận `ResidentInboxService.toApartment/toBuilding/toResidents`. Push đi qua `residentapp/PushSender`
  (Expo Push, tắt mặc định bởi `bihome.resident-app.push-enabled`). Email / SMS qua `common/messaging/MessageSender` —
  hiện chỉ có `LoggingMessageSender` (ghi log).
- **Tệp**: tải lên `POST /files` (theo `purpose`) rồi gửi `fileId`; entity tham chiếu bằng FK tới `FILE_ATTACHMENT`.
  `GET /files/{id}` qua `FileAccessPolicy` (tệp đã gắn → theo tòa của bản ghi chứa nó, tìm bằng UNION các bảng tham
  chiếu đọc từ từ điển dữ liệu qua `FileReferences`); `OrphanFileCleanupJob` (03:00) xoá tệp không ai tham chiếu quá
  24 giờ. Module mới chỉ cần FK tới `FILE_ATTACHMENT` là được tính vào cả hai.
- **Tiền**: mọi khoản thu (đăng ký tiện ích, đơn dịch vụ, cấp thẻ, thông báo phí) đi qua `transaction/TransactionService`
  (bảng `FINANCIAL_TRANSACTION`, mỗi nguồn tối đa một giao dịch). Giao dịch PENDING được gộp vào thông báo phí kỳ tới.
- **Mã tự sinh** `XX-yyMMdd-xxx` (`YC`, `DK`, `DV`, `GD`, `TB`, `PT`, `KK`, `SOS`, `TL`, `SP`...): luôn qua
  `common/util/DailyCodeGenerator` (bảng `CODE_COUNTER`; quy chuẩn ở SPEC mục 1.5).
- **Job định kỳ**: `@Scheduled(..., zone = "Asia/Ho_Chi_Minh")`, bật bởi `SchedulingConfig`; integration test tắt bằng
  `bihome.scheduling.enabled=false` (đặt trong `AbstractIT`).
- **Cấu hình chung**: bảng một dòng `SYSTEM_SETTING`, đọc qua `setting/SettingService.current()` (cache trong bộ nhớ).

## Quy ước chung (áp dụng cả BE và FE)

- **Ngôn ngữ**: code, tên bảng/cột, enum, API path bằng tiếng Anh. Nhãn hiển thị, thông báo lỗi trả về người dùng,
  comment nghiệp vụ bằng tiếng Việt.
- **API**: prefix `/api/v1`, REST, JSON camelCase. Lỗi trả về dạng RFC 7807 `ProblemDetail` (xem `backend/CLAUDE.md`).
- **Phân trang**: request `page` (bắt đầu từ 0), `size` (10/20/50 — kể cả app mobile), `sort=field,asc|desc`. Response
  `PageResponse<T>` gồm `content, page, size, totalElements, totalPages`.
- **Ngày giờ**: API dùng ISO-8601 (`2026-10-02T10:51:00+07:00`), DB lưu `TIMESTAMP WITH TIME ZONE`, UI hiển thị
  `DD/MM/YYYY HH:mm`. Múi giờ mặc định `Asia/Ho_Chi_Minh`. Kỳ thu phí là chuỗi `yyyy-MM`.
- **Enum**: lưu mã tiếng Anh (`ACTIVE`, `INACTIVE`, `RENT`, `OWN`...). Nhãn tiếng Việt chỉ nằm ở FE (`constants.ts` của
  từng feature) — ngoại lệ: nhãn trong file Excel / PDF nằm ở backend.
- **Audit**: mọi bảng nghiệp vụ có `CREATED_AT, UPDATED_AT, CREATED_BY, UPDATED_BY, VERSION`.
- **Xoá**: mặc định chặn xoá cứng khi còn dữ liệu phụ thuộc (409); ưu tiên chuyển trạng thái `INACTIVE`. Chỉ xoá cứng
  khi SPEC nói rõ.

## Quy trình làm việc với Claude Code

1. Trước khi code một module: đọc mục tương ứng trong `docs/SPEC.md` và `docs/MODULES.md`, liệt kê kế hoạch (migration
   → entity → API → FE) và chờ xác nhận nếu thay đổi lớn.
2. Làm theo chiều dọc từng module: migration Flyway → entity/repository → service + test → controller → cập nhật
   Swagger → FE types/api/hooks → trang list/grid → form dialog.
3. Chạy các lệnh kiểm tra ở mục trên cho phần đã sửa.
4. Thêm luật nghiệp vụ / quyết định mới không suy ra được từ code thì ghi vào `docs/MODULES.md` (theo module), bẫy kỹ
   thuật chung thì vào `backend/CLAUDE.md` / `frontend/CLAUDE.md` — không dồn vào file này.
5. Commit theo Conventional Commits: `feat(building): ...`, `fix(auth): ...`, `chore(db): ...`.

## Definition of Done cho một module

- [ ] Migration Flyway mới (không sửa migration đã chạy), có index cho cột filter/unique.
- [ ] API CRUD + list có filter/phân trang/sắp xếp, validate đầu vào, phân quyền `@PreAuthorize`.
- [ ] Test service (unit) + ít nhất 1 integration test controller.
- [ ] FE: trang danh sách (list và grid nếu SPEC yêu cầu), filter theo cột, form thêm/sửa, xác nhận xoá, toast thông
  báo, trạng thái loading/empty/error.
- [ ] Menu sidebar + breadcrumb + route đã đăng ký.

## KHÔNG được làm

- Không dùng `spring.jpa.hibernate.ddl-auto=update/create` — schema chỉ thay đổi qua Flyway.
- Không sửa file migration đã commit; luôn tạo version mới. Không đổi tên file seed `R__` đã chạy.
- Không đặt tên bảng/cột trùng từ khoá Oracle: `USER, LEVEL, SIZE, FILE, COMMENT, ACCESS, MODE, NUMBER, DATE, UID,
  ORDER, GROUP, TRANSACTION` (dùng `APP_USER`, `FLOOR_NO`, `FILE_SIZE`, `FILE_ATTACHMENT`, `NOTE`,
  `FINANCIAL_TRANSACTION`...).
- Không commit secret, file `.env`, thư mục `storage/`, dữ liệu thật của cư dân.
- Không sao chép logo/nhận diện thương hiệu của sản phẩm tham khảo; dùng logo và màu của BiHome.

## Lưu ý môi trường (Windows + Docker Desktop/WSL2)

- Oracle với datafile nằm trên overlayfs của container làm **crash cả Docker VM** lúc mở DB (mọi container chết với
  exit 255). Luôn đặt `/opt/oracle/oradata` trên volume — compose đã có; `AbstractIT` mount volume ẩn danh. Nếu engine
  bị treo (502 khi tạo container): tắt Docker Desktop, `wsl --shutdown`, mở lại.
- Máy dev ít bộ nhớ commit: JVM của Maven giới hạn ở `backend/.mvn/jvm.config`, JVM chạy test ở `<argLine>` trong
  `pom.xml`. Nên tắt container `bihome-oracle` khi chạy `verify` (hai Oracle cùng lúc từng làm sập Docker VM).
- Docker 29 yêu cầu API ≥ 1.40 → `pom.xml` ghim `testcontainers.version` 1.21.4 (bản 1.21.3 mà Boot quản lý không kết
  nối được).
- Test báo "Unresolved compilation problems" khi chạy `verify` không `clean`: trình biên dịch Java của IDE đã ghi đè
  class trong `target` — chạy lại với `clean`.
- Nếu `clean` báo không xoá được `target/failsafe-reports`: có shell đang đứng trong thư mục đó; nếu sau sự cố máy báo
  "cannot access <class>" khi biên dịch thì xoá hẳn `backend/target` rồi build lại.
- `pnpm` 12 đọc cấu hình build script từ `frontend/pnpm-workspace.yaml` (`allowBuilds`), không đọc field `pnpm` trong
  `package.json`.

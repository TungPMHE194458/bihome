# BiHome — Prompt theo phase cho Claude Code

Cách dùng: mở Claude Code ở thư mục gốc `bihome/`, dán lần lượt từng prompt. Chỉ chuyển phase khi tiêu chí "Hoàn thành khi" đạt.
Mỗi prompt đều ngầm hiểu: tuân thủ `CLAUDE.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md` và đọc mục tương ứng trong `docs/SPEC.md`.

---

## Phase 0 — Khởi tạo monorepo

```
Khởi tạo dự án BiHome theo CLAUDE.md:
1. Tạo docker-compose.yml với Oracle Free (PDB BIHOMEDB, user bihome/bihome) như mẫu trong CLAUDE.md.
2. backend/: Spring Boot 3.5.x, Java 21, Maven wrapper, groupId com.bihome, đủ dependency trong backend/CLAUDE.md,
   profile local (application-local.yml), Flyway bật, ddl-auto=validate, actuator health, springdoc.
3. frontend/: Vite + React 19 + TypeScript strict, cài đủ thư viện trong frontend/CLAUDE.md, ESLint + Prettier,
   alias "@/" -> src, proxy /api -> http://localhost:8080, script typecheck/lint/test/gen:api.
4. .gitignore cho cả hai (storage/, .env, node_modules, target).
Lên kế hoạch trước, sau đó thực hiện.
```
Hoàn thành khi: `docker compose up -d oracle` chạy; BE start được và `/actuator/health` = UP; FE `pnpm dev` hiện trang trắng không lỗi.

## Phase 1 — Nền tảng backend

```
Xây dựng phần common của backend theo backend/CLAUDE.md:
- BaseEntity, BuildingScopedEntity, JPA auditing (AuditorAware lấy username từ SecurityContext).
- PageResponse, PageRequest params, SpecificationBuilder tiện dụng (like không phân biệt hoa thường, eq, in, between ngày).
- GlobalExceptionHandler trả ProblemDetail (code, detail tiếng Việt, errors[] cho validate), BusinessException, NotFoundException, ErrorCode enum.
- StorageService + LocalStorageService, bảng FILE_ATTACHMENT (migration V002), FileController upload/download, kiểm tra MIME bằng magic bytes.
- Cấu hình OpenAPI có Bearer auth, CORS cho localhost:5173, Jackson OffsetDateTime ISO, timezone Asia/Ho_Chi_Minh.
- AbstractIT dùng Testcontainers gvenzl/oracle-free.
Viết test cho exception handler và storage.
```

## Phase 2 — Authentication + User/Profile

```
Triển khai docs/SPEC.md mục 2 và 3 (backend):
- Migration V001__init_auth.sql: APP_USER, USER_PROFILE (1-1, PK=FK USER_ID), ROLE, PERMISSION, ROLE_PERMISSION, USER_ROLE,
  USER_BUILDING (FK BUILDING tạo sau ở V010 — dùng migration bổ sung FK), REFRESH_TOKEN (lưu hash), PASSWORD_RESET_OTP, LOGIN_HISTORY.
- Seed local: các role, permission cho mọi module trong SPEC, user admin/Admin@123 (SUPER_ADMIN) có profile "Hân - Admin hệ thống".
- JWT access 15 phút, refresh 7 ngày qua cookie HttpOnly, rotate + phát hiện reuse, khoá 15 phút sau 5 lần sai.
- API: /auth/login, refresh, logout, forgot-password (local log OTP), reset-password, change-password, /auth/me.
- API /users (CRUD, gán role, gán tòa nhà, khoá/mở khoá, reset mật khẩu) chỉ SUPER_ADMIN; /profile (GET/PUT, đổi avatar).
- BuildingContext filter đọc X-Building-Id.
Test: login đúng/sai, khoá tài khoản, refresh rotate, reuse bị thu hồi, /auth/me.
```

## Phase 3 — Nền tảng frontend (layout giống ảnh tham khảo)

```
Triển khai frontend nền tảng theo frontend/CLAUDE.md mục "Giao diện":
- theme.ts (xanh lá chủ đạo, font Be Vietnam Pro), providers, router với meta breadcrumb + permission.
- http.ts: axios + interceptor Bearer + X-Building-Id + refresh single-flight; authStore, buildingStore, uiStore.
- Trang Đăng nhập, Quên mật khẩu, Đặt lại mật khẩu; ProtectedRoute; trang 403/404.
- MainLayout: Header (logo BiHome, Bảng điều khiển, ⊕, chuông, lịch sử, SOS, BuildingSelector, UserMenu) và
  Sidebar 2 tầng (icon rail + menu panel) với cây menu đúng docs/SPEC.md mục 1.3, mục chưa làm trỏ tới trang "Đang phát triển".
- Component dùng chung: ListPageLayout, PageBreadcrumb (có icon ghim + lịch sử), ListToolbar (ViewModeToggle, nút lọc nâng cao,
  select filter có label nổi, ô Tìm kiếm..., nút "+ Thêm Mới"), DataTable với hàng filter theo cột (text/select/dateRange),
  cột Tác vụ ⋮ RowActionMenu, phân trang "Số hàng mỗi trang" + "1–10 trong N", CardGrid, FormDialog, ConfirmDialog,
  StatusChip, EmptyState, FileIcon, FormImageUpload, FormFileUpload.
- Hook useListParams đồng bộ filter/page/size/sort/view với URL search params.
- Trang Hồ sơ cá nhân và Đổi mật khẩu.
Viết test cho DataTable (filter cột, phân trang) và FormDialog.
```
Hoàn thành khi: đăng nhập admin, thấy layout giống ảnh, đổi tòa nhà ở header, sidebar mở/đóng nhóm và highlight đúng route.

---

## Mẫu prompt cho mỗi module nghiệp vụ

Dùng mẫu này cho Phase 4 trở đi, thay `{...}`:

```
Triển khai module {TÊN MODULE} theo docs/SPEC.md mục {SỐ MỤC}, làm full-stack theo chiều dọc:
Backend:
1. Migration V{NNN}__{module}.sql: bảng, FK có index, UNIQUE, CHECK enum, comment cột tiếng Việt, seed permission.
2. Entity/Repository/Specifications/DTO/Mapper/Service/Controller; list có filter theo TẤT CẢ cột đánh dấu [F],
   sort theo cột [S], endpoint /options, {export/import Excel nếu SPEC có}.
3. Rule nghiệp vụ: {liệt kê lại quy tắc trong SPEC}.
4. Unit test service + integration test (tạo, trùng mã 409, filter, chặn truy cập tòa khác).
Frontend:
5. features/{module}: types, api, hooks, schema (Zod, lỗi tiếng Việt), constants (nhãn + màu chip).
6. Trang danh sách dùng ListPageLayout + DataTable, {chế độ lưới CardGrid nếu SPEC có}, filter cột, tìm kiếm, phân trang URL.
7. FormDialog thêm/sửa, ConfirmDialog xoá, đổi trạng thái, {upload ảnh nếu có}, trang chi tiết nếu SPEC có.
8. Đăng ký route, menu, breadcrumb, permission.
Cuối cùng chạy ./mvnw clean verify và pnpm typecheck && pnpm lint && pnpm test --run, sửa đến khi xanh.
```

## Phase 4 → 15 (thứ tự đề xuất)

| Phase | Module | SPEC | Ghi chú riêng thêm vào prompt |
|---|---|---|---|
| 4 | Tòa nhà | 4.1 | Có chế độ lưới, nhiều ảnh + ảnh đại diện, Số lượng căn hộ tính bằng subquery, không bị lọc theo X-Building-Id, bổ sung FK USER_BUILDING → BUILDING |
| 5 | Căn hộ | 4.2 | Lưới + ảnh, import/export Excel, trang chi tiết có tab (tab nào chưa có module thì để trống) |
| 6 | Hạng mục căn hộ | 4.3 | 1 trang 2 tab Danh mục/Hạng mục (tab lưu trong URL `?tab=`), chuẩn hoá biển số |
| 7 | Cư dân | 4.4 | Lưới + avatar, bảng APARTMENT_RESIDENT, 1 chủ hộ chính/căn, chức năng Chuyển đi, che số giấy tờ |
| 8 | Tài liệu + Danh mục tài liệu | 7 | Bám sát ảnh tham khảo: icon loại file ở cột Mã, chip Danh mục, select "Đối tượng", xem trước PDF/ảnh, lưu phiên bản |
| 9 | Yêu cầu & hỗ trợ | 6 | View Danh sách/Kanban (kéo thả đổi trạng thái theo state machine), SLA, timeline bình luận |
| 10 | Thẻ từ, Voucher | 4.6, 4.5 | Lịch sử trạng thái thẻ; liên kết thẻ với Hạng mục xe ở 4.3 |
| 11 | Danh mục & Cấu hình tiện ích, Loại dịch vụ, Dịch vụ | 5.1, 5.2, 5.4, 5.5 | Editor khung giờ theo thứ trong tuần |
| 12 | Đăng ký tiện ích, Lịch sử giao dịch, Báo cáo tiện ích | 5.3, 5.6, 5.7 | View Lịch tuần; kiểm tra sức chứa đồng thời bằng khoá bi quan (SELECT ... FOR UPDATE) |
| 13 | Nhắc nhở, Khảo sát ý kiến | 4.7, 4.8 | @Scheduled job; trình tạo câu hỏi kéo thả; trang kết quả có biểu đồ |
| 14 | Tài chính: Số liệu, Đơn giá, Thông báo phí, Thanh toán, VietQR | 8 | Tạo hàng loạt có bước xem trước; sinh chuỗi VietQR EMVCo + CRC16; webhook giả lập; PDF thông báo phí |
| 15 | Dashboard, Thông báo, Lịch sử hoạt động, SOS, Ghim trang | 9, 10 | AUDIT_LOG qua EntityListener/AOP; polling 30s |

## Phase 16 — Hoàn thiện

```
Rà soát toàn hệ thống:
- Chạy lại toàn bộ test, bổ sung test còn thiếu cho rule nghiệp vụ quan trọng (tiền, SLA, booking trùng).
- Kiểm tra N+1 ở các API list (bật hibernate statistics ở profile local), thêm index còn thiếu.
- Kiểm tra mọi endpoint building-scoped đều chặn truy cập chéo tòa nhà.
- Chuẩn hoá thông báo lỗi tiếng Việt, empty state, loading skeleton trên mọi trang.
- Viết README.md: cài đặt, chạy local, tài khoản seed, cấu trúc thư mục.
Báo cáo danh sách vấn đề tìm được trước khi sửa.
```

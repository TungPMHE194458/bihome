# BiHome Frontend — React + TypeScript

Đọc `../CLAUDE.md` trước (quy ước chung), và `../docs/SPEC.md` cho nghiệp vụ/màn hình.

## Lệnh thường dùng

```bash
pnpm dev            # http://localhost:5173, proxy /api -> http://localhost:8080
pnpm build
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint
pnpm test --run     # vitest + testing-library
pnpm gen:api        # openapi-typescript http://localhost:8080/v3/api-docs -> src/lib/api-schema.d.ts
```

## Stack

React 19, TypeScript strict, Vite, MUI v7 (`@mui/material`, `@mui/icons-material`, `@mui/x-date-pickers`),
TanStack Query v5, React Router v7 (data router), React Hook Form + Zod (`@hookform/resolvers`),
Axios, Zustand, dayjs (locale `vi`), notistack (toast), Vitest + Testing Library, ESLint + Prettier.

## Cấu trúc thư mục

```
src/
├── app/
│   ├── router.tsx            # khai báo route + breadcrumb meta + permission
│   ├── providers.tsx         # QueryClient, Theme, Snackbar, LocalizationProvider(vi)
│   └── theme.ts              # token màu, typography, override component MUI
├── layouts/
│   ├── MainLayout.tsx        # Header + Sidebar + vùng nội dung
│   ├── Header/               # Logo, DashboardLink, QuickCreate, Notification, ActivityHistory, SosButton, BuildingSelector, UserMenu
│   ├── Sidebar/              # IconRail + MenuPanel, cấu hình menu ở menuConfig.ts
│   └── AuthLayout.tsx        # trang đăng nhập/quên mật khẩu
├── components/               # component dùng chung, KHÔNG chứa logic nghiệp vụ
│   ├── ListPage/             # ListPageLayout, PageBreadcrumb, ListToolbar, ViewModeToggle
│   ├── DataTable/            # DataTable, ColumnFilter (text/select/dateRange), RowActionMenu
│   ├── CardGrid/             # lưới thẻ có ảnh cho chế độ xem "lưới"
│   ├── form/                 # RHF wrappers: FormTextField, FormSelect, FormDatePicker, FormImageUpload, FormFileUpload
│   ├── FormDialog.tsx, ConfirmDialog.tsx, StatusChip.tsx, EmptyState.tsx, FileIcon.tsx
├── features/<module>/        # building, apartment, asset, resident, document, ticket, amenity, billing...
│   ├── api.ts                # gọi axios, chỉ ở đây
│   ├── hooks.ts              # useXxxList, useXxx, useCreateXxx... (TanStack Query) + queryKeys
│   ├── types.ts              # khớp DTO backend
│   ├── schema.ts             # Zod schema cho form
│   ├── constants.ts          # enum -> nhãn tiếng Việt + màu chip
│   ├── pages/XxxListPage.tsx, XxxDetailPage.tsx
│   └── components/XxxFormDialog.tsx, XxxCard.tsx, XxxFilters.tsx
├── lib/
│   ├── http.ts               # axios instance, interceptor gắn token + X-Building-Id, refresh token
│   ├── queryClient.ts
│   └── format.ts             # formatDateTime (DD/MM/YYYY HH:mm), formatFileSize, formatCurrency (VND)
├── stores/
│   ├── authStore.ts          # accessToken (memory), currentUser, permissions
│   ├── buildingStore.ts      # tòa nhà đang chọn (persist localStorage)
│   └── uiStore.ts            # sidebar thu gọn, menu đang mở, trang đã ghim
└── main.tsx
```

## Quy tắc code

- Component chỉ dùng hook trong `features/*/hooks.ts`; không gọi axios trực tiếp trong component.
- Query key factory mỗi feature: `buildingKeys.all / list(params) / detail(id)`; mutation thành công → `invalidateQueries(buildingKeys.all)` + toast.
- Trạng thái filter, phân trang, sắp xếp, chế độ xem (`view=list|grid`) đặt trong **URL search params** để reload/chia sẻ link vẫn giữ nguyên. Ô text filter debounce 400ms.
- Form: React Hook Form + Zod; thông báo lỗi tiếng Việt; lỗi `errors[]` từ ProblemDetail map ngược vào field bằng `setError`.
- Types: ưu tiên sinh từ OpenAPI (`pnpm gen:api`) rồi re-export trong `types.ts`.
- Phân quyền UI: `<Can permission="BUILDING_WRITE">` ẩn nút; route có `meta.permission`, thiếu quyền → trang 403.
- Không dùng `any`. Không inline style dài — dùng `sx` ngắn hoặc `styled`.
- Mọi text tiếng Việt có dấu đầy đủ. Ngày giờ luôn qua `format.ts`.

## Auth & HTTP

- `POST /auth/login` → lưu accessToken trong memory (Zustand, không persist); refresh token nằm trong cookie HttpOnly do BE set (`withCredentials: true`).
- Khi app khởi động: gọi `/auth/refresh` để lấy lại access token; thất bại → về `/login`.
- Interceptor 401: chỉ chạy 1 request refresh tại một thời điểm (single-flight), các request khác xếp hàng chờ rồi retry.
- Interceptor request gắn `Authorization: Bearer` và `X-Building-Id` (bỏ qua khi đang ở chế độ "Tất cả").

## Giao diện (bám theo ảnh tham khảo)

### Theme
- Primary xanh lá (đặt trong `theme.ts`, ví dụ `#1F9D55`, light `#E8F5EC` cho nền mục đang mở), text chính `#1F2937`, viền `#E5E7EB`, nền toolbar `#F4F6F8`, nền trang `#FFFFFF`.
- Font: `"Be Vietnam Pro", "Roboto", sans-serif` (hỗ trợ tiếng Việt tốt). Cỡ chữ bảng 14px.
- Border radius 8 (nút, input), 12 (card).

### Header (cao ~76px, nền trắng, có bóng mờ dưới)
Trái → phải: Logo BiHome + tagline "Facility Management System" · link "Bảng điều khiển" + icon lưới ·
icon ⊕ (tạo nhanh) · chuông thông báo (badge chấm đỏ) · lịch sử hoạt động (badge) · nút **SOS** đỏ (badge khi có cảnh báo) ·
**BuildingSelector**: tên tòa nhà đậm + địa chỉ rút gọn (ellipsis), avatar vuông bo góc, click mở dropdown tìm/chọn tòa nhà ·
**UserMenu**: avatar tròn, tên + vai trò ("Admin hệ thống"), mũi tên ▾ → Hồ sơ cá nhân, Đổi mật khẩu, Đăng xuất.

### Sidebar (2 tầng)
- Icon rail bên trái rộng ~60px: Bảng điều khiển, Vận hành (home), Tài chính/khác, Cài đặt; mục đang chọn có nền xanh nhạt; dưới cùng nút ☰.
- Menu panel ~235px, cuộn độc lập, nút "‹" thu gọn ở góc trên phải.
- Nhãn nhóm lớn: **Vận hành**, **Tài chính** (chữ đậm, không icon).
- Mục cấp 1 (có icon + chevron ▴/▾): khi mở → nền xanh nhạt, chữ xanh đậm.
- Mục cấp 2: bullet "•", thụt lề, có đường kẻ dọc mảnh bên trái; mục đang active chữ xanh đậm + bullet xanh.
- Cấu hình trong `menuConfig.ts` (label, icon, path, permission, children) — xem cây menu ở `docs/SPEC.md` mục 1.3.

### Trang danh sách (`ListPageLayout`) — chuẩn cho MỌI module
1. Breadcrumb: "Trang chủ › Danh sách {đối tượng}" (Trang chủ màu xanh, link). Bên dưới 2 icon nhỏ tròn: 📌 ghim trang (vào truy cập nhanh ở Bảng điều khiển) và ⟲ lịch sử thay đổi.
2. Góc phải trên: chip viền "Tất cả" (bỏ lọc nhanh / xem mọi tòa nhà nếu có quyền).
3. Card trắng viền mảnh chứa:
   - **Toolbar** nền xám nhạt bo góc: nút icon ⇆ (chuyển list/lưới — chỉ hiện khi module có chế độ lưới), nút icon bộ lọc nâng cao/tuỳ chọn cột, Select outlined có label nổi (ví dụ "Đối tượng", "Loại", "Trạng thái"); bên phải ô **Tìm kiếm...** có icon kính lúp và nút outlined xanh **+ Thêm Mới**.
   - **DataTable**: hàng tiêu đề chữ xanh đậm; ngay dưới là **hàng filter theo cột** (icon phễu + input gạch chân; cột enum dùng select, cột ngày dùng khoảng ngày, cột không lọc được để trống gạch chân chấm). Cột mã là link xanh kèm icon (loại file/ảnh nhỏ). Cột trạng thái/danh mục dùng `StatusChip`. Cột "Tác vụ" cố định bên phải, nút ⋮ mở menu Xem chi tiết / Chỉnh sửa / Đổi trạng thái / Xoá.
   - **Phân trang** góc phải dưới: "Số hàng mỗi trang: [10 ▾]" (10/20/50), "1–10 trong 57", nút ‹ ›.
4. Chế độ **lưới**: card có ảnh bìa tỉ lệ 16:9, tên, mã, 2–3 thông tin chính, chip trạng thái, ⋮ tác vụ; 4 cột desktop / 2 tablet / 1 mobile.
5. Trạng thái: skeleton khi tải, `EmptyState` "Không có dữ liệu" khi rỗng, thông báo lỗi có nút "Thử lại".

### Form thêm/sửa
- Mặc định mở `FormDialog` (maxWidth md); entity nhiều trường (Căn hộ, Cư dân, Thông báo phí) dùng trang riêng hoặc Drawer phải.
- Nút "Huỷ" (text) + "Lưu" (contained xanh); đang lưu → disabled + spinner. Đóng khi form dirty → hỏi xác nhận.
- Upload ảnh: kéo thả, xem trước, chọn ảnh đại diện, xoá; upload ngay khi chọn qua `/files` và giữ `fileId` trong form.

## Test
- Component dùng chung (DataTable, ColumnFilter, FormDialog) có test Vitest + Testing Library.
- Mỗi feature: test render trang list với dữ liệu mock (MSW) và submit form hợp lệ/không hợp lệ.

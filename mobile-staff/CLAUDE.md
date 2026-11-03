@../mobile/AGENTS.md

# BiHome Quản lý — app nhân viên (Expo)

Đọc `../CLAUDE.md` (quy ước chung) và `README.md` (chạy, phiên đăng nhập mobile, push, build EAS). Phần backend liên quan:
`../docs/MODULES.md` mục "App nhân viên".

- Dùng **npm** (không pnpm). Kiểm tra: `npm run typecheck && npm run lint` và `npx expo-doctor`. Bản web
  `npm run web` (cổng 8082, đã có trong CORS local); tài khoản mẫu `admin` / `Admin@123`. Bundle `vn.bihome.staff`.
- Gọi chung API BQL `/api/v1/**` như web (cùng permission, `X-Building-Id`); không thêm API riêng cho app nếu web đã có.
  Đăng nhập gửi `X-Client-Type: mobile`, refresh token lưu `expo-secure-store` và gửi lại qua `X-Refresh-Token`.
- Code theo module, soi gương `frontend/src/features/<module>`: `src/lib/api/<module>.ts`, `src/lib/types/<module>.ts`,
  `src/lib/constants/<module>.ts` (nhãn tiếng Việt của enum); `lib/staff.ts`, `lib/types.ts`, `lib/constants.ts` chỉ
  re-export. Màn hình ở `src/app/<route-giống-web>/`; tab `(tabs)/manage.tsx` là hub mọi module, khớp sidebar web.
- Menu / nút ẩn theo quyền qua `useAuth().can('XXX_READ')`. Danh sách gọi API luôn `size` 10/20/50.
- Link thông báo của web (vd `/sos-alerts?view=`) đổi sang màn hình app ở `lib/push.routeForLink` — thêm màn hình mới
  có link thông báo thì cập nhật hàm này.
- README mô tả bản v1.0 (Tổng quan, Yêu cầu, SOS, Duyệt, Ghi chỉ số, Tra cứu); app hiện đã có thêm màn hình quản lý
  cho hầu hết module của web (xem `src/app/`).

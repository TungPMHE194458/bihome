# BiHome Quản lý – app nhân viên (iOS / Android)

Expo SDK 57 + Expo Router (TypeScript). App riêng cho nhân viên Ban quản lý (Admin hệ thống, Trưởng BQL, nhân viên vận
hành, kế toán…), tách khỏi app cư dân (`../mobile`). Gọi chung API với web quản lý (`/api/v1/**`), cùng tài khoản,
vai trò, quyền và tòa được giao. Bundle ID / Application ID: `vn.bihome.staff`.

## Chức năng (v1.0)

Menu và nút tự ẩn theo quyền của vai trò (giống web).

- **Đăng nhập** bằng tên đăng nhập / email của web quản lý; mật khẩu tạm phải đổi ở lần đầu. Chọn tòa làm việc
  (người được giao nhiều tòa / Admin hệ thống có thêm "Tất cả tòa nhà").
- **Tổng quan**: SOS đang mở, số liệu chính (yêu cầu mở / quá hạn, lượt tiện ích hôm nay, căn có người ở, công nợ,
  tỉ lệ thu), việc chờ duyệt, yêu cầu đang giao cho tôi, lối tắt.
- **Yêu cầu hỗ trợ**: lọc Của tôi / Chưa giao / Quá hạn / Tất cả + trạng thái + tìm kiếm; chi tiết có gọi cư dân, nhận
  việc, giao việc, chuyển trạng thái theo luồng backend cho phép (huỷ bắt buộc lý do, ghi chú cho cư dân thấy hoặc
  không), bình luận nội bộ / gửi cư dân kèm ảnh chụp.
- **SOS**: cảnh báo đang mở tự làm mới 15 giây, rung máy khi có cảnh báo mới; tiếp nhận, gọi người báo, kết thúc
  (Đã xử lý / Báo nhầm, bắt buộc ghi kết quả).
- **Duyệt**: đăng ký tiện ích (duyệt / từ chối có lý do), phiếu kê khai thành viên / xe (duyệt nguyên bản, nhập SĐT nếu
  cư dân chưa khai; sửa chi tiết thì dùng web), đơn dịch vụ (xác nhận / hoàn thành / huỷ).
- **Ghi chỉ số điện nước** theo tầng ngay tại hiện trường: chọn Điện / Nước, kỳ, tầng → nhập chỉ số mới từng căn (kỳ đầu
  nhập cả chỉ số cũ), thấy ngay tiêu thụ và cảnh báo bất thường (> 3 lần trung bình), lưu cả tầng một lần; kỳ đã phát
  hành thông báo phí thì khoá.
- **Tra cứu** cư dân (gọi nhanh), căn hộ (người đang ở, xe, yêu cầu gần đây), xe theo biển số.
- **Thông báo** trong hệ thống (chuông) + **push** (Expo) khi có thông báo mới; bấm mở đúng màn hình.

## Chạy khi phát triển

```bash
# Backend + DB đang chạy (xem README gốc). Tài khoản mẫu (profile local): admin / Admin@123
cd mobile-staff
npm install
npm run web            # trình duyệt: http://localhost:8082 (CORS local đã cho phép cổng này)
npx expo start         # Expo Go trên điện thoại cùng Wi-Fi; API tự trỏ về IP máy dev, cổng 8080
```

Đổi địa chỉ backend: `EXPO_PUBLIC_API_URL=https://api.example.vn npx expo start`.

Kiểm tra trước khi commit: `npm run typecheck && npm run lint` và `npx expo-doctor`.

## Phiên đăng nhập trên mobile

Web giữ refresh token trong cookie HttpOnly. App gửi header `X-Client-Type: mobile` nên backend trả refresh token trong
body (lưu ở Keychain / Keystore qua `expo-secure-store`) và nhận lại qua header `X-Refresh-Token` khi làm mới / đăng
xuất / đổi mật khẩu; xoay vòng và thu hồi như web. Tòa đang chọn gửi qua `X-Building-Id`.

Push: app gửi Expo push token lên `POST /api/v1/notifications/push-tokens` (bảng `USER_PUSH_TOKEN`), đăng xuất thì
`DELETE`. Mọi thông báo tạo qua `NotificationService.notify` được đẩy thêm tới thiết bị của người nhận sau khi commit —
bật bằng `bihome.resident-app.push-enabled=true` (dùng chung cờ với app cư dân, mặc định tắt = chỉ ghi log). Push cần
`extra.eas.projectId` trong `app.json` (có sau `eas init`).

## Build và phát hành (EAS)

```bash
npx eas-cli@latest login
npx eas-cli@latest init                               # tạo project EAS, ghi projectId vào app.json
npx eas-cli@latest build -p android --profile demo    # APK cài thử, trỏ tới backend trong eas.json (profile demo)
npx eas-cli@latest build -p ios --profile production
```

Địa chỉ API của từng profile nằm ở `eas.json` (`EXPO_PUBLIC_API_URL`). App nhân viên thường phát hành nội bộ (APK /
TestFlight, Google Play "Internal testing" hoặc Apple Business Manager) thay vì công khai trên store.

## Cấu trúc

```
src/app/          # (tabs)/ index (Tổng quan), tickets, sos, approvals, more; tickets/[id], sos/[id], bookings/[id],
                  # declarations/[id], orders/[id], meter, lookup, apartments/[id], notifications, building, login…
src/components/   # ui.tsx, Screen, form.tsx (dùng chung kiểu app cư dân), common.tsx (ListRow, FilterChips,
                  # PromptModal, BuildingBar, StatTile), PhotoPicker
src/lib/          # api.ts (axios, làm mới phiên, X-Building-Id), auth.tsx (phiên, quyền, tòa), staff.ts (gọi API),
                  # queries.ts (SOS 15 giây, đếm việc chờ duyệt), push.ts (đăng ký push, link → màn hình), types.ts
scripts/          # generate-icons.py — icon nền xanh than (app cư dân nền xanh lá)
```

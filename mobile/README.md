# BiHome – app cư dân (iOS / Android)

Expo SDK 57 + Expo Router (TypeScript). Gọi API cư dân của backend: `/api/v1/resident/**` (token riêng, không dùng
được cho API Ban quản lý). Kế hoạch phát hành: [`docs/MOBILE_PLAN.md`](../docs/MOBILE_PLAN.md).

## Chức năng (v1.0)

- **Đăng nhập** bằng số điện thoại. Tài khoản do BQL cấp ở web (Cư dân → chi tiết → "Tạo tài khoản app"). Lần đầu đăng
  nhập phải đổi mật khẩu tạm.
- **Trang chủ**: phí còn nợ, yêu cầu đang xử lý, lượt đặt sắp tới, thông báo mới, nút SOS. Chọn căn nếu ở nhiều căn.
- **Phí**: thông báo phí theo kỳ, chi tiết khoản, **mã VietQR** + thông tin chuyển khoản (sao chép), PDF, phiếu thu.
- **Yêu cầu**: gửi kèm ảnh (thư viện / máy ảnh), theo dõi trạng thái, trao đổi công khai với BQL, đánh giá.
- **Tiện ích**: xem khung giờ còn trống, đặt chỗ (voucher, xem trước phí), huỷ lượt.
- **SOS**: chọn loại sự cố → BQL nhận ngay (nút SOS trên web BQL nhấp nháy + âm báo).
- **Thông báo**: hộp thư (phát hành phí, thu tiền, yêu cầu, duyệt lượt đặt, thông báo BQL, nhắc nhở) + push.
- **Tài khoản**: hồ sơ, đổi mật khẩu, đăng xuất, **xoá tài khoản app** (yêu cầu của App Store / Google Play).
- **Căn hộ của tôi**: thành viên, xe, thẻ từ của căn; **kê khai thành viên gia đình / xe** (chủ sở hữu, người thuê) —
  Ban quản lý duyệt ở web (Quản lý tòa nhà → Kê khai từ cư dân), kết quả báo về Thông báo.
- **Dịch vụ**: xem dịch vụ của tòa, đặt đơn (số lượng, ngày giờ hẹn, voucher, xem trước phí), huỷ đơn.
- **Khảo sát ý kiến**: trả lời khảo sát đang mở (một / nhiều lựa chọn, chấm sao, văn bản); mỗi người một lần, khảo sát
  ẩn danh không lưu người trả lời.
- **Tài liệu**: tài liệu Ban quản lý công bố cho cư dân (mở / chia sẻ tệp).

## Chạy khi phát triển

```bash
# Backend + DB đang chạy (xem README gốc). Tài khoản mẫu (profile local): 0900000001 / CuDan@123
cd mobile
npm install
npm run web            # trình duyệt: http://localhost:8081 (CORS local đã cho phép cổng này)
npx expo start         # quét QR bằng Expo Go trên điện thoại cùng Wi-Fi; API tự trỏ về IP máy dev, cổng 8080
```

Đổi địa chỉ backend: `EXPO_PUBLIC_API_URL=https://api.example.vn npx expo start`.

Kiểm tra trước khi commit: `npm run typecheck && npm run lint` và `npx expo-doctor`.

## Build và phát hành (EAS)

Cần tài khoản Expo (miễn phí) + Apple Developer / Google Play Console (xem `docs/MOBILE_PLAN.md`).

```bash
npx eas-cli@latest login
npx eas-cli@latest init                 # tạo project EAS, ghi extra.eas.projectId vào app.json (cần cho push)
npx eas-cli@latest build -p android --profile preview      # APK cài thử trực tiếp
npx eas-cli@latest build -p ios --profile production       # bản App Store (EAS tự quản lý chứng chỉ)
npx eas-cli@latest submit -p ios                            # gửi lên App Store Connect / TestFlight
npx eas-cli@latest submit -p android                        # gửi lên Google Play (track internal)
```

Địa chỉ API của từng profile nằm ở `eas.json` (`EXPO_PUBLIC_API_URL`) — sửa thành tên miền backend thật trước khi build.
Bundle ID / Application ID: `vn.bihome.resident` (đổi sau khi phát hành = app mới).

Backend gửi push qua Expo Push Service khi bật `bihome.resident-app.push-enabled=true` (mặc định tắt, chỉ ghi log).

## Cấu trúc

```
src/app/          # màn hình (Expo Router): login, change-password, (tabs)/…, fees/[id], tickets/…, amenities/[id], bookings/…, sos, inbox
src/components/   # ui.tsx (Button, TextField, Chip, Card…), Screen, PhotoPicker, InboxRow, Logo
src/lib/          # api.ts (axios + tự làm mới token), auth.tsx (phiên, căn đang chọn), resident.ts (gọi API), push.ts, types.ts
scripts/          # generate-icons.py — icon / splash từ logo BiHome
```

# Kế hoạch phát hành app BiHome trên App Store và Google Play

> Trạng thái: bản kế hoạch, chưa triển khai. Cập nhật: 12/10/2026.
> Liên quan: `docs/SPEC.md` (nghiệp vụ web BQL), `docs/PROMPTS.md` (lộ trình web, Phase 0–16 đã xong).

## 1. Mục tiêu và phạm vi

Phát hành **app cư dân BiHome** (iOS + Android) dùng chung backend hiện có. Cư dân đăng nhập, xem và thanh toán phí,
gửi yêu cầu hỗ trợ, đặt tiện ích, nhận thông báo, bấm SOS. Ban quản lý (BQL) vẫn dùng web.

Không nằm trong đợt này: app cho nhân viên BQL / kỹ thuật viên (đề xuất làm sau, mục 9), thanh toán qua cổng thẻ
(chỉ dùng VietQR như web).

### Vì sao phải làm backend trước

Web BQL đã chừa sẵn chỗ cho app nhưng chưa có phần dành cho cư dân:

| Đã có | Còn thiếu |
|---|---|
| Vai trò `RESIDENT` (V001), cột `RESIDENT.APP_ACCOUNT_STATUS` (luôn `NONE`) | Tài khoản đăng nhập của cư dân, liên kết cư dân ↔ tài khoản |
| Kênh `IN_APP` của nhắc nhở (lưu `REMINDER_DELIVERY`, chưa ai đọc) | API hộp thư cư dân, push notification |
| `TICKET.CHANNEL = 'APP'`, `SOS_ALERT.SOURCE = 'APP'` | API cư dân tạo yêu cầu / SOS |
| `POST /surveys/{id}/responses` (BQL nhập hộ) | Cư dân tự trả lời, chỉ khảo sát của mình |
| Refresh token qua **cookie** HttpOnly (`RefreshTokenCookies`) | Refresh token cho app (app không dùng cookie) |
| OTP quên mật khẩu chỉ qua email, chỉ ghi log (`LoggingOtpNotifier`) | OTP qua SMS / Zalo ZNS thật |
| Lưu tệp trên đĩa local (`LocalStorageService`) | Lưu trữ dùng được khi chạy nhiều máy chủ (S3 / MinIO) |
| Chạy local bằng Docker | Môi trường production có HTTPS (bắt buộc để app gọi được và để duyệt store) |

## 2. Quyết định cần chủ dự án chốt (tuần 1)

1. **Tài khoản nhà phát triển đứng tên tổ chức** (khuyến nghị) hay cá nhân.
   - Tổ chức cần pháp nhân + mã **D-U-N-S** (miễn phí, xin qua Apple, thường mất vài ngày đến vài tuần).
   - Google Play: tài khoản **cá nhân** tạo sau 13/11/2023 phải chạy *closed testing* với ≥ 12 người thử liên tục
     14 ngày mới được lên production; tài khoản tổ chức được miễn. → Đứng tên công ty tiết kiệm ~2–3 tuần.
   - Phí: Apple Developer Program 99 USD/năm; Google Play 25 USD một lần.
2. **Công nghệ app**: khuyến nghị **React Native + Expo** (TypeScript) — cùng ngôn ngữ, cùng Zod / TanStack Query /
   dayjs với `frontend/`, dùng lại được kiểu dữ liệu, schema và cách gọi API; build iOS trên cloud (EAS) nên không bắt
   buộc có máy Mac. Phương án khác: Flutter (hiệu năng tốt nhưng đội phải học Dart, không dùng lại code).
3. **Một app cho mọi tòa** (khuyến nghị; cư dân thấy tòa của mình theo tài khoản) hay app riêng cho từng chủ đầu tư
   (white-label — mỗi app một lần duyệt store, chi phí vận hành cao hơn nhiều).
4. **Cách cấp tài khoản**: BQL bấm "Tạo tài khoản app" trên web (đã có trong SPEC, chưa làm) → cư dân nhận SMS có
   mã kích hoạt, đăng nhập bằng số điện thoại + OTP lần đầu rồi đặt mật khẩu. Không cho tự đăng ký tự do (tránh người
   lạ nhận căn hộ).
5. **Nơi chạy production**: cloud trong nước (Viettel / VNPT / FPT / CMC Cloud) hay quốc tế. Dữ liệu cư dân là dữ liệu
   cá nhân → nên đặt máy chủ tại Việt Nam và hỏi ý kiến pháp chế (mục 6).
6. **Nhà cung cấp SMS / Zalo ZNS** cho OTP và thông báo; **đối tác đối soát ngân hàng** cho VietQR (webhook thật thay cho
   giả lập).

## 3. Phạm vi chức năng app

### v1.0 — bản đầu tiên lên store

| Màn hình | Dựa trên module backend |
|---|---|
| Đăng nhập (SĐT + mật khẩu / OTP), quên mật khẩu, đổi mật khẩu, đăng xuất | `auth` (mở rộng) |
| Trang chủ: căn hộ đang ở (chọn căn nếu ở nhiều căn), phí còn nợ, thông báo mới | `resident`, `apartment`, `feenotice`, `notification` |
| Thông báo phí: danh sách theo kỳ, chi tiết khoản, **mã VietQR**, tải PDF, lịch sử phiếu thu | `feenotice`, `payment`, `vietqr` |
| Yêu cầu hỗ trợ: tạo (ảnh đính kèm), theo dõi trạng thái, bình luận công khai, đánh giá | `ticket` (chỉ bình luận `PUBLIC`) |
| Đặt tiện ích: xem khung giờ trống, đặt / huỷ, áp voucher, lịch sử | `amenity`, `booking`, `voucher` |
| SOS: nút khẩn cấp (xác nhận 2 bước), gửi kèm căn hộ | `sos` (`SOURCE = APP`) |
| Hộp thư: thông báo BQL, nhắc nhở kênh Trong app; **push notification** | `notification`, `reminder` |
| Hồ sơ cá nhân, thành viên trong căn, **xoá tài khoản** (bắt buộc với App Store) | `resident` |

### v1.1 — 4–6 tuần sau khi phát hành

Khảo sát ý kiến, đặt dịch vụ (đơn dịch vụ), tài liệu dành cho cư dân, thẻ từ và xe của căn hộ, voucher của tôi, chỉ số
điện nước theo kỳ (biểu đồ).

## 4. Việc phía backend (làm trước, khoảng 3–4 tuần)

Làm theo khuôn của web: migration Flyway mới → service + test → controller → Swagger. Không sửa migration cũ.

1. **Tài khoản cư dân** (V170):
   - Bảng `RESIDENT_ACCOUNT` (hoặc gắn `APP_USER` vai trò `RESIDENT` với `RESIDENT_ID`), dùng `APP_ACCOUNT_STATUS`.
   - Tác vụ web BQL: Tạo tài khoản app / Khoá / Mở khoá / Đặt lại (phần còn thiếu của Phase 7).
   - Đăng nhập bằng số điện thoại; OTP qua SMS/ZNS (thêm triển khai thật cho `OtpNotifier` và `MessageSender`).
2. **Token cho app**: `/auth/login` và `/auth/refresh` trả refresh token trong body khi client là app (header
   `X-Client: mobile`), app lưu vào Keychain / Keystore; xoay vòng refresh token như hiện nay, thu hồi khi đăng xuất.
3. **API riêng cho cư dân** dưới `/api/v1/me/...`, luôn lọc theo các căn cư dân đang ở (không dựa vào `X-Building-Id`):
   căn hộ, thông báo phí + QR + PDF, phiếu thu, đặt tiện ích (gọi lại `BookingService`), yêu cầu hỗ trợ, SOS, hộp thư,
   khảo sát. Tách controller riêng để quyền của BQL và cư dân không lẫn vào nhau; mỗi API có integration test chặn
   xem dữ liệu căn khác (giống `SecurityHardeningIT`).
4. **Push notification**: bảng `DEVICE_TOKEN` (người dùng, nền tảng, token, lần cuối thấy); gửi qua Expo Push Service
   (hoặc FCM + APNs trực tiếp). Nối vào: phát hành thông báo phí, phiếu thu khớp (`PAYMENT_RECEIVED`), yêu cầu đổi trạng
   thái, đặt tiện ích được duyệt / từ chối, thông báo BQL, nhắc nhở `IN_APP`.
5. **Xoá tài khoản**: cư dân tự yêu cầu trong app → khoá đăng nhập ngay, xoá / ẩn danh dữ liệu cá nhân theo chính sách
   lưu trữ (giữ chứng từ thu phí theo quy định kế toán), ghi lịch sử hoạt động.
6. **Lưu tệp**: thêm `S3StorageService` (MinIO tự dựng hoặc object storage của cloud) cho ảnh yêu cầu / ảnh đại diện;
   `FileAccessPolicy` mở rộng cho cư dân (chỉ tệp của mình và của căn mình).
7. **Chống lạm dụng**: giới hạn tần suất đăng nhập / OTP / SOS theo IP và số điện thoại; kiểm tra phiên bản app tối thiểu
   (`GET /app-config` trả `minVersion` để buộc cập nhật khi đổi API).

## 5. Hạ tầng production (song song với mục 4)

- Tên miền + HTTPS (ví dụ `api.bihome.vn`), reverse proxy (Nginx / Caddy), backend chạy Docker.
- Oracle production: bản có hỗ trợ / được sao lưu tự động (Oracle Free giới hạn 2 CPU, 2 GB RAM, 12 GB dữ liệu —
  chỉ hợp cho thử nghiệm). Sao lưu hằng ngày, thử khôi phục trước khi lên store.
- Secret qua biến môi trường (`BIHOME_JWT_SECRET`, `BIHOME_BANK_WEBHOOK_SECRET`, khoá SMS, khoá push), không dùng
  profile `local` (seed và ảnh demo chỉ chạy ở `local`).
- Môi trường **staging** riêng để duyệt store và chạy thử (có dữ liệu giả, tài khoản demo cho người duyệt).
- Giám sát: log tập trung, cảnh báo lỗi (Sentry cho cả backend và app), uptime check `/actuator/health`.
- CI/CD: GitHub Actions chạy `./mvnw clean verify` + `pnpm typecheck && pnpm lint && pnpm test --run`, build app
  bằng EAS Build, gửi bản thử bằng EAS Submit.

## 6. Pháp lý và chính sách store

- **Luật Bảo vệ dữ liệu cá nhân 2025** (Luật 91/2025/QH15, hiệu lực 01/01/2026) và nghị định hướng dẫn: thông báo xử
  lý dữ liệu, xin đồng ý khi cư dân kích hoạt tài khoản, cho rút đồng ý và xoá dữ liệu. App có SOS / vị trí thì xem kỹ
  quy định về dữ liệu vị trí. → Nhờ pháp chế rà trước khi nộp store.
- **Chính sách quyền riêng tư** và **điều khoản sử dụng** đăng ở URL công khai (bắt buộc ở cả hai store).
- Hỏi pháp chế xem app có thu phí / đặt dịch vụ có phải thông báo **ứng dụng thương mại điện tử** với Bộ Công Thương
  không (chưa xác minh — tuỳ mô hình thu tiền).
- **App Store**:
  - App tạo tài khoản phải cho xoá tài khoản ngay trong app.
  - Phí quản lý / tiện ích là dịch vụ dùng ngoài app nên thanh toán bằng VietQR, không phải qua In-App Purchase.
  - Khai báo "App Privacy".
  - Cấp **tài khoản demo** đăng nhập được cho người duyệt; app chỉ dành cho cư dân được mời nên ghi rõ trong ghi chú
    duyệt.
- **Google Play**:
  - Biểu mẫu **Data safety**.
  - Xếp hạng nội dung.
  - Khai báo quyền nhạy cảm (camera / ảnh cho đính kèm; vị trí chỉ khi thật cần).
  - Cấp tài khoản demo cho người duyệt.
- **Yêu cầu kỹ thuật hiện hành**:
  - iOS: từ 28/04/2026 bản tải lên phải build bằng Xcode 26 / iOS 26 SDK; dùng Expo SDK mới nhất (EAS Build đã dùng
    Xcode 26).
  - Android: từ 31/08/2026 app mới và bản cập nhật phải nhắm Android 16 (API 36).

## 7. Lộ trình (ước tính cho 2 dev backend + 2 dev app + 1 QA/thiết kế)

| Tuần | Giai đoạn | Kết quả |
|---|---|---|
| 1–2 | Chuẩn bị | Chốt mục 2; đăng ký D-U-N-S, Apple Developer, Google Play; thiết kế UI app (Figma) theo nhận diện BiHome; dựng staging |
| 2–5 | Backend cho app (mục 4) + hạ tầng (mục 5) | API `/me/...` có Swagger + test; push; OTP SMS; S3; staging chạy HTTPS |
| 4–9 | App v1.0 | Expo + Expo Router; đăng nhập, trang chủ, phí + QR, yêu cầu, tiện ích, SOS, hộp thư, hồ sơ, xoá tài khoản |
| 9–11 | Thử nghiệm | TestFlight (iOS) + Internal / Closed testing (Android) với BQL và 20–30 cư dân một tòa thí điểm; sửa lỗi; kiểm thử bảo mật |
| 11–12 | Nộp store | Ảnh chụp màn hình, mô tả, chính sách; nộp duyệt (Apple thường vài ngày, có thể bị trả về); phát hành dần (staged rollout) |
| 12+ | Vận hành | Theo dõi lỗi / đánh giá; v1.1 sau 4–6 tuần |

Tổng khoảng **3 tháng** nếu tài khoản tổ chức sẵn sàng sớm. Dùng tài khoản Google Play cá nhân thì cộng thêm ≥ 14 ngày
closed testing.

## 8. Chuẩn bị cho trang store

- Tên app, phụ đề, mô tả ngắn / dài (tiếng Việt, có thể thêm tiếng Anh), từ khoá.
- Icon 1024×1024 (logo BiHome, không dùng nhận diện sản phẩm tham khảo).
- Ảnh chụp màn hình:
  - iPhone 6.9" và 6.5";
  - iPad nếu bật hỗ trợ iPad (khuyến nghị tắt ở v1.0);
  - điện thoại Android, kèm ảnh nổi bật (feature graphic) 1024×500 cho Google Play.
- URL hỗ trợ, URL chính sách quyền riêng tư, email liên hệ.
- Tài khoản demo trên staging (một căn hộ có sẵn thông báo phí, yêu cầu, lượt đặt tiện ích).
- Bundle ID / Application ID cố định từ đầu, ví dụ `vn.bihome.resident` (đổi sau là phải phát hành app mới).

## 9. Rủi ro và cách giảm

| Rủi ro | Giảm thiểu |
|---|---|
| Apple từ chối vì không đăng nhập được / app "chỉ cho người được mời" | Tài khoản demo đầy đủ dữ liệu, ghi chú duyệt nêu rõ mô hình BQL cấp tài khoản |
| Thiếu xoá tài khoản, thiếu chính sách quyền riêng tư | Làm trong v1.0, có trong checklist nộp |
| Lộ dữ liệu giữa các căn / tòa | API `/me` tách riêng, integration test chặn chéo căn, rà soát bảo mật trước beta |
| Push không tới (iOS hết hạn chứng chỉ, token cũ) | Dùng Expo Push / FCM, dọn token lỗi, có hộp thư trong app làm nguồn chính |
| Đổi API làm hỏng bản app cũ đang dùng | Version API, `minVersion` buộc cập nhật, giữ tương thích ngược ≥ 1 phiên bản |
| Webhook ngân hàng thật khác giả lập | Chạy thử với tài khoản thật ở staging trước khi bật cho cư dân |

Sau v1.1 có thể làm **app nhân viên BQL** (nhận / xử lý yêu cầu, chụp ảnh nghiệm thu, nhập chỉ số điện nước tại chỗ,
nhận SOS) trên cùng nền tảng Expo.

## 10. Việc làm ngay (2 tuần đầu)

- [ ] Chốt 6 quyết định ở mục 2.
- [ ] Đăng ký D-U-N-S → Apple Developer Program (tổ chức) và Google Play Console (tổ chức).
- [ ] Chọn nhà cung cấp SMS / ZNS, cloud production, đối tác đối soát ngân hàng; xin báo giá.
- [ ] Pháp chế rà chính sách quyền riêng tư theo Luật BVDLCN 2025.
- [ ] Thiết kế luồng màn hình v1.0 và bộ icon / màu của app.
- [ ] Viết prompt theo phase cho app (giống `docs/PROMPTS.md`): Phase M0 backend tài khoản cư dân → M1 API `/me` →
      M2 push → M3 khởi tạo app Expo → M4… theo từng màn hình ở mục 3.

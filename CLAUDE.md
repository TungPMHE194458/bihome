# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# BiHome — Facility Management System

BiHome là hệ thống quản lý vận hành tòa nhà/khu đô thị (Facility Management System) dành cho Ban quản lý:
quản lý tòa nhà, căn hộ, cư dân, tài sản (xe), tiện ích, yêu cầu hỗ trợ, tài liệu và thông báo phí.
Giao diện tham khảo: màn hình "Danh sách tài liệu" (sidebar 2 tầng, header có bộ chọn tòa nhà, bảng có filter theo cột).

> Đặc tả chức năng đầy đủ: `docs/SPEC.md` — ĐỌC phần tương ứng trước khi code bất kỳ module nào.
> Lộ trình triển khai theo phase: `docs/PROMPTS.md`.
> Quy ước chi tiết từng phía: `backend/CLAUDE.md`, `frontend/CLAUDE.md`.

## Tiến độ

- Đã xong Phase 0–16. Backend: `common/*` (gồm
  `excel/`, `messaging/`, `pdf/`), `auth/`, `user/`, `building/`, `apartment/`, `asset/`, `resident/`, `document/`,
  `ticket/`, `accesscard/`, `voucher/`, `amenity/`, `servicecatalog/`, `booking/`, `transaction/`, `amenityreport/`,
  `audit/`, `notification/`, `dashboard/`, `reminder/`, `survey/`, `feerate/`, `meter/`, `feenotice/`, `payment/`,
  `vietqr/`, `sos/`, `setting/`, migration V001–V003, V010–V160 +
  seed local (admin, 4 tòa, 34 căn hộ, xe, 8 cư dân, 6 yêu cầu, 7 thẻ từ, 4 voucher, 3 tiện ích và 4 dịch vụ mẫu ở
  SKY01, 6 đăng ký tiện ích, 2 đơn dịch vụ và giao dịch mẫu, 2 nhắc nhở, 2 khảo sát (1 đang mở có 3 phản hồi), đơn giá +
  tài khoản VietQR giả + chỉ số điện / nước 2 kỳ trước tháng chạy seed của mọi căn SKY01 (A0203 tăng bất thường), 1
  cảnh báo SOS đã xử lý;
  danh mục tài liệu/yêu cầu/loại dịch vụ mặc định nằm trong
  V050/V060/V100). Frontend: layout, auth, component
  dùng chung, Hồ sơ, Đổi mật khẩu, **Bảng điều khiển**, **Người dùng hệ thống** (thêm/sửa, gán vai trò/tòa, khoá,
  đặt lại mật khẩu), **Vai trò & phân quyền**, **Thông báo** (chuông + trang soạn), **Nhật ký hoạt động**, **Tòa nhà**,
  **Căn hộ**, **Hạng mục căn hộ**, **Cư dân**, **Voucher**, **Thẻ từ**, **Tài liệu**, **Danh mục tài liệu**, **Yêu cầu
  và hỗ trợ**, **Danh mục yêu cầu**, **Đăng ký tiện ích** (danh sách + lịch tuần), **Cấu hình tiện ích**, **Danh mục tiện ích**,
  **Dịch vụ** (tab Đơn dịch vụ), **Loại dịch vụ**, **Lịch sử giao dịch**, **Báo cáo tiện ích**, **Nhắc nhở**, **Khảo
  sát ý kiến** (danh sách + chi tiết có biểu đồ kết quả), **Thông báo phí** (danh sách + chi tiết), **Số liệu**, **Đơn
  giá** (`/fee-rates`, thêm vào menu Thông báo phí), **Lịch sử thanh toán**, **Thanh toán tự động (VietQR)**, **Cảnh báo
  SOS** (`/sos-alerts`, menu Yêu cầu và hỗ trợ + nút SOS header), **Cấu hình chung** (`/settings/general`). Chi tiết
  căn hộ đã có đủ tab. README.md ở gốc repo. Ngoài phạm vi web BQL: app cư dân (kênh Trong app, tài khoản app, SOS nguồn
  APP), nhà cung cấp email / SMS thật, danh mục phường/xã theo tỉnh (Phường/Xã nhập tay). Mục "Dự án": không làm.
- Cấu hình chung: bảng một dòng `SYSTEM_SETTING` (ID = 1, tạo ở V160), `setting/SettingService.current()` giữ bản đọc
  trong bộ nhớ (làm mới sau commit khi lưu). Dùng ở: `AuthService` (số lần sai trước khi tạm khoá, số phút khoá — thay
  hằng số cũ), PDF thông báo phí / phiếu thu (dòng "Đơn vị quản lý…" + chân trang), `FeeNoticeService` (bật/tắt email
  khi phát hành). Quyền SETTING_READ / SETTING_WRITE (Trưởng BQL chỉ xem). Test IT đổi cấu hình phải trả về mặc định
  (CSDL dùng chung giữa các lớp test).
- Lịch sử hoạt động có thêm `FINANCIAL_TRANSACTION` (thu / huỷ / hoàn giao dịch) và `SURVEY_RESPONSE` (không ghi nội
  dung câu trả lời). Hạng mục xe ở chế độ "Tất cả" tòa lọc theo tên danh mục (`categoryName`). Đo hiệu năng (10.000
  căn hộ + 10.000 thông báo phí, local): danh sách / lọc / sắp xếp / dashboard 24–40 ms.
- SOS (Phase 15): `SOS_ALERT` thuộc tòa, mã `SOS-yyMMdd-xxx`; Mới → Đã tiếp nhận → Đã xử lý / Báo nhầm (kết thúc bắt
  buộc ghi chú, CHECK ở DB); BQL tạo tay (`SOURCE = MANUAL`, phải có căn hộ hoặc vị trí), báo `SOS_ALERT` cho người có
  `SOS_READ` ở tòa. Header `features/sos/components/SosButton` hỏi `GET /sos-alerts/active` mỗi 15 giây: badge số đang
  mở, nhấp nháy khi còn cảnh báo Mới, phát âm báo (Web Audio, `playAlarm`) khi `latestId` tăng so với lần hỏi trước.
  Trang ghim: bảng `USER_PINNED_PAGE` (`/profile/pinned-pages`, JDBC, không audit); FE `usePinnedPagesSync` (MainLayout)
  tải theo người đăng nhập và lưu lại khi đổi, `uiStore` không còn lưu ghim trong localStorage.
- Rà soát (Phase 16): `GET /files/{id}` qua `FileAccessPolicy` — người tải lên chỉ xem được tệp chưa gắn; tệp đã gắn
  thì theo tòa của bản ghi chứa nó (UNION các bảng tham chiếu; ảnh đại diện người dùng dùng chung). `FileReferences`
  đọc khoá ngoại tới FILE_ATTACHMENT từ từ điển dữ liệu: `requireOwnUpload` / `ImageListResolver` từ chối tệp đã gắn
  vào bản ghi khác; `OrphanFileCleanupJob` (03:00) xoá tệp không ai tham chiếu quá 24 giờ — module mới chỉ cần FK tới
  FILE_ATTACHMENT. `SpecificationBuilder` đi đường dẫn "a.b" bằng LEFT JOIN (trước là inner join ngầm → tìm từ khoá làm
  mất dòng có quan hệ trống). Người không phải Admin hệ thống: chỉ thấy / sửa người dùng cùng tòa (không gồm Admin hệ
  thống), chỉ gán tòa của mình, không gán vai trò / cấp quyền vượt quá quyền của mình; lịch sử đăng nhập chỉ Admin hệ
  thống. Webhook / giả lập VietQR chỉ khớp thông báo phí của tòa sở hữu tài khoản nhận (giả lập: đúng tòa của thông
  báo). Audit: xoá entity dùng `buildingSql` tra tòa ngay lúc xoá (bản ghi cha có thể bị xoá trước khi commit). Mọi
  collection lazy có `@BatchSize`; kiểm N+1 bằng `-Dspring.jpa.properties.hibernate.generate_statistics=true` +
  logger `org.hibernate.engine.internal.StatisticalLoggingSessionEventListener=INFO`. `FormDialog` có
  `loadError` / `onRetry`: dialog sửa truyền lỗi tải chi tiết để không hiện form trống (lưu sẽ gửi `version` rỗng).
- Tài chính (Phase 14). Đơn giá `FEE_RATE_CONFIG` (PK = BUILDING_ID, chưa lưu thì dùng cấu hình rỗng): VAT %, ngày hạn
  (ngày N của tháng sau kỳ), element collection quản lý theo loại căn, bậc điện / nước (hai bảng riêng, `@OrderColumn`
  TIER_NO từ 0, bậc cuối `UP_TO` null), gửi xe theo danh mục tài sản (FK ON DELETE CASCADE), phí khác. Kỳ là chuỗi
  `yyyy-MM` (`common/util/BillingPeriods`). `METER_READING` (duy nhất căn + loại + kỳ): chỉ số cũ luôn = chỉ số mới kỳ
  liền trước — thêm / sửa / xoá một kỳ thì `MeterReadingService.applyChain` tính lại cả chuỗi (kiểm tra hết rồi mới
  ghi), chỉ kỳ đầu được nhập chỉ số cũ; cảnh báo khi tiêu thụ > 3 × trung bình 3 kỳ trước (`AVERAGE_CONSUMPTION` lưu
  sẵn); kỳ đã có thông báo phí phát hành (`FeeNoticeRepository.isLocked`) thì khoá; lưới theo tầng `/meter-readings/sheet`
  và nhập Excel theo kỳ. Tiền tính ở `feenotice/FeeCalculator` (thuần, mỗi bậc điện / nước một dòng, VAT trên các khoản
  của kỳ, dòng SERVICE = giao dịch PENDING chưa gắn thông báo, PREVIOUS_DEBT = thông báo kỳ trước còn nợ). Tạo hàng loạt:
  `POST /fee-notices/preview` rồi `/generate` → nháp (mã `TB-yyMMdd-xxx`), gắn ngay giao dịch vào
  `FINANCIAL_TRANSACTION.FEE_NOTICE_ID` (không vào hai thông báo; `TransactionService.pay` chặn thu riêng, `cancel` qua
  `FeeNoticeLinks` bỏ dòng khỏi nháp hoặc chặn nếu đã phát hành). Nháp sửa được khoản (VAT tự tính lại, dòng hệ thống
  chỉ được bỏ), "Tính lại", xoá; phát hành kiểm tra nợ kỳ trước chưa đổi rồi đặt `CARRIED_TO_ID` cho thông báo cũ (còn
  nợ = 0, không thu riêng; giao dịch chưa thu của nó chuyển theo), gửi email cư dân qua `MessageSender`. Huỷ chỉ khi chưa
  có phiếu thu (trả nợ + giao dịch về thông báo cũ). Trạng thái thu theo `FeeNotice.collectedStatus` (PAID / OVERDUE /
  PARTIAL / ISSUED); `FeeNoticeOverdueJob` 00:20. `PAYMENT` (mã `PT-…`): khoá dòng thông báo (`findForUpdate`), không
  vượt số còn nợ, tiền mặt = Đã khớp, chuyển khoản / VietQR nhập tay = Chờ khớp (đối soát tay); huỷ cần lý do, không
  huỷ được khi nợ đã chuyển kỳ sau; thu đủ → giao dịch gắn kèm PAID (huỷ phiếu thì về PENDING). VietQR: `VIETQR_CONFIG`
  theo tòa, chuỗi EMVCo + CRC16 tự sinh ở `vietqr/VietQrPayload`, ảnh `QrImages` (ZXing); webhook
  `POST /api/v1/webhooks/bank` (permitAll, header `X-Webhook-Secret` = `bihome.bank-webhook.secret`, trống = từ chối),
  `BANK_TRANSACTION` duy nhất theo mã tham chiếu (gửi lại → DUPLICATE), tìm mã `TB…` trong nội dung (chấp nhận mất gạch
  nối) → phiếu thu tự động MATCHED / MISMATCHED + thông báo `PAYMENT_RECEIVED`; giả lập `POST /vietqr-settings/simulate`
  chỉ khi `bihome.bank-webhook.simulation-enabled` (bật ở local / test). PDF thông báo phí (có QR) và phiếu thu ở
  `common/pdf` (OpenPDF 2.0.5, font Be Vietnam Pro OFL trong `resources/fonts`; font không có "→" nên PDF thay bằng "–").
  Bảng điều khiển: `feeDebt` = còn nợ tới kỳ chọn, tỉ lệ thu = phần phát sinh của kỳ gần nhất đã phát hành (tiền thu trừ
  nợ cũ trước), `feeByPeriod` 6 kỳ. Căn hộ có số liệu / thông báo phí / phiếu thu thì không xoá được.
- Nhắc nhở & khảo sát (Phase 13): đối tượng nhận chung `resident/ResidentAudienceService` (ALL / FLOOR / APARTMENT /
  RESIDENT → cư dân chưa chuyển đi; `validateTargets`, `describe`, `apartmentInAudience`); FE `AudienceFields` (gọi
  `/reminders/floors` và `POST /reminders/preview-recipients`, mở cho cả `SURVEY_WRITE`). `REMINDER`: NOW / ONCE /
  MONTHLY (`ReminderSchedule.nextMonthly` — tháng thiếu ngày thì lấy ngày cuối tháng), Nháp → Đã lên lịch → Đã gửi / Huỷ;
  mỗi lần gửi ghi `REMINDER_DELIVERY` (cư dân/căn hộ lưu dạng chữ, không FK) theo từng kênh. Email/SMS đi qua
  `common/messaging/MessageSender` — hiện chỉ có `LoggingMessageSender` (ghi log); kênh Trong app lưu chờ app cư dân.
  `EngagementJob` (mỗi phút) gửi nhắc nhở đến hạn và đóng khảo sát hết hạn. Nội dung soạn thảo: FE
  `components/form/RichTextEditor` (contentEditable, không thư viện) + `RichTextView`; BE luôn lọc qua
  `common/messaging/RichText.sanitize` (jsoup Safelist) trước khi lưu. `SURVEY`: Nháp → Đang mở → Đã đóng; câu hỏi
  SINGLE / MULTIPLE / TEXT / RATING (FE `QuestionBuilder` kéo thả HTML5 + nút lên/xuống). Đã có phản hồi thì khoá câu
  hỏi và chế độ ẩn danh (409), cấm xoá; mỗi cư dân một phản hồi (index hàm), cư dân phải đang ở căn và thuộc đối tượng.
  BQL nhập phản hồi hộ (`POST /surveys/{id}/responses`); app cư dân dùng lại API này về sau. Căn hộ / cư dân có phản
  hồi khảo sát thì không xoá được.
- Lịch sử hoạt động: entity có `@AuditTrail(module, type, label, ignore, mask, building | buildingSql)` được
  `audit/AuditEventListener` (gắn vào Hibernate qua `AuditListenerRegistrar`) ghi `AUDIT_LOG` bằng JDBC ngay trước khi
  commit (`BeforeTransactionCompletionProcess`, cùng transaction; rollback thì không ghi). Ghi thay đổi từng trường
  (cũ → mới, gộp nhiều lần sửa trong một transaction), cả collection (vai trò, tòa phụ trách, ảnh, khung giờ...);
  `status` đổi → `STATUS_CHANGE`; `passwordHash`/`idNumber`/token luôn che `***`. Entity mới cần lịch sử thì thêm
  `@AuditTrail`; cập nhật bằng JPQL bulk (vd ghi nhận đăng nhập) không qua listener. Phạm vi xem: tòa đang chọn (hoặc
  các tòa được gán) + dữ liệu dùng chung; người không phải Admin hệ thống không thấy module USER/ROLE/SETTING. FE: trang
  `/settings/audit-logs` (tab Lịch sử đăng nhập cần `USER_READ`), nút ⟲ ở header, và nút ⟲ dưới breadcrumb của mọi
  trang tự mở `AuditHistoryDrawer` theo module của mục menu (`lib/modules.ts` có nhãn module dùng chung với phân quyền).
- Thông báo: `NOTIFICATION` (của từng người dùng, không audit) tạo qua `NotificationService.notify` (bỏ qua chính người
  thao tác); yêu cầu hỗ trợ gửi qua `ticket/TicketNotifier` (tạo mới → người xử lý của tòa, giao việc, đổi trạng thái,
  bình luận). Chuông header hỏi `unread-count` mỗi 30 giây. `ANNOUNCEMENT` (thuộc tòa): Nháp → Hẹn giờ
  (`AnnouncementScheduleJob` mỗi phút) → Đã gửi (không sửa/xoá được); gửi = thông báo cho nhân viên đang hoạt động được
  gán ở tòa; cư dân chỉ được đếm (`RESIDENT_COUNT`) chờ app cư dân. Link `/announcements?view=<id>` mở xem chi tiết.
- Vai trò & phân quyền: `RoleService` — Admin hệ thống luôn toàn quyền (không sửa được), vai trò hệ thống sửa được quyền
  nhưng không xoá, vai trò tự tạo xoá được khi chưa gán. FE ma trận module × Xem/Thêm-sửa/Xoá/Xuất (bật quyền khác tự
  bật Xem, tắt Xem tắt hết). Người dùng: `UserFormDialog` gán vai trò/tòa (Admin hệ thống không cần tòa), mật khẩu tạm
  hiện một lần ở `TemporaryPasswordDialog`.
- Bảng điều khiển: `GET /dashboard?month=yyyy-MM` (SQL thuần, phạm vi `listScope`), Admin hệ thống thêm số liệu hệ thống
  (dung lượng tệp, người dùng, đăng nhập hôm nay); có lượt đăng ký tiện ích hôm nay / trong tháng và 8 tuần gần nhất.
  Công nợ / tỉ lệ thu phí xem mục Tài chính. Biểu đồ dùng `@mui/x-charts` (test mock `BarChart`/`PieChart`).
- Test FE: hook và API cùng file thì `vi.mock` API không có tác dụng với hook → mock `@/lib/http` hoặc tách `hooks.ts`
  (như `features/role`).
- Đăng ký tiện ích (`booking/`): `BookingService.create` khoá dòng `AMENITY_CONFIG` (`findForUpdate`, SELECT ... FOR
  UPDATE) rồi mới kiểm tra khung giờ (phải trùng một khung đã cấu hình cho thứ của ngày), sức chứa khung (tổng người
  các lượt PENDING/APPROVED/COMPLETED giao giờ), giới hạn lượt / căn / tuần (thứ 2–CN), đặt trước tối đa, ngày bảo trì.
  Cần duyệt → PENDING (báo `BOOKING_PENDING` cho người có `AMENITY_BOOKING_WRITE` ở tòa), không → APPROVED. Phí =
  `AmenityConfig.priceFor` × (số người nếu PER_PERSON) − voucher. Huỷ: Chờ duyệt hoặc trước `freeCancelUntil` → trả
  voucher + huỷ khoản chưa thu / hoàn khoản đã thu; huỷ muộn giữ phí. `BookingCompletionJob` (15 phút) chuyển lượt đã
  duyệt hết giờ → Hoàn thành. Mã `DK-yyMMdd-xxx`, đơn dịch vụ `DV-…`, giao dịch `GD-…` từ `common/util/DailyCodeGenerator`
  (bảng `CODE_COUNTER`, cùng kỹ thuật UPDATE khoá dòng + INSERT hint như mã yêu cầu).
- Voucher dùng thật: `voucher/VoucherRedemptionService` (`preview` cho form tính thử, `redeem` khoá dòng voucher + tăng
  `USED_COUNT`, `recordUsage` ghi `VOUCHER_USAGE`, `release` trả lượt). Hiệu lực theo ngày sử dụng; kiểm tra tòa, trạng
  thái, phạm vi, tiện ích/dịch vụ cụ thể, tổng lượt, giới hạn mỗi căn. `usedCount` không ghi lịch sử hoạt động.
- Giao dịch (`transaction/`, bảng `FINANCIAL_TRANSACTION` — tránh từ khoá TRANSACTION): mỗi nguồn (đăng ký, đơn dịch vụ,
  thẻ từ, thông báo phí) tối đa một giao dịch; nguồn gọi `TransactionService.record / pay / cancel / refund`. Màn hình chỉ
  đọc + xuất Excel; thu phí ghi nhận ở đăng ký / đơn (`POST .../pay`). Thẻ từ: cấp thẻ có `issueFee` > 0 sinh giao dịch
  (một lần cho mỗi thẻ). Giao dịch PENDING được cộng vào thông báo phí kỳ tới (mục Tài chính).
- Đơn dịch vụ (`servicecatalog/ServiceOrder*`, FE tab "Đơn dịch vụ" ở `/services?tab=orders`): số lượng × đơn giá hiện
  hành (làm tròn đồng) − voucher; Chờ xác nhận → Đã xác nhận → Hoàn thành; huỷ trả voucher + huỷ / hoàn khoản phí.
- Báo cáo tiện ích (`amenityreport/`): theo ngày sử dụng [from, to] ≤ 366 ngày; lấp đầy = người giữ chỗ / tổng sức chứa
  các khung giờ (bỏ ngày bảo trì); doanh thu theo giao dịch PENDING + PAID, "đã thu" = PAID; xuất Excel nhiều sheet.
- Xoá tiện ích / dịch vụ / căn hộ / cư dân bị chặn khi đã có đăng ký, đơn hoặc giao dịch liên quan.
- Tiện ích: `AMENITY` thuộc tòa, mã in hoa duy nhất toàn hệ thống, giờ mở/đóng cửa lưu VARCHAR2(5) 'HH:mm'
  (`HhmmTimeConverter`, DTO `@JsonFormat(pattern = "HH:mm")`). `AMENITY_CONFIG` (PK = AMENITY_ID, tạo kèm khi thêm tiện
  ích, có VERSION riêng) giữ thời lượng lượt, số lượt tối đa/căn/tuần, đặt trước tối đa, huỷ miễn phí trước + 3 element
  collection `AMENITY_SLOT` (khung theo thứ 1=T2…7=CN, sức chứa riêng tuỳ chọn), `AMENITY_PRICE` (WEEKDAY/WEEKEND theo
  giờ bắt đầu của lượt, PER_BOOKING/PER_PERSON), `AMENITY_MAINTENANCE` (khoảng ngày nghỉ). Không có khung giờ = đóng
  cửa ngày đó. `AmenityConfig.priceFor(date, start)` / `isUnderMaintenance(date)` dùng cho đặt chỗ. Sửa
  giờ mở cửa bị chặn nếu khung giờ hiện có nằm ngoài (lỗi field `slots` → form tiện ích truyền danh sách field để rơi
  về toast). FE `AmenityConfigPage` (`/amenity-configs?amenityId=`) + `WeeklySlotEditor`; `findOverlap` ở FE cùng
  định dạng thông báo với backend.
- Dịch vụ: `SERVICE_TYPE` dùng chung mọi tòa (tên duy nhất, chặn xoá khi còn dịch vụ); `SERVICE` (entity
  `ServiceOffering`) thuộc tòa, mã duy nhất trong tòa, bỏ trống thì tự sinh `DV%04d`; đơn giá VND nguyên + đơn vị tự do.
- Thẻ từ: `ACCESS_CARD` thuộc tòa, mã thẻ in hoa duy nhất toàn hệ thống. Luồng ở `AccessCardEnums.CardStatus`:
  Trong kho → (`POST /{id}/issue` Cấp thẻ) Đang dùng ⇄ Khoá → Báo mất / Thu hồi → Trong kho. Đang dùng / Khoá luôn gắn
  căn hộ (CHECK ở DB); Thu hồi / Trong kho bỏ gắn; Báo mất giữ người làm mất. Cư dân phải đang ở căn của thẻ; xe chỉ
  gắn thẻ Gửi xe / Đa năng, mỗi xe một thẻ đang dùng (index hàm). `ACCESS_CARD_HISTORY` lưu căn hộ/cư dân dạng chữ
  (không FK) để không chặn xoá về sau. Chuyển đi (`ResidentService.moveOut` / sửa cư trú) gọi
  `AccessCardService.revokeForResident`; `ResidentMoveOutJob` gọi thêm `revokeOrphaned` cho chuyển đi theo ngày hẹn.
  Cột "Mã thẻ từ" của xe là `@Formula AssetItem.accessCardNo` (lọc được).
- Voucher: `VOUCHER` thuộc tòa, mã duy nhất toàn hệ thống; `validity` (UPCOMING/VALID/EXPIRED) tính theo ngày, lọc
  được. `USED_COUNT` tăng / giảm qua `VoucherRedemptionService`; đối tượng cụ thể (`VOUCHER_AMENITY` / `VOUCHER_SERVICE`, rỗng = mọi đối tượng
  trong phạm vi; hai element collection riêng bảng vì dùng chung bảng thì xoá một bên sẽ xoá cả bên kia). Đã có lượt
  dùng thì khoá mã / loại / giá trị / phạm vi / đối tượng và cấm xoá. Tiện ích / dịch vụ đang được voucher chỉ định thì
  không xoá được.
- Yêu cầu hỗ trợ: `TICKET_CATEGORY` dùng chung mọi tòa (SLA phản hồi/xử lý theo giờ, người phụ trách mặc định chỉ
  được gán nếu làm việc ở tòa của yêu cầu); `TICKET` thuộc tòa, mã `YC-yyMMdd-xxx` từ bảng đếm `TICKET_CODE_COUNTER`
  (UPDATE khoá dòng + INSERT có hint `IGNORE_ROW_ON_DUPKEY_INDEX`). Luồng trạng thái ở `TicketEnums.TicketStatus`
  (FE có bản sao `NEXT_STATUSES` chỉ để gợi ý kéo thả); chuyển sang Đang xử lý/Hoàn thành khi chưa có người xử lý →
  tự giao cho người thao tác; Huỷ bắt buộc lý do; chỉ xoá yêu cầu Mới/Huỷ. Quá hạn = còn mở và quá hạn xử lý, hoặc
  Mới và quá hạn phản hồi (`Ticket.isOverdue` + `TicketSpecifications.overdue`); `TicketService.countOverdue` sẵn cho
  Bảng điều khiển. Dòng thời gian ở bảng `TICKET_COMMENT` (entity `TicketEntry`): tạo, đổi trạng thái,
  phân công, bình luận INTERNAL/PUBLIC, đánh giá. Người xử lý = user đang hoạt động có `TICKET_WRITE` và làm việc ở
  tòa (`AppUserRepository.findHandlers`). Căn hộ/cư dân có yêu cầu thì không xoá được.
- Sau khi ghi mà cần quan hệ chỉ đọc mới (tệp đính kèm, người xử lý gán qua cột id), `TicketService.reloaded`
  (flush + clear + đọc lại) chắc chắn hơn `entityManager.refresh` khi thêm phần tử con mới qua merge.
- FE dùng chung mới: `DataTable.highlightRow` (tô đỏ dòng), `components/form/AttachmentList` (nhiều tệp),
  `features/resident/components/ResidentPicker`, `ApartmentPicker` có `optional`. Kanban dùng HTML5 drag-and-drop
  (không thêm thư viện), có menu ⋮ trên thẻ làm cách thay thế bằng bàn phím.
- Tài liệu: `DOCUMENT_CATEGORY` dùng chung mọi tòa (tên duy nhất toàn hệ thống, màu chip `#RRGGBB`; FE gọi với
  `skipBuildingContext`); `DOCUMENT` thuộc tòa, mã bỏ trống = số tăng dần trong tòa, thẻ ở `DOCUMENT_TAG`
  (@ElementCollection, lọc bằng subquery), "Đối tượng" = `AUDIENCE`. Tệp: FE tải lên `POST /files` (purpose DOCUMENT)
  rồi gửi `fileId`; `FileService.requireOwnUpload` kiểm tra mục đích + người tải. "Thay file" chuyển tệp cũ sang
  `DOCUMENT_FILE_VERSION` và tăng `FILE_VERSION_NO`. Xem trước/tải qua `/documents/{id}/content` và
  `/documents/{id}/versions/{versionId}/content` (có kiểm tra quyền tòa), dùng chung `FileContentResponses`.
  Xoá tài liệu xoá cả tệp: `FileService.deleteAll` xoá bản ghi ngay, tệp vật lý sau khi commit.
- Cư dân: `RESIDENT` (thuộc tòa) + `APARTMENT_RESIDENT` (mỗi lần ở một căn; chuyển đi thì giữ lại với
  `RESIDENCE_STATUS = MOVED_OUT`). Tình trạng chung của cư dân tính từ các lần cư trú (`Resident.overallStatus`),
  lọc bằng subquery. Mỗi căn tối đa một chủ hộ chính (OWNER, chưa chuyển đi) — chặn ở service (409 trường
  `householdHead`) và index hàm `UK_APARTMENT_RESIDENT_PRIMARY`. Ngày chuyển đi ≤ hôm nay → MOVED_OUT ngay; ngày
  tương lai do `ResidentMoveOutJob` (00:10) áp dụng. Số giấy tờ chỉ trả đầy đủ ở chi tiết; danh sách/xuất Excel dùng
  `idNumberMasked`. Chỉ xoá được cư dân đã chuyển đi khỏi mọi căn; căn hộ còn bản ghi cư dân (kể cả lịch sử) không xoá
  được. Cột "Chủ sở hữu" của căn hộ tính theo lô trong `ApartmentService.ownerNames` (chia IN theo 1000),
  "Thành viên" là `@Formula memberCount`; thống kê tòa ở `BuildingRepository.countResidents/countOccupiedApartments`.
- Phase 7 còn để lại: tác vụ "Tạo tài khoản app" và trạng thái `APP_ACCOUNT_STATUS` ACTIVE/LOCKED làm cùng app cư
  dân (hiện luôn NONE).
- Ảnh demo (chỉ profile local, `bihome.demo-images.enabled`): `common/storage/DemoImageSeeder` lúc khởi động gắn ảnh
  chụp thật trong `resources/demo-images/<loại>/<nhóm>-<n>.jpg` (Unsplash License / randomuser.me, tải bằng
  `backend/tools/download_demo_images.py` — script ghi rõ id ảnh nguồn) cho tòa nhà / căn hộ / tiện ích / dịch vụ chưa
  có ảnh và cư dân chưa có ảnh đại diện, chọn nhóm theo loại / từ khoá tên rồi xoay vòng biến thể (thứ tự mã trong tòa).
  Thêm / bớt ảnh một nhóm thì sửa cả `VARIANTS` của seeder (`DemoImageSeederTest` kiểm tra khớp số tệp). Ghi JDBC, tệp
  `CREATED_BY = 'demo-seed'`; mỗi mục đích chỉ gắn một lần (gỡ ảnh không bị gắn lại — muốn gắn lại thì xoá các dòng
  `demo-seed` của mục đích đó), mất `storage/` thì tự chép lại.
- Chế độ lưới (thẻ có ảnh): `components/CardGrid` — ảnh 16:9 (`placeholderIcon` khi chưa có ảnh), `renderBadge` chip ở góc
  ảnh, `getDetails` nhãn trái / giá trị phải (`wrap` cho giá trị dài), `getAccentColor` viền trái theo trạng thái; nút
  chuyển `components/ListPage/ViewToggle` (ListToolbar tự hiện khi truyền `view`). Thẻ căn hộ dùng chung ở
  `features/apartment/components/apartmentCard.tsx` (Danh sách căn hộ + tab Căn hộ của tòa nhà).
- FE dùng chung mới: `components/ImportExcelDialog` (nhập Excel theo tòa đang chọn), `components/AvatarUpload`
  (`purpose` AVATAR | RESIDENT_AVATAR), `CardGrid.renderMedia`, `DataTable` không truyền phân trang thì ẩn thanh phân
  trang, `FormCheckbox` hiện lỗi của trường, `features/apartment/components/ApartmentPicker` (đã chuyển từ asset).
- Boolean ở entity luôn kèm `@Convert(converter = NumericBooleanConverter.class)` (cột `NUMBER(1)`); thiếu thì
  Hibernate trên Oracle 23ai đòi kiểu BOOLEAN và `ddl-auto=validate` làm hỏng khởi động.
- Dùng chung cho module building-scoped: `BuildingService.listScope(buildingId)` (phạm vi danh sách),
  `requireActive(id, message)` (tòa phải hoạt động khi thêm), `canAccess(buildingId)` (chặn xem bản ghi tòa khác → 404);
  `ApartmentService.requireAccessible(id)`, `GET /apartments/options` + FE `ApartmentPicker` để chọn căn hộ.
- Job định kỳ: `@Scheduled(..., zone = "Asia/Ho_Chi_Minh")`; bật bởi `SchedulingConfig`, integration test tắt bằng
  `bihome.scheduling.enabled=false` (đặt trong `AbstractIT`).
- Kết nối DB đặt `NLS_SORT = VIETNAMESE` (Hikari `connection-init-sql`) để ORDER BY theo chữ cái tiếng Việt.
- Zod 4: không dùng `.refine(v => v != null)` trên field nullable của form (thu hẹp kiểu output làm lệch kiểu
  useForm/Form*); dùng `superRefine` như `features/asset/schema.ts`. Lỗi API có tên trường khác form thì truyền
  `aliases` cho `applyFieldErrors`.
- Module building-scoped mẫu (full-stack): `backend/.../apartment/*` + `frontend/src/features/apartment/*`.
  Phạm vi danh sách: `buildingId` trong filter → tòa đang chọn (X-Building-Id) → mọi tòa được truy cập ("Tất cả");
  tạo mới mặc định vào `BuildingContext.requireBuildingId()`, không cho đổi tòa sau khi tạo. Entity giữ
  `buildingId` để ghi + quan hệ `building` chỉ đọc (`insertable/updatable = false`) để join/sắp xếp; sau `save` mới
  phải `entityManager.refresh` để có `building`. Màn hình Tòa nhà thì ngược lại: gọi với `skipBuildingContext`.
- Ảnh của entity: `EntityImage` (@ElementCollection + @OrderColumn) + `ImageListResolver` (kiểm tra mục đích tệp,
  người tải lên, một ảnh đại diện); luôn gán danh sách mới thay vì sửa tại chỗ.
- Excel: `common/excel` (`ExcelWriter`, `ExcelReader` đọc theo tiêu đề cột, `ImportResult`, `ExcelResponses`); mẫu
  dùng: `apartment/ApartmentExcel` + `ApartmentService.importExcel` (validate cả file bằng Bean Validation, "dừng khi có
  lỗi" thì không lưu dòng nào). Nhãn tiếng Việt cho file Excel nằm ở backend (ngoại lệ của quy ước nhãn chỉ ở FE).
- Lọc cột "Tầng" so khớp chính xác (không LIKE) để lọc tầng 2 không ra tầng 12.
- Seed local dạng `R__` chạy theo thứ tự tên mô tả; file phụ thuộc dữ liệu khác phải đặt tên sắp sau
  (vd `R__seed_local_buildings_2_apartments.sql`). Không đổi tên file R__ đã chạy (Flyway báo lỗi "missing").
- FE: thêm trang thật bằng cách khai báo route trong `IMPLEMENTED` ở `frontend/src/app/router.tsx` (mục menu chưa có
  trang tự trỏ tới "Đang phát triển"); cây menu + permission ở `layouts/Sidebar/menuConfig.ts`. Trang danh sách mẫu để
  bắt chước: `features/user/pages/UserListPage.tsx` (useListParams + ListPageLayout + DataTable).
- Bộ chọn tòa nhà ở header gọi `GET /api/v1/buildings/options`: Admin hệ thống thấy mọi tòa (kể cả ngừng hoạt động),
  người khác chỉ thấy tòa được gán đang hoạt động. Người không phải Admin tạo tòa mới sẽ được tự gán vào tòa đó.
- `useListParams`: mọi thay đổi URL phải đi qua các hàm của hook (không gọi `setSearchParams` riêng), vì hook giữ bản
  params mới nhất để nhiều lần cập nhật liên tiếp không ghi đè nhau.
- Ảnh từ `/files` phải hiển thị qua `AuthImage`/`AuthAvatar`/`useAuthImage` (tải blob kèm token), không dùng `<img src>` trực tiếp.
- Quyền: SUPER_ADMIN không có dòng ROLE_PERMISSION mà được cấp **mọi** permission khi nạp `AuthUser`; các role khác
  lấy từ ROLE_PERMISSION. Toàn bộ permission của mọi module SPEC đã seed sẵn ở V001 → module mới không cần seed lại.
- `AuthUser` được nạp lại từ DB ở mỗi request (khoá user/đổi quyền có hiệu lực ngay). Lấy qua
  `@AuthenticationPrincipal AuthUser` hoặc `CurrentUser`; tòa đang chọn qua `BuildingContext` (đã kiểm tra quyền).
- User có `mustChangePassword` chỉ gọi được `/api/v1/auth/**` (403 `PASSWORD_CHANGE_REQUIRED` với API khác).
- `BuildingScopedEntity` giữ `Long buildingId` (cột `BUILDING_ID`); migration của module phải tự thêm FK tới `BUILDING`.
- Profile `local` bật `spring.flyway.out-of-order` (V001 được thêm sau khi V002 đã chạy trên DB local).
- `bihome-claude-md.zip` chỉ là bản lưu các file tài liệu, có thể bỏ qua.

Lưu ý môi trường (Windows + Docker Desktop/WSL2):
- Oracle với datafile nằm trên overlayfs của container làm **crash cả Docker VM** lúc mở DB (mọi container chết với exit 255).
  Luôn đặt `/opt/oracle/oradata` trên volume — compose đã có; `AbstractIT` mount volume ẩn danh. Nếu engine bị treo (502 khi tạo container): tắt Docker Desktop, `wsl --shutdown`, mở lại.
- Docker 29 yêu cầu API ≥ 1.40 → `pom.xml` ghim `testcontainers.version` 1.21.4 (bản 1.21.3 mà Boot quản lý không kết nối được).
- `pnpm` 12 đọc cấu hình build script từ `frontend/pnpm-workspace.yaml` (`allowBuilds`), không đọc field `pnpm` trong `package.json`.
- Integration test `*IT` chạy bằng failsafe trong `./mvnw verify`; cần Docker đang chạy.
- Máy dev ít bộ nhớ commit: JVM của Maven giới hạn ở `backend/.mvn/jvm.config`, JVM chạy test ở `<argLine>` trong
  `pom.xml`. Nên tắt container `bihome-oracle` khi chạy `verify` (hai Oracle cùng lúc từng làm sập Docker VM).
- Test báo "Unresolved compilation problems" khi chạy `verify` không `clean`: trình biên dịch Java của IDE đã ghi đè
  class trong `target` — chạy lại với `clean`.
- Nếu `clean` báo không xoá được `target/failsafe-reports`: có shell đang đứng trong thư mục đó; nếu sau sự cố máy
  báo "cannot access <class>" khi biên dịch thì xoá hẳn `backend/target` rồi build lại.

## Cấu trúc repo (monorepo)

```
bihome/
├── CLAUDE.md               # file này
├── docker-compose.yml      # Oracle Free (BIHOMEDB) cho local
├── docs/
│   ├── SPEC.md             # đặc tả nghiệp vụ, màn hình, trường dữ liệu
│   └── PROMPTS.md          # prompt theo phase cho Claude Code
├── backend/                # Spring Boot (Java 21, Maven)
│   └── CLAUDE.md
└── frontend/               # React + TypeScript + Vite + MUI
    └── CLAUDE.md
```

## Tech stack

| Phần | Công nghệ |
|---|---|
| Backend | Java 21, Spring Boot 3.5.x, Spring Security 6 + JWT, Spring Data JPA (Hibernate 6), Flyway, MapStruct, Lombok, springdoc-openapi |
| Database | Oracle Database Free 23ai (container `gvenzl/oracle-free`), PDB/service `BIHOMEDB`, schema `BIHOME` |
| Frontend | React 19, TypeScript (strict), Vite, MUI v7, TanStack Query v5, React Router v7, React Hook Form + Zod, Axios, Zustand, dayjs |
| Lưu file | Local disk `backend/storage/` qua interface `StorageService` (sau này đổi sang MinIO/S3) |

## Chạy local

```bash
# 1. Database (lần đầu mất ~1-2 phút để khởi tạo PDB BIHOMEDB + user BIHOME)
docker compose up -d oracle
docker compose logs -f oracle          # chờ "DATABASE IS READY TO USE!"

# 2. Backend — http://localhost:8080, Swagger: http://localhost:8080/swagger-ui.html
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# 3. Frontend — http://localhost:5173 (Vite proxy /api -> :8080)
cd frontend && pnpm install && pnpm dev
```

Kết nối DB local: `jdbc:oracle:thin:@localhost:1521/BIHOMEDB`, user `bihome` / `bihome`.
Tài khoản seed (Flyway, chỉ profile `local`): `admin` / `Admin@123` — vai trò Admin hệ thống.

`docker-compose.yml` mẫu:
```yaml
services:
  oracle:
    image: gvenzl/oracle-free:23-slim-faststart
    container_name: bihome-oracle
    ports: ["1521:1521"]
    environment:
      ORACLE_PASSWORD: oracle            # mật khẩu SYS/SYSTEM, chỉ dùng local
      ORACLE_DATABASE: BIHOMEDB          # tạo PDB BIHOMEDB
      APP_USER: bihome
      APP_USER_PASSWORD: bihome
    volumes: [bihome-oracle-data:/opt/oracle/oradata]
    healthcheck:
      test: ["CMD", "healthcheck.sh"]
      interval: 10s
      retries: 30
volumes:
  bihome-oracle-data:
```

## Quy ước chung (áp dụng cả BE và FE)

- **Ngôn ngữ**: code, tên bảng/cột, enum, API path bằng tiếng Anh. Nhãn hiển thị, thông báo lỗi trả về người dùng, comment nghiệp vụ bằng tiếng Việt.
- **API**: prefix `/api/v1`, REST, JSON camelCase. Lỗi trả về dạng RFC 7807 `ProblemDetail` (xem `backend/CLAUDE.md`).
- **Phân trang**: request `page` (bắt đầu từ 0), `size` (10/20/50), `sort=field,asc|desc`. Response `PageResponse<T>` gồm `content, page, size, totalElements, totalPages`.
- **Ngày giờ**: API dùng ISO-8601 (`2026-10-02T10:51:00+07:00`), DB lưu `TIMESTAMP WITH TIME ZONE`, UI hiển thị `DD/MM/YYYY HH:mm`. Múi giờ mặc định `Asia/Ho_Chi_Minh`.
- **Enum**: lưu mã tiếng Anh (`ACTIVE`, `INACTIVE`, `RENT`, `OWN`...). Nhãn tiếng Việt chỉ nằm ở FE (`constants.ts` của từng feature).
- **Ngữ cảnh tòa nhà**: hầu hết dữ liệu thuộc 1 tòa nhà. FE gửi header `X-Building-Id` theo tòa nhà đang chọn ở header; BE lọc theo đó và kiểm tra user có quyền với tòa nhà. Nút "Tất cả" = bỏ lọc tòa nhà (chỉ vai trò được phép xem nhiều tòa).
- **Audit**: mọi bảng nghiệp vụ có `CREATED_AT, UPDATED_AT, CREATED_BY, UPDATED_BY, VERSION`.
- **Xoá**: mặc định chặn xoá cứng khi còn dữ liệu phụ thuộc; ưu tiên chuyển trạng thái `INACTIVE`. Chỉ xoá cứng khi SPEC nói rõ.

## Quy trình làm việc với Claude Code

1. Trước khi code một module: đọc mục tương ứng trong `docs/SPEC.md`, liệt kê kế hoạch (migration → entity → API → FE) và chờ xác nhận nếu thay đổi lớn.
2. Làm theo chiều dọc từng module: migration Flyway → entity/repository → service + test → controller → cập nhật Swagger → FE types/api/hooks → trang list/grid → form dialog.
3. Sau mỗi module chạy được:
   - BE: `cd backend && ./mvnw clean verify`
   - FE: `cd frontend && pnpm typecheck && pnpm lint && pnpm test --run`
4. Commit theo Conventional Commits: `feat(building): ...`, `fix(auth): ...`, `chore(db): ...`.

## Definition of Done cho một module

- [ ] Migration Flyway mới (không sửa migration đã chạy), có index cho cột filter/unique.
- [ ] API CRUD + list có filter/phân trang/sắp xếp, validate đầu vào, phân quyền `@PreAuthorize`.
- [ ] Test service (unit) + ít nhất 1 integration test controller.
- [ ] FE: trang danh sách (list và grid nếu SPEC yêu cầu), filter theo cột, form thêm/sửa, xác nhận xoá, toast thông báo, trạng thái loading/empty/error.
- [ ] Menu sidebar + breadcrumb + route đã đăng ký.

## KHÔNG được làm

- Không dùng `spring.jpa.hibernate.ddl-auto=update/create` — schema chỉ thay đổi qua Flyway.
- Không sửa file migration đã commit; luôn tạo version mới.
- Không đặt tên bảng/cột trùng từ khoá Oracle: `USER, LEVEL, SIZE, FILE, COMMENT, ACCESS, MODE, NUMBER, DATE, UID, ORDER, GROUP` (dùng `APP_USER`, `FLOOR_NO`, `FILE_SIZE`, `FILE_ATTACHMENT`, `NOTE`...).
- Không commit secret, file `.env`, thư mục `storage/`, dữ liệu thật của cư dân.
- Không sao chép logo/nhận diện thương hiệu của sản phẩm tham khảo; dùng logo và màu của BiHome.

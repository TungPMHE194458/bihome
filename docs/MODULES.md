# Ghi chú triển khai theo module

Luật nghiệp vụ và chi tiết kỹ thuật **đã chốt trong code** của từng module (bổ sung cho `SPEC.md` — SPEC là đặc tả,
file này là những gì code thực sự làm và các quyết định không suy ra được ngay từ đọc một file). Đọc mục tương ứng
trước khi sửa một module. Kiến trúc xuyên suốt ở `../CLAUDE.md`; mẫu / bẫy kỹ thuật chung ở `backend/CLAUDE.md`,
`frontend/CLAUDE.md`.

## Người dùng, vai trò & phân quyền

- `RoleService` — Admin hệ thống luôn toàn quyền (không sửa được), vai trò hệ thống sửa được quyền nhưng không xoá, vai
  trò tự tạo xoá được khi chưa gán. FE ma trận module × Xem/Thêm-sửa/Xoá/Xuất (bật quyền khác tự bật Xem, tắt Xem tắt
  hết). Người dùng: `UserFormDialog` gán vai trò/tòa (Admin hệ thống không cần tòa), mật khẩu tạm hiện một lần ở
  `TemporaryPasswordDialog`.
- Người không phải Admin hệ thống: chỉ thấy / sửa người dùng cùng tòa (không gồm Admin hệ thống), chỉ gán tòa của mình,
  không gán vai trò / cấp quyền vượt quá quyền của mình; lịch sử đăng nhập chỉ Admin hệ thống.
- **Thiết bị đang đăng nhập** của nhân viên ở `/settings/users` (dialog, dùng `REFRESH_TOKEN` sẵn có, không cần
  migration — mỗi family refresh token xoay vòng chỉ có đúng 1 dòng chưa thu hồi tại một thời điểm, đăng xuất 1 thiết bị
  = thu hồi cả family đó qua `RefreshTokenService.revokeOne`); nhân viên **không** có lịch sử đăng nhập theo từng người
  (đã có "Lịch sử đăng nhập" dùng chung ở `/settings/audit-logs`, chỉ Admin hệ thống).
- Trang ghim: bảng `USER_PINNED_PAGE` (`/profile/pinned-pages`, JDBC, không audit); FE `usePinnedPagesSync` (MainLayout)
  tải theo người đăng nhập và lưu lại khi đổi, `uiStore` không còn lưu ghim trong localStorage.

## Tòa nhà, căn hộ

- Bộ chọn tòa nhà ở header gọi `GET /api/v1/buildings/options`: Admin hệ thống thấy mọi tòa (kể cả ngừng hoạt động),
  người khác chỉ thấy tòa được gán đang hoạt động. Người không phải Admin tạo tòa mới sẽ được tự gán vào tòa đó.
- Cột "Chủ sở hữu" của căn hộ tính theo lô trong `ApartmentService.ownerNames` (chia IN theo 1000), "Thành viên" là
  `@Formula memberCount`; thống kê tòa ở `BuildingRepository.countResidents/countOccupiedApartments`.
- Lọc cột "Tầng" so khớp chính xác (không LIKE) để lọc tầng 2 không ra tầng 12.
- Hạng mục xe ở chế độ "Tất cả" tòa lọc theo tên danh mục (`categoryName`).
- Căn hộ không xoá được khi còn: bản ghi cư dân (kể cả lịch sử), yêu cầu, đăng ký / đơn / giao dịch, phản hồi khảo sát,
  số liệu / thông báo phí / phiếu thu.

## Cư dân

- `RESIDENT` (thuộc tòa) + `APARTMENT_RESIDENT` (mỗi lần ở một căn; chuyển đi thì giữ lại với
  `RESIDENCE_STATUS = MOVED_OUT`). Tình trạng chung của cư dân tính từ các lần cư trú (`Resident.overallStatus`), lọc
  bằng subquery.
- Mỗi căn tối đa một chủ hộ chính (OWNER, chưa chuyển đi) — chặn ở service (409 trường `householdHead`) và index hàm
  `UK_APARTMENT_RESIDENT_PRIMARY`.
- Ngày chuyển đi ≤ hôm nay → MOVED_OUT ngay; ngày tương lai do `ResidentMoveOutJob` (00:10) áp dụng.
- Số giấy tờ chỉ trả đầy đủ ở chi tiết; danh sách/xuất Excel dùng `idNumberMasked`.
- Chỉ xoá được cư dân đã chuyển đi khỏi mọi căn (và không có yêu cầu, phản hồi khảo sát, đăng ký / đơn / giao dịch).

## Thẻ từ

- `ACCESS_CARD` thuộc tòa, mã thẻ in hoa duy nhất toàn hệ thống. Luồng ở `AccessCardEnums.CardStatus`: Trong kho →
  (`POST /{id}/issue` Cấp thẻ) Đang dùng ⇄ Khoá → Báo mất / Thu hồi → Trong kho. Đang dùng / Khoá luôn gắn căn hộ (CHECK
  ở DB); Thu hồi / Trong kho bỏ gắn; Báo mất giữ người làm mất.
- Cư dân phải đang ở căn của thẻ; xe chỉ gắn thẻ Gửi xe / Đa năng, mỗi xe một thẻ đang dùng (index hàm).
- `ACCESS_CARD_HISTORY` lưu căn hộ/cư dân dạng chữ (không FK) để không chặn xoá về sau.
- Chuyển đi (`ResidentService.moveOut` / sửa cư trú) gọi `AccessCardService.revokeForResident`; `ResidentMoveOutJob`
  gọi thêm `revokeOrphaned` cho chuyển đi theo ngày hẹn.
- Cột "Mã thẻ từ" của xe là `@Formula AssetItem.accessCardNo` (lọc được).
- Cấp thẻ có `issueFee` > 0 sinh giao dịch (một lần cho mỗi thẻ).

## Voucher

- `VOUCHER` thuộc tòa, mã duy nhất toàn hệ thống; `validity` (UPCOMING/VALID/EXPIRED) tính theo ngày, lọc được.
- Đối tượng cụ thể (`VOUCHER_AMENITY` / `VOUCHER_SERVICE`, rỗng = mọi đối tượng trong phạm vi; hai element collection
  riêng bảng vì dùng chung bảng thì xoá một bên sẽ xoá cả bên kia).
- Dùng thật: `voucher/VoucherRedemptionService` (`preview` cho form tính thử, `redeem` khoá dòng voucher + tăng
  `USED_COUNT`, `recordUsage` ghi `VOUCHER_USAGE`, `release` trả lượt). Hiệu lực theo ngày sử dụng; kiểm tra tòa, trạng
  thái, phạm vi, tiện ích/dịch vụ cụ thể, tổng lượt, giới hạn mỗi căn. `usedCount` không ghi lịch sử hoạt động.
- Đã có lượt dùng thì khoá mã / loại / giá trị / phạm vi / đối tượng và cấm xoá. Tiện ích / dịch vụ đang được voucher
  chỉ định thì không xoá được.

## Tài liệu

- `DOCUMENT_CATEGORY` dùng chung mọi tòa (tên duy nhất toàn hệ thống, màu chip `#RRGGBB`; FE gọi với
  `skipBuildingContext`); `DOCUMENT` thuộc tòa, mã bỏ trống = tự sinh `TL-yyMMdd-xxx`, thẻ ở `DOCUMENT_TAG`
  (@ElementCollection, lọc bằng subquery), "Đối tượng" = `AUDIENCE`.
- Tệp: FE tải lên `POST /files` (purpose DOCUMENT) rồi gửi `fileId`; `FileService.requireOwnUpload` kiểm tra mục đích +
  người tải. "Thay file" chuyển tệp cũ sang `DOCUMENT_FILE_VERSION` và tăng `FILE_VERSION_NO`. Xem trước/tải qua
  `/documents/{id}/content` và `/documents/{id}/versions/{versionId}/content` (có kiểm tra quyền tòa), dùng chung
  `FileContentResponses`.
- Xoá tài liệu xoá cả tệp: `FileService.deleteAll` xoá bản ghi ngay, tệp vật lý sau khi commit.

## Yêu cầu hỗ trợ

- `TICKET_CATEGORY` dùng chung mọi tòa (SLA phản hồi/xử lý theo giờ, người phụ trách mặc định chỉ được gán nếu làm việc
  ở tòa của yêu cầu); `TICKET` thuộc tòa, mã `YC-yyMMdd-xxx`.
- Luồng trạng thái ở `TicketEnums.TicketStatus` (FE có bản sao `NEXT_STATUSES` chỉ để gợi ý kéo thả); chuyển sang Đang
  xử lý/Hoàn thành khi chưa có người xử lý → tự giao cho người thao tác; Huỷ bắt buộc lý do; chỉ xoá yêu cầu Mới/Huỷ.
- Quá hạn = còn mở và quá hạn xử lý, hoặc Mới và quá hạn phản hồi (`Ticket.isOverdue` +
  `TicketSpecifications.overdue`); `TicketService.countOverdue` dùng cho Bảng điều khiển.
- Dòng thời gian ở bảng `TICKET_COMMENT` (entity `TicketEntry`): tạo, đổi trạng thái, phân công, bình luận
  INTERNAL/PUBLIC, đánh giá. Người xử lý = user đang hoạt động có `TICKET_WRITE` và làm việc ở tòa
  (`AppUserRepository.findHandlers`).
- Thông báo qua `ticket/TicketNotifier` (tạo mới → người xử lý của tòa, giao việc, đổi trạng thái, bình luận).
- FE Kanban dùng HTML5 drag-and-drop (không thêm thư viện), có menu ⋮ trên thẻ làm cách thay thế bằng bàn phím.

## Tiện ích, đăng ký, dịch vụ, giao dịch

- **Tiện ích**: `AMENITY` thuộc tòa, mã in hoa duy nhất toàn hệ thống, giờ mở/đóng cửa lưu VARCHAR2(5) 'HH:mm'
  (`HhmmTimeConverter`, DTO `@JsonFormat(pattern = "HH:mm")`). `AMENITY_CONFIG` (PK = AMENITY_ID, tạo kèm khi thêm tiện
  ích, có VERSION riêng) giữ thời lượng lượt, số lượt tối đa/căn/tuần, đặt trước tối đa, huỷ miễn phí trước + 3 element
  collection `AMENITY_SLOT` (khung theo thứ 1=T2…7=CN, sức chứa riêng tuỳ chọn), `AMENITY_PRICE` (WEEKDAY/WEEKEND theo
  giờ bắt đầu của lượt, PER_BOOKING/PER_PERSON), `AMENITY_MAINTENANCE` (khoảng ngày nghỉ). Không có khung giờ = đóng cửa
  ngày đó. `AmenityConfig.priceFor(date, start)` / `isUnderMaintenance(date)` dùng cho đặt chỗ. Sửa giờ mở cửa bị chặn
  nếu khung giờ hiện có nằm ngoài (lỗi field `slots` → form tiện ích truyền danh sách field để rơi về toast). FE
  `AmenityConfigPage` (`/amenity-configs?amenityId=`) + `WeeklySlotEditor`; `findOverlap` ở FE cùng định dạng thông báo
  với backend.
- **Đăng ký** (`booking/`): `BookingService.create` khoá dòng `AMENITY_CONFIG` (`findForUpdate`, SELECT ... FOR UPDATE)
  rồi mới kiểm tra khung giờ (phải trùng một khung đã cấu hình cho thứ của ngày), sức chứa khung (tổng người các lượt
  PENDING/APPROVED/COMPLETED giao giờ), giới hạn lượt / căn / tuần (thứ 2–CN), đặt trước tối đa, ngày bảo trì. Cần duyệt
  → PENDING (báo `BOOKING_PENDING` cho người có `AMENITY_BOOKING_WRITE` ở tòa), không → APPROVED. Phí =
  `AmenityConfig.priceFor` × (số người nếu PER_PERSON) − voucher. Huỷ: Chờ duyệt hoặc trước `freeCancelUntil` → trả
  voucher + huỷ khoản chưa thu / hoàn khoản đã thu; huỷ muộn giữ phí. `BookingCompletionJob` (15 phút) chuyển lượt đã
  duyệt hết giờ → Hoàn thành. Mã `DK-…`.
- **Dịch vụ**: `SERVICE_TYPE` dùng chung mọi tòa (tên duy nhất, chặn xoá khi còn dịch vụ); `SERVICE` (entity
  `ServiceOffering`) thuộc tòa, mã duy nhất trong tòa, bỏ trống thì tự sinh `SP-yyMMdd-xxx`; đơn giá VND nguyên + đơn vị
  tự do.
- **Đơn dịch vụ** (`servicecatalog/ServiceOrder*`, FE tab "Đơn dịch vụ" ở `/services?tab=orders`, mã `DV-…`): số lượng ×
  đơn giá hiện hành (làm tròn đồng) − voucher; Chờ xác nhận → Đã xác nhận → Hoàn thành; huỷ trả voucher + huỷ / hoàn
  khoản phí.
- **Giao dịch** (`transaction/`, bảng `FINANCIAL_TRANSACTION` — tránh từ khoá TRANSACTION, mã `GD-…`): mỗi nguồn (đăng
  ký, đơn dịch vụ, thẻ từ, thông báo phí) tối đa một giao dịch; nguồn gọi `TransactionService.record / pay / cancel /
  refund`. Màn hình chỉ đọc + xuất Excel; thu phí ghi nhận ở đăng ký / đơn (`POST .../pay`). Giao dịch PENDING được cộng
  vào thông báo phí kỳ tới (mục Tài chính).
- **Báo cáo tiện ích** (`amenityreport/`): theo ngày sử dụng [from, to] ≤ 366 ngày; lấp đầy = người giữ chỗ / tổng sức
  chứa các khung giờ (bỏ ngày bảo trì); doanh thu theo giao dịch PENDING + PAID, "đã thu" = PAID; xuất Excel nhiều sheet.
- Xoá tiện ích / dịch vụ / căn hộ / cư dân bị chặn khi đã có đăng ký, đơn hoặc giao dịch liên quan.

## Tài chính (số liệu, đơn giá, thông báo phí, thanh toán, VietQR)

- **Đơn giá** `FEE_RATE_CONFIG` (PK = BUILDING_ID, chưa lưu thì dùng cấu hình rỗng): VAT %, ngày hạn (ngày N của tháng
  sau kỳ), element collection quản lý theo loại căn, bậc điện / nước (hai bảng riêng, `@OrderColumn` TIER_NO từ 0, bậc
  cuối `UP_TO` null), gửi xe theo danh mục tài sản (FK ON DELETE CASCADE), phí khác. Kỳ là chuỗi `yyyy-MM`
  (`common/util/BillingPeriods`).
- **Số liệu** `METER_READING` (duy nhất căn + loại + kỳ): chỉ số cũ luôn = chỉ số mới kỳ liền trước — thêm / sửa / xoá
  một kỳ thì `MeterReadingService.applyChain` tính lại cả chuỗi (kiểm tra hết rồi mới ghi), chỉ kỳ đầu được nhập chỉ số
  cũ; cảnh báo khi tiêu thụ > 3 × trung bình 3 kỳ trước (`AVERAGE_CONSUMPTION` lưu sẵn); kỳ đã có thông báo phí phát hành
  (`FeeNoticeRepository.isLocked`) thì khoá; lưới theo tầng `/meter-readings/sheet` và nhập Excel theo kỳ.
- **Tính tiền** ở `feenotice/FeeCalculator` (thuần, mỗi bậc điện / nước một dòng, VAT trên các khoản của kỳ, dòng
  SERVICE = giao dịch PENDING chưa gắn thông báo, PREVIOUS_DEBT = thông báo kỳ trước còn nợ).
- **Thông báo phí**: tạo hàng loạt `POST /fee-notices/preview` rồi `/generate` → nháp (mã `TB-yyMMdd-xxx`), gắn ngay
  giao dịch vào `FINANCIAL_TRANSACTION.FEE_NOTICE_ID` (không vào hai thông báo; `TransactionService.pay` chặn thu riêng,
  `cancel` qua `FeeNoticeLinks` bỏ dòng khỏi nháp hoặc chặn nếu đã phát hành). Nháp sửa được khoản (VAT tự tính lại,
  dòng hệ thống chỉ được bỏ), "Tính lại", xoá; phát hành kiểm tra nợ kỳ trước chưa đổi rồi đặt `CARRIED_TO_ID` cho thông
  báo cũ (còn nợ = 0, không thu riêng; giao dịch chưa thu của nó chuyển theo), gửi email cư dân qua `MessageSender`. Huỷ
  chỉ khi chưa có phiếu thu (trả nợ + giao dịch về thông báo cũ). Trạng thái thu theo `FeeNotice.collectedStatus`
  (PAID / OVERDUE / PARTIAL / ISSUED); `FeeNoticeOverdueJob` 00:20.
- **Phiếu thu** `PAYMENT` (mã `PT-…`): khoá dòng thông báo (`findForUpdate`), không vượt số còn nợ, tiền mặt = Đã khớp,
  chuyển khoản / VietQR nhập tay = Chờ khớp (đối soát tay); huỷ cần lý do, không huỷ được khi nợ đã chuyển kỳ sau; thu đủ
  → giao dịch gắn kèm PAID (huỷ phiếu thì về PENDING).
- **VietQR**: `VIETQR_CONFIG` theo tòa, chuỗi EMVCo + CRC16 tự sinh ở `vietqr/VietQrPayload`, ảnh `QrImages` (ZXing);
  webhook `POST /api/v1/webhooks/bank` (permitAll, header `X-Webhook-Secret` = `bihome.bank-webhook.secret`, trống = từ
  chối), `BANK_TRANSACTION` duy nhất theo mã tham chiếu (gửi lại → DUPLICATE), tìm mã `TB…` trong nội dung (chấp nhận
  mất gạch nối) → phiếu thu tự động MATCHED / MISMATCHED + thông báo `PAYMENT_RECEIVED`; giả lập
  `POST /vietqr-settings/simulate` chỉ khi `bihome.bank-webhook.simulation-enabled` (bật ở local / test). Webhook / giả
  lập chỉ khớp thông báo phí của tòa sở hữu tài khoản nhận (giả lập: đúng tòa của thông báo).
- **PDF** thông báo phí (có QR) và phiếu thu ở `common/pdf` (OpenPDF 2.0.5, font Be Vietnam Pro OFL trong
  `resources/fonts`; font không có "→" nên PDF thay bằng "–").
- Bảng điều khiển: `feeDebt` = còn nợ tới kỳ chọn, tỉ lệ thu = phần phát sinh của kỳ gần nhất đã phát hành (tiền thu
  trừ nợ cũ trước), `feeByPeriod` 6 kỳ.

## Nhắc nhở & khảo sát

- Đối tượng nhận chung `resident/ResidentAudienceService` (ALL / FLOOR / APARTMENT / RESIDENT → cư dân chưa chuyển đi;
  `validateTargets`, `describe`, `apartmentInAudience`); FE `AudienceFields` (gọi `/reminders/floors` và
  `POST /reminders/preview-recipients`, mở cho cả `SURVEY_WRITE`).
- `REMINDER`: NOW / ONCE / MONTHLY (`ReminderSchedule.nextMonthly` — tháng thiếu ngày thì lấy ngày cuối tháng), Nháp →
  Đã lên lịch → Đã gửi / Huỷ; mỗi lần gửi ghi `REMINDER_DELIVERY` (cư dân/căn hộ lưu dạng chữ, không FK) theo từng
  kênh. Email/SMS qua `MessageSender` (hiện chỉ ghi log); kênh Trong app vào hộp thư app cư dân.
- `EngagementJob` (mỗi phút) gửi nhắc nhở đến hạn và đóng khảo sát hết hạn.
- Nội dung soạn thảo: FE `components/form/RichTextEditor` (contentEditable, không thư viện) + `RichTextView`; BE luôn
  lọc qua `common/messaging/RichText.sanitize` (jsoup Safelist) trước khi lưu.
- `SURVEY`: Nháp → Đang mở → Đã đóng; câu hỏi SINGLE / MULTIPLE / TEXT / RATING (FE `QuestionBuilder` kéo thả HTML5 +
  nút lên/xuống). Đã có phản hồi thì khoá câu hỏi và chế độ ẩn danh (409), cấm xoá; mỗi cư dân một phản hồi (index
  hàm), cư dân phải đang ở căn và thuộc đối tượng. BQL nhập phản hồi hộ (`POST /surveys/{id}/responses`).
- Khảo sát qua app: bảng `SURVEY_PARTICIPANT` chặn trả lời hai lần kể cả ẩn danh; khảo sát ẩn danh chạy
  `SurveyService.submit` dưới người thao tác "Cư dân (ẩn danh)" để CREATED_BY / lịch sử không lộ người trả lời;
  `SurveyService.respondent` nhận đối tượng RESIDENT (theo `residentId`).

## Thông báo & SOS

- `NOTIFICATION` (của từng người dùng, không audit) tạo qua `NotificationService.notify` (bỏ qua chính người thao tác),
  push tới thiết bị nhân viên sau commit. Chuông header hỏi `unread-count` mỗi 30 giây.
- `ANNOUNCEMENT` (thuộc tòa): Nháp → Hẹn giờ (`AnnouncementScheduleJob` mỗi phút) → Đã gửi (không sửa/xoá được); gửi =
  thông báo cho nhân viên đang hoạt động được gán ở tòa; đối tượng có cư dân → hộp thư app cư dân (`RESIDENT_COUNT` vẫn
  đếm mọi cư dân). Link `/announcements?view=<id>` mở xem chi tiết.
- **SOS**: `SOS_ALERT` thuộc tòa, mã `SOS-yyMMdd-xxx`; Mới → Đã tiếp nhận → Đã xử lý / Báo nhầm (kết thúc bắt buộc ghi
  chú, CHECK ở DB); BQL tạo tay (`SOURCE = MANUAL`, phải có căn hộ hoặc vị trí), app cư dân `Source.APP`; báo
  `SOS_ALERT` cho người có `SOS_READ` ở tòa. Header `features/sos/components/SosButton` hỏi `GET /sos-alerts/active` mỗi
  15 giây: badge số đang mở, nhấp nháy khi còn cảnh báo Mới, phát âm báo (Web Audio, `playAlarm`) khi `latestId` tăng so
  với lần hỏi trước.

## Lịch sử hoạt động (audit)

- Entity có `@AuditTrail(module, type, label, ignore, mask, building | buildingSql)` được `audit/AuditEventListener` (gắn
  vào Hibernate qua `AuditListenerRegistrar`) ghi `AUDIT_LOG` bằng JDBC ngay trước khi commit
  (`BeforeTransactionCompletionProcess`, cùng transaction; rollback thì không ghi).
- Ghi thay đổi từng trường (cũ → mới, gộp nhiều lần sửa trong một transaction), cả collection (vai trò, tòa phụ trách,
  ảnh, khung giờ...); `status` đổi → `STATUS_CHANGE`; `passwordHash`/`idNumber`/token luôn che `***`.
- Cập nhật bằng JPQL bulk (vd ghi nhận đăng nhập) không qua listener. Xoá entity dùng `buildingSql` tra tòa ngay lúc xoá
  (bản ghi cha có thể bị xoá trước khi commit).
- Có cả `FINANCIAL_TRANSACTION` (thu / huỷ / hoàn giao dịch) và `SURVEY_RESPONSE` (không ghi nội dung câu trả lời).
- Phạm vi xem: tòa đang chọn (hoặc các tòa được gán) + dữ liệu dùng chung; người không phải Admin hệ thống không thấy
  module USER/ROLE/SETTING. FE: trang `/settings/audit-logs` (tab Lịch sử đăng nhập cần `USER_READ`), nút ⟲ ở header, và
  nút ⟲ dưới breadcrumb của mọi trang tự mở `AuditHistoryDrawer` theo module của mục menu (`lib/modules.ts`).

## Cấu hình chung & bảng điều khiển

- Bảng một dòng `SYSTEM_SETTING` (ID = 1, tạo ở V160), `setting/SettingService.current()` giữ bản đọc trong bộ nhớ (làm
  mới sau commit khi lưu). Dùng ở: `AuthService` (số lần sai trước khi tạm khoá, số phút khoá), PDF thông báo phí /
  phiếu thu (dòng "Đơn vị quản lý…" + chân trang), `FeeNoticeService` (bật/tắt email khi phát hành). Quyền SETTING_READ
  / SETTING_WRITE (Trưởng BQL chỉ xem).
- Bảng điều khiển: `GET /dashboard?month=yyyy-MM` (SQL thuần, phạm vi `listScope`), Admin hệ thống thêm số liệu hệ thống
  (dung lượng tệp, người dùng, đăng nhập hôm nay); có lượt đăng ký tiện ích hôm nay / trong tháng và 8 tuần gần nhất.
  Công nợ / tỉ lệ thu phí xem mục Tài chính. Biểu đồ dùng `@mui/x-charts`.
- Đo hiệu năng (10.000 căn hộ + 10.000 thông báo phí, local): danh sách / lọc / sắp xếp / dashboard 24–40 ms.

## App cư dân (`residentapp/`, `mobile/`)

- V170: `RESIDENT_ACCOUNT` đăng nhập bằng SĐT duy nhất toàn hệ thống, `RESIDENT_REFRESH_TOKEN` xoay vòng — dùng lại
  token cũ thu hồi mọi phiên, `RESIDENT_PUSH_TOKEN`, `RESIDENT_INBOX`.
- Chuỗi bảo mật riêng `ResidentSecurityConfig` (`@Order(1)`, `/api/v1/resident/**`): JWT `typ=resident` nên token cư
  dân không gọi được API BQL và ngược lại. `ResidentAuthFilter` nạp `ResidentSession` mỗi request; principal là
  `ResidentSession.actor()` — `AuthUser` giả (id null, không permission, chỉ tòa của cư dân, username "Họ tên (cư dân
  SĐT)") để gọi lại service của module (đặt chỗ, yêu cầu, SOS `Source.APP`, phí) với nguyên luật nghiệp vụ.
  `ResidentContext.requireApartment/requireOwned` kiểm tra căn thuộc cư dân (không → 404) rồi `BuildingContext.select`
  tòa của căn.
- Tệp: `/resident/files` (`ResidentFileService` — chỉ tệp mình tải, ảnh tòa / tiện ích / dịch vụ của tòa, ảnh căn mình,
  ảnh đại diện mình và người cùng căn, tệp yêu cầu của căn mình trừ bình luận nội bộ, ảnh phiếu kê khai của căn).
- BQL cấp / khoá / mở khoá / đặt lại / xoá tài khoản ở `/residents/{id}/app-account` (đồng bộ
  `RESIDENT.APP_ACCOUNT_STATUS`; FE `features/resident/components/AppAccountPanel` trên trang chi tiết cư dân). Cùng
  panel: **Thiết bị đang đăng nhập** (`GET/POST .../app-account/sessions[/{id}/revoke]`, liệt kê
  `RESIDENT_REFRESH_TOKEN` chưa thu hồi/chưa hết hạn — mỗi lần làm mới tạo dòng mới nên đúng 1 dòng/thiết bị, đăng xuất
  riêng 1 thiết bị không ảnh hưởng thiết bị khác) và **Lịch sử đăng nhập app** (V201 `RESIDENT_LOGIN_HISTORY`,
  `.../app-account/login-history`, FE `LoginHistoryDrawer` — theo `RESIDENT_READ`/`RESIDENT_WRITE` của tòa thay vì chỉ
  Admin hệ thống). `ResidentAuthService.login` ghi mọi lần thử (thành công/thất bại) qua `ClientInfo` giống
  `AuthService`.
- Hộp thư `ResidentInboxService.toApartment/toBuilding/toResidents` (chỉ cư dân có tài khoản; push sau commit qua
  `PushSender` → Expo Push, tắt mặc định `bihome.resident-app.push-enabled`), được gọi khi: phát hành thông báo phí, ghi
  nhận thu tiền (`FeeNoticeService.applyPayment`), đổi trạng thái / BQL bình luận công khai yêu cầu (`TicketNotifier`),
  duyệt / từ chối lượt đặt, gửi thông báo có cư dân, nhắc nhở kênh `IN_APP`, phát hành khảo sát (`SURVEY`), xác nhận /
  hoàn thành đơn dịch vụ (`SERVICE_ORDER`), kết quả kê khai (`DECLARATION`).
- `residentapp/ResidentHouseholdService` (thành viên, xe, thẻ từ của căn, loại xe, kê khai, tài liệu theo đối tượng
  `DocumentService.listForAudiences` — Tất cả cư dân + Chủ sở hữu / Người thuê theo vai trò ở căn) và
  `ResidentEngagementService` (khảo sát đang mở thuộc đối tượng, đặt / huỷ đơn dịch vụ).
- Mobile: màn hình `apartment`, `declarations/*`, `services/*`, `orders/*`, `surveys/*`, `documents`; trang chủ 8 lối
  tắt; `components/form.tsx` (DateField dd/mm/yyyy, ChipSelect, Segmented, Stepper), `lib/pdf.openFile`.

## Kê khai từ cư dân (`declaration/`)

- V180 `RESIDENT_DECLARATION`, mã `KK-yyMMdd-xxx`, loại MEMBER / VEHICLE: chỉ chủ sở hữu / người thuê của căn gửi
  (`DeclarationService.canDeclare`); Chờ duyệt → Đã duyệt / Từ chối (bắt buộc lý do) / Cư dân huỷ.
- Báo BQL loại `DECLARATION` (RESIDENT_WRITE cho thành viên, ASSET_WRITE cho xe — cũng là quyền duyệt).
- Duyệt nhận bản BQL soát lại (`ApproveRequest`, trống = giữ): thành viên bắt buộc SĐT (cư dân cần SĐT duy nhất trong
  tòa) — SĐT đã thuộc cư dân khác của tòa thì `assignApartment` thay vì tạo mới, không thì `ResidentService.create`; ảnh
  thành viên (purpose RESIDENT_AVATAR, do cư dân tải) gán thẳng `avatarFileId` sau khi tạo. Xe →
  `AssetItemService.create`. Kết quả về hộp thư người gửi.
- FE `features/declaration` (`/declarations`, menu Quản lý tòa nhà; danh sách + `DeclarationDetailDialog` sửa / duyệt /
  từ chối).

## App nhân viên "BiHome Quản lý" (`mobile-staff/`)

- Gọi chung API BQL `/api/v1/**`, menu ẩn theo permission.
- Đăng nhập mobile: header `X-Client-Type: mobile` → `AuthController` trả `refreshToken` trong body
  (`TokenResponse.withRefreshToken`, web không có trường này) và không đặt cookie; refresh / logout / change-password đọc
  token từ header `X-Refresh-Token` trước, rồi cookie (CORS cho phép hai header này).
- Push nhân viên (V190 `USER_PUSH_TOKEN`, `POST/DELETE /notifications/push-tokens/{token}`): `NotificationService.notify`
  đẩy tới thiết bị người nhận sau commit qua `residentapp/PushSender` (dùng chung cờ `bihome.resident-app.push-enabled`;
  token DeviceNotRegistered bị xoá ở cả hai bảng).
- Màn hình: Tổng quan (dashboard, SOS, việc chờ duyệt, việc của tôi), Yêu cầu (lọc / nhận việc / giao / đổi trạng thái /
  bình luận nội bộ-công khai kèm ảnh), SOS (hỏi `/sos-alerts/active` 15 giây, rung khi có mới), Duyệt (đăng ký tiện
  ích, kê khai — duyệt nguyên bản + SĐT, đơn dịch vụ), Ghi chỉ số theo tầng (`/meter-readings/sheet`), Tra cứu cư dân /
  căn hộ / xe; tab Quản lý (`(tabs)/manage.tsx`) mở màn hình quản lý cho hầu hết module của web (tòa nhà, căn hộ, cư
  dân, voucher, thẻ từ, tiện ích, dịch vụ, tài liệu, thông báo phí, thanh toán, người dùng, vai trò, nhật ký...).

## Ảnh demo (local và môi trường demo)

- Bật bằng `bihome.demo-images.enabled` (local: `application-local.yml`; server: `BIHOME_DEMO_IMAGES=true`), không
  theo profile: `common/storage/DemoImageSeeder` lúc khởi động gắn ảnh chụp thật trong
  `resources/demo-images/<loại>/<nhóm>-<n>.jpg` (Unsplash License / randomuser.me, tải bằng
  `backend/tools/download_demo_images.py` — script ghi rõ id ảnh nguồn) cho tòa nhà / căn hộ / tiện ích / dịch vụ chưa
  có ảnh và cư dân chưa có ảnh đại diện, chọn nhóm theo loại / từ khoá tên rồi xoay vòng biến thể (thứ tự mã trong tòa).
- Thêm / bớt ảnh một nhóm thì sửa cả `VARIANTS` của seeder (`DemoImageSeederTest` kiểm tra khớp số tệp). Ghi JDBC, tệp
  `CREATED_BY = 'demo-seed'`; mỗi mục đích chỉ gắn một lần (gỡ ảnh không bị gắn lại — muốn gắn lại thì xoá các dòng
  `demo-seed` của mục đích đó), mất `storage/` thì tự chép lại.

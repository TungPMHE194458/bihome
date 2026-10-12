# BiHome — Đặc tả chức năng (SPEC)

Tài liệu nghiệp vụ cho Claude Code. Mỗi màn hình danh sách tuân theo khuôn `ListPageLayout` mô tả trong `frontend/CLAUDE.md`
(breadcrumb, toolbar, bảng có filter theo cột, cột Tác vụ ⋮, phân trang). Ở đây chỉ mô tả phần riêng của từng module.

Ký hiệu: (*) bắt buộc · [U] duy nhất · [F] có filter theo cột · [S] sắp xếp được · [L] hiện ở chế độ lưới.

---

## 1. Tổng quan

### 1.1 Vai trò (role)
| Mã | Tên hiển thị | Phạm vi |
|---|---|---|
| SUPER_ADMIN | Admin hệ thống | Toàn bộ tòa nhà, quản lý người dùng & cấu hình |
| BUILDING_MANAGER | Trưởng ban quản lý | Các tòa nhà được gán, toàn quyền nghiệp vụ |
| STAFF | Nhân viên vận hành | Các tòa được gán; xem + xử lý yêu cầu, nhập số liệu |
| ACCOUNTANT | Kế toán | Module Tài chính của các tòa được gán |
| RESIDENT | Cư dân | Dành cho app cư dân (giai đoạn sau), chỉ dữ liệu của mình |

Quyền chi tiết: `{MODULE}_{READ|WRITE|DELETE|EXPORT}`, gán theo role (bảng `ROLE_PERMISSION`).

### 1.2 Ngữ cảnh tòa nhà
- Header có bộ chọn tòa nhà (hiển thị tên + địa chỉ). Mọi danh sách building-scoped lọc theo tòa đang chọn.
- Riêng màn hình **Tòa nhà** không bị lọc (là nơi quản lý danh sách tòa).

### 1.3 Cây menu
```
Bảng điều khiển
VẬN HÀNH
├── Quản lý tòa nhà
│   ├── Tòa nhà                 /buildings
│   ├── Căn hộ                  /apartments
│   ├── Hạng mục căn hộ         /assets            (tab Danh mục | Hạng mục)
│   ├── Cư dân                  /residents
│   ├── Voucher                 /vouchers
│   ├── Thẻ từ                  /access-cards
│   ├── Nhắc nhở                /reminders
│   └── Khảo sát ý kiến         /surveys
├── Quản lý tiện ích
│   ├── Đăng ký tiện ích        /amenity-bookings
│   ├── Cấu hình tiện ích       /amenity-configs
│   ├── Danh mục tiện ích       /amenities
│   ├── Dịch vụ                 /services
│   ├── Loại dịch vụ            /service-types
│   ├── Lịch sử giao dịch       /transactions
│   └── Báo cáo tiện ích        /amenity-reports
├── Yêu cầu và hỗ trợ
│   ├── Yêu cầu và hỗ trợ       /tickets
│   └── Danh mục yêu cầu & hỗ trợ /ticket-categories
└── Quản lý tài liệu
    ├── Tài liệu                /documents
    └── Danh mục tài liệu       /document-categories
TÀI CHÍNH
└── Thông báo phí
    ├── Thông báo phí           /fee-notices
    ├── Số liệu                 /meter-readings
    ├── Lịch sử thanh toán      /payments
    └── Thanh toán tự động (VietQR) /vietqr-settings
CÀI ĐẶT (icon rail)
├── Người dùng hệ thống         /settings/users
├── Vai trò & phân quyền        /settings/roles
└── Cấu hình chung              /settings/general
```

### 1.4 Trạng thái dùng chung
`ACTIVE` = Hoạt động (chip xanh) · `INACTIVE` = Không hoạt động / Ngừng hoạt động (chip xám).

---

## 2. Authentication

### Màn hình
- **Đăng nhập** (`/login`): Tên đăng nhập hoặc email (*), Mật khẩu (*) có nút hiện/ẩn, "Ghi nhớ đăng nhập", link "Quên mật khẩu?". Bố cục 2 cột: ảnh minh hoạ tòa nhà bên trái, form bên phải, logo BiHome.
- **Quên mật khẩu**: nhập email → gửi mã OTP 6 số (hiệu lực 10 phút; môi trường local: ghi OTP ra log). **Đặt lại mật khẩu**: OTP + mật khẩu mới + nhập lại.
- **Đổi mật khẩu** (từ UserMenu): mật khẩu hiện tại, mật khẩu mới, nhập lại.

### Quy tắc
- Mật khẩu ≥ 8 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt.
- Sai 5 lần liên tiếp → khoá 15 phút, thông báo "Tài khoản tạm khoá đến HH:mm".
- User `INACTIVE` hoặc `LOCKED` không đăng nhập được.
- Đổi/đặt lại mật khẩu → thu hồi toàn bộ refresh token.
- Ghi `LAST_LOGIN_AT`, `LOGIN_HISTORY` (thời gian, IP, user-agent, thành công/thất bại).

### API
`POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/forgot-password` · `POST /auth/reset-password` · `POST /auth/change-password` · `GET /auth/me` (user + profile + roles + permissions + danh sách tòa nhà được gán).

---

## 3. Người dùng & Hồ sơ (APP_USER 1–1 USER_PROFILE)

### Dữ liệu
- `APP_USER`: username [U](*), email [U](*), phone [U], password_hash, status (`ACTIVE|INACTIVE|LOCKED`), failed_login_count, locked_until, last_login_at.
- `USER_PROFILE` (PK = FK `USER_ID`, quan hệ 1–1, tạo cùng lúc với user): full_name (*), avatar_file_id, gender (`MALE|FEMALE|OTHER`), date_of_birth, position (chức vụ), department, address, bio.
- `USER_ROLE` (n-n), `USER_BUILDING` (n-n: user được làm việc ở tòa nào).

### Màn hình
- **Hồ sơ cá nhân** (`/profile`): đổi avatar (crop vuông), sửa thông tin profile; email/username chỉ đọc.
- **Người dùng hệ thống** (`/settings/users`, chỉ SUPER_ADMIN): bảng cột Avatar, Tên đăng nhập [F], Họ tên [F], Email [F], SĐT, Vai trò [F], Tòa nhà phụ trách, Trạng thái [F], Đăng nhập gần nhất, Ngày tạo; tác vụ: sửa, gán vai trò/tòa nhà, đặt lại mật khẩu (sinh mật khẩu tạm, bắt đổi khi đăng nhập lần đầu), khoá/mở khoá.

---

## 4. Vận hành › Quản lý tòa nhà

> Ghi chú phân tích: danh sách cột "Mã / Số lượng căn hộ / Vị trí / Loại (Tòa nhà-Khu / Cho thuê)" thuộc **Tòa nhà**;
> còn "Chủ sở hữu / Tầng / Số phòng / Thành viên / Loại (Căn hộ, Penthouse, ...) / Hình thức" thuộc **Căn hộ**. SPEC này đặt đúng theo đó.

### 4.1 Tòa nhà (`BUILDING`) — CRUD, upload ảnh, 2 chế độ xem List/Lưới

| Trường | Ghi chú |
|---|---|
| Ảnh | nhiều ảnh, 1 ảnh đại diện [L] |
| Mã (*) [U][F][S][L] | VARCHAR2(30), chữ in hoa, không dấu, không khoảng trắng |
| Tên (*) [F][S][L] | VARCHAR2(200) |
| Số lượng căn hộ [S][L] | tính tự động = số căn hộ thuộc tòa |
| Vị trí (*) [F] | Tỉnh/Thành phố, Phường/Xã, Địa chỉ chi tiết (theo đơn vị hành chính 2 cấp) — hiển thị gộp 1 dòng |
| Loại (*) [F][L] | `BUILDING` Tòa nhà · `COMPOUND` Khu (khu đô thị/khu phức hợp) · `RENTAL` Cho thuê |
| Số tầng nổi, số tầng hầm | số nguyên ≥ 0 |
| Chủ đầu tư, Hotline BQL, Email BQL | |
| Mô tả | ≤ 4000 ký tự |
| Trạng thái (*) [F][L] | ACTIVE / INACTIVE |
| Ngày tạo, Ngày cập nhật [F khoảng ngày][S] | tự động |
| Tác vụ | Xem · Sửa · Đổi trạng thái · Xoá |

Quy tắc: không xoá tòa còn căn hộ (409 "Tòa nhà còn N căn hộ, hãy chuyển sang Không hoạt động"). Tòa `INACTIVE` không xuất hiện ở bộ chọn tòa nhà trên header (trừ Admin).
Chi tiết tòa nhà: thư viện ảnh, thông tin, thống kê nhanh (số căn, số cư dân, tỉ lệ có người ở), tab danh sách căn hộ.

### 4.2 Căn hộ (`APARTMENT`) — CRUD, upload ảnh, 2 chế độ xem List/Lưới

| Trường | Ghi chú |
|---|---|
| Ảnh | nhiều ảnh, 1 ảnh đại diện [L] |
| Tên (*) [F][S][L] | ví dụ "A-12.05" |
| Mã (*) [U theo tòa][F][S][L] | |
| Tòa nhà (*) | mặc định = tòa đang chọn |
| Chủ sở hữu [F][L] | cư dân có vai trò OWNER tại căn hộ (lấy từ 4.4, chỉ đọc ở đây) |
| Tầng (*) [F][S] | `FLOOR_NO` (cho phép chuỗi như "12A", "B1") |
| Số phòng ngủ / Số phòng [F] | số nguyên |
| Diện tích (m²) (*) | NUMBER(10,2) — dùng tính phí quản lý |
| Thành viên [S][L] | số cư dân đang ở (tính tự động) |
| Loại (*) [F][L] | `APARTMENT` Căn hộ · `PENTHOUSE` Penthouse · `VILLA` Villa · `DUPLEX` Duplex · `SHOPHOUSE` Shophouse · `PREMISES` Mặt bằng · `OFFICE` Văn phòng |
| Hình thức (*) [F] | `RENT` Cho thuê · `OWN` Sở hữu |
| Tình trạng sử dụng [F] | `VACANT` Trống · `OCCUPIED` Đang ở · `RENOVATING` Đang sửa chữa |
| Mô tả | |
| Trạng thái (*) [F] | ACTIVE / INACTIVE |
| Ngày tạo, Ngày cập nhật [F][S] | |

Chức năng thêm: Import Excel (file mẫu tải về), Export Excel theo filter hiện tại.
Chi tiết căn hộ có tab: Thông tin · Cư dân · Hạng mục (xe) · Thẻ từ · Thông báo phí · Yêu cầu hỗ trợ.

### 4.3 Hạng mục căn hộ — Kê khai tài sản (Xe), màn hình 2 tab

**Tab "Danh mục"** (`ASSET_CATEGORY`): Tên (*) [U theo tòa][F] (ví dụ Ô tô, Xe máy, Xe đạp, Xe điện) · Mô tả · Đơn vị (*) [F] (chiếc, cái, bộ...) · Trạng thái (*) [F] Hoạt động/Ngừng hoạt động · Ngày tạo · Ngày cập nhật · Tác vụ.
Không xoá danh mục đang có hạng mục → chỉ cho chuyển Ngừng hoạt động.

**Tab "Hạng mục"** (`ASSET_ITEM`):
| Trường | Ghi chú |
|---|---|
| Tên căn hộ (*) [F] | chọn căn hộ trong tòa |
| Tên (*) [F] | ví dụ "Honda Vision đỏ" |
| Số hiệu [F] | biển số xe; chuẩn hoá in hoa, bỏ khoảng trắng thừa; duy nhất trong tòa với hạng mục đang hoạt động |
| Mô tả | |
| Mã thẻ từ [F] | liên kết thẻ từ (4.6) nếu có |
| Đơn vị | lấy mặc định từ danh mục, cho sửa |
| Tên danh mục tài sản (*) [F] | chọn danh mục ACTIVE |
| Ngày vào (*) [F] | |
| Ngày ra | ≥ Ngày vào; có Ngày ra ≤ hôm nay → tự chuyển Không hoạt động |
| Trạng thái (*) [F] | |
| Ngày tạo [S] | |

Số lượng hạng mục xe đang hoạt động được dùng để tính phí gửi xe ở Thông báo phí (mục 8).

### 4.4 Cư dân (`RESIDENT`, `APARTMENT_RESIDENT`) — CRUD, upload ảnh đại diện, 2 chế độ xem List/Lưới

| Trường | Ghi chú |
|---|---|
| Ảnh đại diện [L] | |
| Mã cư dân [U theo tòa][F] | tự sinh `CD` + 6 số nếu bỏ trống |
| Họ và tên (*) [F][S][L] | |
| Số điện thoại (*) [F][L] | định dạng VN, duy nhất trong tòa |
| Email [F] | |
| Giới tính, Ngày sinh | |
| Loại giấy tờ / Số giấy tờ | CCCD / Hộ chiếu; ẩn bớt số khi hiển thị ở danh sách (`0010*****123`) |
| Ngày cấp, Nơi cấp, Quốc tịch | mặc định Việt Nam |
| Căn hộ (*) [F][L] | một cư dân có thể gắn nhiều căn (bảng `APARTMENT_RESIDENT`) |
| Vai trò tại căn hộ (*) [F] | `OWNER` Chủ sở hữu · `TENANT` Người thuê · `FAMILY` Thành viên gia đình · `GUEST` Khách lưu trú |
| Quan hệ với chủ hộ | Vợ/Chồng, Con, Bố/Mẹ, Khác |
| Ngày chuyển đến (*), Ngày chuyển đi | |
| Tình trạng cư trú [F] | `LIVING` Đang ở · `TEMP_ABSENT` Tạm vắng · `MOVED_OUT` Đã chuyển đi |
| Đăng ký tạm trú [F] | Có / Chưa |
| Tài khoản app [F] | Chưa tạo / Đã kích hoạt / Bị khoá |
| Ghi chú | |
| Ngày tạo, Ngày cập nhật [F][S] | |
| Tác vụ | Xem · Sửa · Gán căn hộ · Chuyển đi · Tạo tài khoản app · Xoá |

Quy tắc: mỗi căn hộ tối đa 1 **chủ hộ chính** (`IS_PRIMARY` trong nhóm OWNER). "Chuyển đi" đặt ngày chuyển đi + `MOVED_OUT`, thu hồi thẻ từ đang gán.
Chức năng: Import/Export Excel; danh sách cư dân theo căn hộ.

### 4.5 Voucher (`VOUCHER`)
Mã [U][F] · Tên (*) [F] · Loại giảm (`PERCENT` % / `AMOUNT` số tiền) · Giá trị (*) · Giảm tối đa · Áp dụng cho (Tiện ích / Dịch vụ / Tất cả) + danh sách cụ thể · Tổng số lượng · Đã dùng · Giới hạn mỗi căn hộ · Hiệu lực từ–đến (*) [F] · Trạng thái [F] · Ngày tạo.
Không sửa giá trị khi đã có lượt dùng; hết hạn → hiển thị chip "Hết hạn".

### 4.6 Thẻ từ (`ACCESS_CARD`)
Mã thẻ/Serial (*) [U][F] · Loại thẻ [F] (`ELEVATOR` Thang máy · `DOOR` Cửa · `PARKING` Gửi xe · `MULTI` Đa năng) · Căn hộ [F] · Cư dân [F] · Hạng mục (xe) liên kết · Ngày cấp · Ngày hết hạn · Phí làm thẻ · Trạng thái [F] (`IN_USE` Đang dùng · `LOCKED` Khoá · `LOST` Báo mất · `REVOKED` Thu hồi · `IN_STOCK` Trong kho) · Ngày tạo.
Lưu lịch sử thay đổi trạng thái (`ACCESS_CARD_HISTORY`). Một thẻ chỉ gán 1 cư dân tại một thời điểm.

### 4.7 Nhắc nhở (`REMINDER`)
Tiêu đề (*) [F] · Nội dung (*) (rich text) · Đối tượng (*) [F] (Toàn tòa · Theo tầng · Theo căn hộ · Cư dân cụ thể) · Kênh (Thông báo trong app · Email · SMS — local chỉ ghi log) · Lịch gửi (Gửi ngay · Hẹn giờ · Lặp hằng tháng ngày X) · Trạng thái [F] (`DRAFT` Nháp · `SCHEDULED` Đã lên lịch · `SENT` Đã gửi · `CANCELLED` Đã huỷ) · Số người nhận · Ngày gửi · Ngày tạo.
Job `@Scheduled` mỗi phút quét nhắc nhở đến hạn.

### 4.8 Khảo sát ý kiến (`SURVEY`, `SURVEY_QUESTION`, `SURVEY_OPTION`, `SURVEY_RESPONSE`)
Tiêu đề (*) · Mô tả · Đối tượng · Thời gian bắt đầu–kết thúc · Ẩn danh (Có/Không) · Trạng thái (`DRAFT|OPEN|CLOSED`) · Số phản hồi.
Trình tạo câu hỏi: một lựa chọn, nhiều lựa chọn, văn bản ngắn, đánh giá 1–5 sao; kéo thả sắp xếp. Màn hình kết quả: biểu đồ cột/tròn theo câu hỏi, export Excel. Không sửa câu hỏi khi đã có phản hồi.

---

## 5. Vận hành › Quản lý tiện ích

### 5.1 Danh mục tiện ích (`AMENITY`) — có chế độ lưới (ảnh)
Ảnh · Mã [U] · Tên (*) (Hồ bơi, Phòng gym, Khu BBQ, Sân tennis, Phòng sinh hoạt cộng đồng...) · Vị trí trong tòa · Sức chứa · Giờ mở cửa–đóng cửa · Nội quy · Cần duyệt khi đăng ký (Có/Không) · Trạng thái · Ngày tạo.

### 5.2 Cấu hình tiện ích (`AMENITY_CONFIG`, `AMENITY_SLOT`, `AMENITY_PRICE`)
Theo từng tiện ích: thời lượng mỗi lượt (phút), danh sách khung giờ theo thứ trong tuần, giá theo khung giờ (miễn phí/có phí, phân biệt ngày thường/cuối tuần), số lượt tối đa mỗi căn hộ/tuần, đặt trước tối đa N ngày, huỷ miễn phí trước X giờ, ngày nghỉ bảo trì.

### 5.3 Đăng ký tiện ích (`AMENITY_BOOKING`) — xem dạng Danh sách và Lịch (theo tuần)
Mã đăng ký [F] · Tiện ích [F] · Căn hộ [F] · Cư dân · Ngày sử dụng [F] · Khung giờ · Số người · Phí · Voucher · Thành tiền · Trạng thái [F] (`PENDING` Chờ duyệt · `APPROVED` Đã duyệt · `REJECTED` Từ chối · `CANCELLED` Đã huỷ · `COMPLETED` Hoàn thành) · Lý do từ chối · Ngày tạo.
Quy tắc: kiểm tra trùng khung giờ vượt sức chứa, giới hạn lượt/tuần, cấu hình cần duyệt. Booking có phí sinh **giao dịch** (5.6) và cộng vào thông báo phí kỳ sau nếu chưa thanh toán.

### 5.4 Loại dịch vụ (`SERVICE_TYPE`)
Tên (*) [U] (Vệ sinh, Sửa chữa, Giặt là, Chuyển nhà...) · Mô tả · Trạng thái · Ngày tạo.

### 5.5 Dịch vụ (`SERVICE`)
Mã · Tên (*) · Loại dịch vụ (*) [F] · Đơn giá (*) · Đơn vị tính (lần, giờ, m², kg) · Mô tả · Ảnh · Trạng thái [F] · Ngày tạo.
Có thể tạo "Đơn dịch vụ" cho căn hộ (số lượng × đơn giá) → sinh giao dịch.

### 5.6 Lịch sử giao dịch (`TRANSACTION`)
Mã giao dịch [F] · Loại nguồn [F] (Tiện ích / Dịch vụ / Thẻ từ / Thông báo phí) · Mã tham chiếu · Căn hộ [F] · Cư dân · Số tiền · Phương thức [F] · Trạng thái [F] (`PENDING|PAID|CANCELLED|REFUNDED`) · Thời gian [F]. Chỉ đọc + export Excel.

### 5.7 Báo cáo tiện ích
Bộ lọc khoảng thời gian + tiện ích. Thẻ KPI: tổng lượt đặt, tỉ lệ lấp đầy, doanh thu, tỉ lệ huỷ. Biểu đồ: lượt theo ngày, top tiện ích, phân bố khung giờ. Export Excel.

---

## 6. Vận hành › Yêu cầu và hỗ trợ

### 6.1 Danh mục yêu cầu & hỗ trợ (`TICKET_CATEGORY`)
Tên (*) [U] (Điện, Nước, Vệ sinh, An ninh, Thang máy, Khiếu nại, Góp ý...) · Mô tả · SLA phản hồi (giờ) · SLA xử lý (giờ) · Người phụ trách mặc định · Trạng thái · Ngày tạo.

### 6.2 Yêu cầu và hỗ trợ (`TICKET`, `TICKET_COMMENT`, `TICKET_ATTACHMENT`) — xem dạng Danh sách và Kanban (theo trạng thái)
Mã yêu cầu (tự sinh `YC-yyMMdd-xxx`) [F] · Tiêu đề (*) [F] · Danh mục (*) [F] · Căn hộ [F] · Người gửi (cư dân) · Kênh tiếp nhận (App, Hotline, Trực tiếp) · Mức ưu tiên [F] (Thấp, Trung bình, Cao, Khẩn cấp) · Người xử lý [F] · Hạn xử lý (tính từ SLA) · Trạng thái [F] (`NEW` Mới · `RECEIVED` Đã tiếp nhận · `IN_PROGRESS` Đang xử lý · `WAITING` Chờ phản hồi · `DONE` Hoàn thành · `CLOSED` Đóng · `CANCELLED` Huỷ) · Đánh giá (1–5 sao) · Ngày tạo · Ngày cập nhật.
Chi tiết: mô tả, ảnh đính kèm, timeline (đổi trạng thái, phân công, bình luận nội bộ/công khai). Quá hạn SLA → tô đỏ dòng + đếm ở Bảng điều khiển. Chuyển trạng thái phải theo luồng hợp lệ (định nghĩa state machine trong service).

---

## 7. Vận hành › Quản lý tài liệu (giống ảnh tham khảo)

### 7.1 Danh mục tài liệu (`DOCUMENT_CATEGORY`)
Tên (*) [U] (Nội quy, Hợp đồng mẫu, Biểu mẫu, Thông báo, Hướng dẫn...) · Mô tả · Màu chip · Trạng thái · Ngày tạo · Ngày cập nhật.

### 7.2 Tài liệu (`DOCUMENT`, `DOCUMENT_TAG`)
Cột đúng như ảnh: **Mã** [F] (link xanh + icon loại file: DOCX/PDF/XLSX/ảnh; tự sinh số nếu bỏ trống) · **Tên tài liệu** (*) [F] · **Thẻ** [F] (tags, nhiều thẻ) · **Danh mục** (*) [F] (chip màu) · **Kích thước** (từ file, dạng "4 KB", "1.2 MB") · **Mô tả** [F] · **Ngày tạo** · **Ngày cập nhật** · **Tác vụ** (Xem trước · Tải xuống · Sửa · Thay file · Xoá).
Toolbar: Select **"Đối tượng"** = phạm vi hiển thị: `ALL_RESIDENTS` Toàn bộ cư dân · `OWNERS` Chủ sở hữu · `TENANTS` Người thuê · `MANAGEMENT` Nội bộ ban quản lý.
File: pdf, doc(x), xls(x), ppt(x), jpg, png ≤ 20MB. Xem trước: PDF/ảnh hiển thị trong dialog, file khác chỉ tải xuống. Lưu phiên bản cũ khi thay file.

---

## 8. Tài chính › Thông báo phí

### 8.1 Số liệu (`METER_READING`)
Kỳ (tháng/năm) (*) [F] · Căn hộ (*) [F] · Loại đồng hồ [F] (`ELECTRIC` Điện · `WATER` Nước) · Chỉ số cũ (tự lấy từ kỳ trước) · Chỉ số mới (*) · Tiêu thụ (tự tính, cảnh báo nếu tăng > 200% so với TB 3 kỳ) · Ảnh đồng hồ · Người nhập · Ngày nhập.
Nhập nhanh dạng lưới theo tầng; Import Excel theo file mẫu. Kỳ đã khoá (đã phát hành thông báo phí) thì không sửa.

### 8.2 Cấu hình đơn giá (trong Cấu hình chung hoặc tab riêng)
Phí quản lý (đ/m²/tháng, theo loại căn), điện/nước theo bậc thang, phí gửi xe theo danh mục tài sản (đ/chiếc/tháng), VAT, phí khác cố định.

### 8.3 Thông báo phí (`FEE_NOTICE`, `FEE_NOTICE_ITEM`)
Mã thông báo [F] · Kỳ [F] · Căn hộ [F] · Chủ hộ · Các khoản: Phí quản lý (diện tích × đơn giá) · Điện · Nước · Gửi xe (số hạng mục xe ACTIVE × đơn giá) · Tiện ích/dịch vụ chưa thanh toán · Nợ kỳ trước · Giảm trừ · **Tổng cộng** · Đã thanh toán · Còn nợ · Hạn thanh toán · Trạng thái [F] (`DRAFT` Nháp · `ISSUED` Đã phát hành · `PARTIAL` Thanh toán một phần · `PAID` Đã thanh toán · `OVERDUE` Quá hạn · `CANCELLED` Huỷ) · Ngày tạo.
Chức năng: **Tạo hàng loạt** cho cả tòa theo kỳ (xem trước rồi xác nhận) · sửa khoản khi còn Nháp · Phát hành (gửi thông báo cho cư dân) · Xuất PDF thông báo phí (có mã VietQR) · Export Excel. Job hằng ngày chuyển `OVERDUE` khi quá hạn.

### 8.4 Lịch sử thanh toán (`PAYMENT`)
Mã phiếu thu [F] · Thông báo phí [F] · Căn hộ [F] · Số tiền · Phương thức [F] (Tiền mặt · Chuyển khoản · VietQR) · Thời gian [F] · Người thu · Mã giao dịch ngân hàng · Trạng thái đối soát [F] (Đã khớp · Chờ khớp · Lệch) · Ghi chú.
Ghi nhận thanh toán thủ công (phân bổ vào thông báo phí, cho phép trả một phần); in phiếu thu PDF; huỷ phiếu (cần lý do, lưu audit).

### 8.5 Thanh toán tự động (VietQR)
Cấu hình theo tòa: Ngân hàng (mã BIN), Số tài khoản, Tên chủ tài khoản, mẫu nội dung chuyển khoản (`BIHOME {MA_THONG_BAO}`).
Sinh chuỗi QR theo chuẩn EMVCo/VietQR ngay ở backend (không phụ thuộc API ngoài), có số tiền và nội dung → render ảnh QR trên thông báo phí.
Webhook nhận biến động số dư `POST /api/v1/webhooks/bank` (xác thực bằng secret header) → khớp nội dung với mã thông báo → tạo `PAYMENT` tự động. Local: có endpoint giả lập để test.

---

## 9. Bảng điều khiển (Dashboard)
Thẻ KPI theo tòa đang chọn: Số căn hộ / đang ở, Số cư dân, Yêu cầu đang mở / quá hạn SLA, Đăng ký tiện ích hôm nay, Công nợ kỳ hiện tại, Tỉ lệ thu phí.
Biểu đồ: thu phí 6 kỳ gần nhất, yêu cầu theo danh mục, lượt dùng tiện ích theo tuần. Khu vực "Truy cập nhanh" hiển thị các trang đã ghim (📌).

## 10. Tiện ích header
- **⊕ Tạo nhanh**: menu tạo Cư dân, Yêu cầu, Đăng ký tiện ích, Thông báo phí.
- **🔔 Thông báo** (`NOTIFICATION`): danh sách mới nhất, đánh dấu đã đọc, badge số chưa đọc; polling 30s (sau này nâng cấp WebSocket/SSE).
- **⟲ Lịch sử hoạt động** (`AUDIT_LOG`): ai, làm gì, đối tượng nào, lúc nào (ghi qua AOP/EntityListener cho thao tác tạo/sửa/xoá/đổi trạng thái). Icon ⟲ trên trang danh sách mở lịch sử lọc theo module đó.
- **SOS** (`SOS_ALERT`): cảnh báo khẩn cấp từ cư dân (giai đoạn này BQL có thể tạo thủ công để test) → badge đỏ + âm báo, danh sách cảnh báo, xác nhận xử lý.

## 11. Yêu cầu phi chức năng
- Danh sách 10k bản ghi phản hồi < 500ms (index đúng cột filter).
- Mọi thao tác ghi đều được audit. Không log mật khẩu, token, số giấy tờ đầy đủ.
- Responsive: desktop là chính, tablet dùng được; sidebar thu gọn thành icon rail dưới 1200px.
- Excel import: trả kết quả theo dòng (thành công/lỗi + lý do), không import một phần nếu người dùng chọn "Dừng khi có lỗi".

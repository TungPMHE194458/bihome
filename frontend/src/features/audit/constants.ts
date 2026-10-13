import type { SelectOption } from '@/components/DataTable/types'
import type { ChipStyle } from '@/components/StatusChip'
import type { AuditAction, AuditLog } from '@/features/audit/api'
import { formatDate, formatDateTime } from '@/lib/format'
import { MODULE_LABEL } from '@/lib/modules'

export const AUDIT_ACTION: Record<AuditAction, ChipStyle & { verb: string }> = {
  CREATE: { label: 'Tạo mới', tone: 'success', verb: 'đã tạo' },
  UPDATE: { label: 'Cập nhật', tone: 'info', verb: 'đã cập nhật' },
  STATUS_CHANGE: { label: 'Đổi trạng thái', tone: 'warning', verb: 'đã đổi trạng thái' },
  DELETE: { label: 'Xoá', tone: 'danger', verb: 'đã xoá' },
}

export const AUDIT_ACTION_OPTIONS: SelectOption[] = (Object.keys(AUDIT_ACTION) as AuditAction[]).map((value) => ({
  value,
  label: AUDIT_ACTION[value].label,
}))

/** Nhãn loại đối tượng (ENTITY_TYPE của backend). */
export const ENTITY_TYPE_LABEL: Record<string, string> = {
  BUILDING: 'Tòa nhà',
  APARTMENT: 'Căn hộ',
  ASSET_CATEGORY: 'Danh mục hạng mục',
  ASSET_ITEM: 'Hạng mục căn hộ',
  RESIDENT: 'Cư dân',
  APARTMENT_RESIDENT: 'Cư trú',
  RESIDENT_ACCOUNT: 'Tài khoản app cư dân',
  RESIDENT_DECLARATION: 'Phiếu kê khai (app)',
  DOCUMENT: 'Tài liệu',
  DOCUMENT_CATEGORY: 'Danh mục tài liệu',
  TICKET: 'Yêu cầu',
  TICKET_CATEGORY: 'Danh mục yêu cầu',
  ACCESS_CARD: 'Thẻ từ',
  VOUCHER: 'Voucher',
  AMENITY: 'Tiện ích',
  AMENITY_CONFIG: 'Cấu hình tiện ích',
  SERVICE_TYPE: 'Loại dịch vụ',
  SERVICE: 'Dịch vụ',
  USER: 'Người dùng',
  USER_PROFILE: 'Hồ sơ người dùng',
  ROLE: 'Vai trò',
  ANNOUNCEMENT: 'Thông báo',
  REMINDER: 'Nhắc nhở',
  SURVEY: 'Khảo sát',
  FEE_RATE_CONFIG: 'Đơn giá thông báo phí',
  METER_READING: 'Số liệu điện nước',
  FEE_NOTICE: 'Thông báo phí',
  PAYMENT: 'Phiếu thu',
  VIETQR_CONFIG: 'Cấu hình VietQR',
  SOS_ALERT: 'Cảnh báo SOS',
  SYSTEM_SETTING: 'Cấu hình chung',
  FINANCIAL_TRANSACTION: 'Giao dịch',
  SURVEY_RESPONSE: 'Phản hồi khảo sát',
}

/** Nhãn các trường hay gặp; trường khác hiện tên gốc. */
export const FIELD_LABEL: Record<string, string> = {
  code: 'Mã',
  name: 'Tên',
  oldIndex: 'Chỉ số cũ',
  newIndex: 'Chỉ số mới',
  consumption: 'Tiêu thụ',
  totalAmount: 'Tổng cộng',
  paidAmount: 'Đã thanh toán',
  dueDate: 'Hạn thanh toán',
  items: 'Các khoản',
  carriedToId: 'Chuyển nợ sang',
  cancelReason: 'Lý do huỷ',
  reconcileStatus: 'Đối soát',
  vatPercent: 'VAT (%)',
  accountNo: 'Số tài khoản',
  accountName: 'Chủ tài khoản',
  bankBin: 'Ngân hàng (BIN)',
  contentTemplate: 'Mẫu nội dung',
  title: 'Tiêu đề',
  status: 'Trạng thái',
  description: 'Mô tả',
  note: 'Ghi chú',
  location: 'Vị trí',
  capacity: 'Sức chứa',
  openTime: 'Giờ mở cửa',
  closeTime: 'Giờ đóng cửa',
  rules: 'Nội quy',
  requiresApproval: 'Cần duyệt',
  images: 'Ảnh',
  fileIds: 'Tệp đính kèm',
  slots: 'Khung giờ',
  prices: 'Mức giá',
  maintenances: 'Ngày bảo trì',
  slotMinutes: 'Thời lượng lượt',
  maxBookingsPerWeek: 'Lượt tối đa / tuần',
  maxAdvanceDays: 'Đặt trước tối đa',
  freeCancelHours: 'Huỷ miễn phí trước',
  fullName: 'Họ tên',
  phone: 'Số điện thoại',
  email: 'Email',
  gender: 'Giới tính',
  dateOfBirth: 'Ngày sinh',
  address: 'Địa chỉ',
  jobTitle: 'Chức vụ',
  department: 'Phòng ban',
  roles: 'Vai trò',
  permissions: 'Quyền',
  buildingIds: 'Tòa nhà phụ trách',
  passwordHash: 'Mật khẩu',
  mustChangePassword: 'Bắt đổi mật khẩu',
  avatarFileId: 'Ảnh đại diện',
  idNumber: 'Số giấy tờ',
  apartmentId: 'Căn hộ',
  residentId: 'Cư dân',
  assigneeId: 'Người xử lý',
  categoryId: 'Danh mục',
  priority: 'Mức độ ưu tiên',
  floorNo: 'Tầng',
  area: 'Diện tích',
  unitPrice: 'Đơn giá',
  unit: 'Đơn vị tính',
  discountValue: 'Giá trị giảm',
  validFrom: 'Hiệu lực từ',
  validTo: 'Hiệu lực đến',
  totalQuantity: 'Tổng số lượng',
  cardNo: 'Mã thẻ',
  cardType: 'Loại thẻ',
  plateNumber: 'Biển số',
  content: 'Nội dung',
  audience: 'Đối tượng nhận',
  category: 'Loại',
  scheduledAt: 'Hẹn giờ gửi',
  sentAt: 'Thời điểm gửi',
  sentBy: 'Người gửi',
  staffCount: 'Số nhân viên nhận',
  residentCount: 'Số cư dân',
  username: 'Tên đăng nhập',
  bio: 'Giới thiệu',
  passwordChangedAt: 'Đổi mật khẩu lúc',
  lockedUntil: 'Khoá đến',
  residenceStatus: 'Tình trạng cư trú',
  moveOutDate: 'Ngày chuyển đi',
}

/** Nhãn giá trị enum hay gặp. */
export const VALUE_LABEL: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  LOCKED: 'Khoá',
  NEW: 'Mới',
  RECEIVED: 'Đã tiếp nhận',
  IN_PROGRESS: 'Đang xử lý',
  WAITING: 'Chờ phản hồi',
  DONE: 'Hoàn thành',
  CLOSED: 'Đóng',
  CANCELLED: 'Huỷ',
  IN_USE: 'Đang dùng',
  LOST: 'Báo mất',
  REVOKED: 'Thu hồi',
  IN_STOCK: 'Trong kho',
  DRAFT: 'Nháp',
  SCHEDULED: 'Hẹn giờ',
  SENT: 'Đã gửi',
  LIVING: 'Đang ở',
  TEMP_ABSENT: 'Tạm vắng',
  MOVED_OUT: 'Đã chuyển đi',
  true: 'Có',
  false: 'Không',
}

export const fieldLabel = (field: string) => FIELD_LABEL[field] ?? field
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Nhãn enum, ngày giờ ISO → DD/MM/YYYY HH:mm, ngày → DD/MM/YYYY; còn lại giữ nguyên. */
export function valueLabel(value?: string | null): string {
  if (value == null || value === '') return '—'
  if (VALUE_LABEL[value]) return VALUE_LABEL[value]
  if (DATE_TIME.test(value)) return formatDateTime(value)
  if (DATE.test(value)) return formatDate(value)
  return value
}
export const entityTypeLabel = (type: string) => ENTITY_TYPE_LABEL[type] ?? type
export const moduleLabel = (module: string) => MODULE_LABEL[module] ?? module

/** "Mạnh Tùng đã cập nhật Tiện ích SKY-GYM · Phòng gym" */
export function describe(log: AuditLog): string {
  const actor = log.actorName ?? log.actorUsername
  const label = log.entityLabel && !log.entityLabel.startsWith('#') ? ` ${log.entityLabel}` : ''
  return `${actor} ${AUDIT_ACTION[log.action].verb} ${entityTypeLabel(log.entityType).toLowerCase()}${label}`
}

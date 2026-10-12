import type { SelectOption } from '@/components/DataTable/types'

/** Module theo mã permission ({MODULE}_{ACTION}); thứ tự theo menu. Dùng cho phân quyền và lịch sử hoạt động. */
export const MODULE_GROUPS: { label: string; modules: { code: string; label: string }[] }[] = [
  {
    label: 'Vận hành',
    modules: [
      { code: 'DASHBOARD', label: 'Bảng điều khiển' },
      { code: 'BUILDING', label: 'Tòa nhà' },
      { code: 'APARTMENT', label: 'Căn hộ' },
      { code: 'ASSET', label: 'Hạng mục căn hộ' },
      { code: 'RESIDENT', label: 'Cư dân' },
      { code: 'VOUCHER', label: 'Voucher' },
      { code: 'ACCESS_CARD', label: 'Thẻ từ' },
      { code: 'REMINDER', label: 'Nhắc nhở' },
      { code: 'SURVEY', label: 'Khảo sát ý kiến' },
      { code: 'AMENITY_BOOKING', label: 'Đăng ký tiện ích' },
      { code: 'AMENITY', label: 'Danh mục & cấu hình tiện ích' },
      { code: 'SERVICE', label: 'Dịch vụ & loại dịch vụ' },
      { code: 'TRANSACTION', label: 'Lịch sử giao dịch' },
      { code: 'AMENITY_REPORT', label: 'Báo cáo tiện ích' },
      { code: 'TICKET', label: 'Yêu cầu và hỗ trợ' },
      { code: 'DOCUMENT', label: 'Tài liệu' },
    ],
  },
  {
    label: 'Tài chính',
    modules: [
      { code: 'METER_READING', label: 'Số liệu' },
      { code: 'FEE_NOTICE', label: 'Thông báo phí' },
      { code: 'PAYMENT', label: 'Lịch sử thanh toán' },
      { code: 'VIETQR', label: 'Thanh toán tự động (VietQR)' },
    ],
  },
  {
    label: 'Quản trị',
    modules: [
      { code: 'USER', label: 'Người dùng hệ thống' },
      { code: 'ROLE', label: 'Vai trò & phân quyền' },
      { code: 'SETTING', label: 'Cấu hình chung' },
      { code: 'NOTIFICATION', label: 'Thông báo' },
      { code: 'AUDIT_LOG', label: 'Nhật ký hoạt động' },
      { code: 'SOS', label: 'Cảnh báo SOS' },
    ],
  },
]

export const MODULE_LABEL: Record<string, string> = Object.fromEntries(
  MODULE_GROUPS.flatMap((g) => g.modules.map((m) => [m.code, m.label])),
)

export const MODULE_OPTIONS: SelectOption[] = MODULE_GROUPS.flatMap((g) => g.modules).map((m) => ({
  value: m.code,
  label: m.label,
}))

export const PERMISSION_ACTIONS = [
  { code: 'READ', label: 'Xem' },
  { code: 'WRITE', label: 'Thêm / sửa' },
  { code: 'DELETE', label: 'Xoá' },
  { code: 'EXPORT', label: 'Xuất dữ liệu' },
] as const

/** Module của route theo permission xem (vd APARTMENT_READ → APARTMENT). */
export function moduleOfPermission(permission?: string): string | undefined {
  return permission?.replace(/_(READ|WRITE|DELETE|EXPORT)$/, '')
}

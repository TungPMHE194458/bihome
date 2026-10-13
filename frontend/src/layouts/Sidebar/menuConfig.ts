import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined'
import PoolOutlinedIcon from '@mui/icons-material/PoolOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import type { SvgIconComponent } from '@mui/icons-material'

export interface MenuLeaf {
  label: string
  path: string
  permission?: string
}

export interface MenuGroup {
  key: string
  label: string
  icon: SvgIconComponent
  children: MenuLeaf[]
}

export type SectionKey = 'operations' | 'finance' | 'settings'

export interface MenuSection {
  key: SectionKey
  label: string
  railLabel: string
  railIcon: SvgIconComponent
  groups: MenuGroup[]
}

/** Cây menu theo docs/SPEC.md mục 1.3. */
export const MENU: MenuSection[] = [
  {
    key: 'operations',
    label: 'Vận hành',
    railLabel: 'Vận hành',
    railIcon: HomeOutlinedIcon,
    groups: [
      {
        key: 'building-management',
        label: 'Quản lý tòa nhà',
        icon: ApartmentOutlinedIcon,
        children: [
          { label: 'Tòa nhà', path: '/buildings', permission: 'BUILDING_READ' },
          { label: 'Căn hộ', path: '/apartments', permission: 'APARTMENT_READ' },
          { label: 'Hạng mục căn hộ', path: '/assets', permission: 'ASSET_READ' },
          { label: 'Cư dân', path: '/residents', permission: 'RESIDENT_READ' },
          { label: 'Kê khai từ cư dân', path: '/declarations', permission: 'RESIDENT_READ' },
          { label: 'Voucher', path: '/vouchers', permission: 'VOUCHER_READ' },
          { label: 'Thẻ từ', path: '/access-cards', permission: 'ACCESS_CARD_READ' },
          { label: 'Nhắc nhở', path: '/reminders', permission: 'REMINDER_READ' },
          { label: 'Khảo sát ý kiến', path: '/surveys', permission: 'SURVEY_READ' },
        ],
      },
      {
        key: 'amenity-management',
        label: 'Quản lý tiện ích',
        icon: PoolOutlinedIcon,
        children: [
          { label: 'Đăng ký tiện ích', path: '/amenity-bookings', permission: 'AMENITY_BOOKING_READ' },
          { label: 'Cấu hình tiện ích', path: '/amenity-configs', permission: 'AMENITY_READ' },
          { label: 'Danh mục tiện ích', path: '/amenities', permission: 'AMENITY_READ' },
          { label: 'Dịch vụ', path: '/services', permission: 'SERVICE_READ' },
          { label: 'Loại dịch vụ', path: '/service-types', permission: 'SERVICE_READ' },
          { label: 'Lịch sử giao dịch', path: '/transactions', permission: 'TRANSACTION_READ' },
          { label: 'Báo cáo tiện ích', path: '/amenity-reports', permission: 'AMENITY_REPORT_READ' },
        ],
      },
      {
        key: 'support',
        label: 'Yêu cầu và hỗ trợ',
        icon: SupportAgentOutlinedIcon,
        children: [
          { label: 'Yêu cầu và hỗ trợ', path: '/tickets', permission: 'TICKET_READ' },
          { label: 'Danh mục yêu cầu & hỗ trợ', path: '/ticket-categories', permission: 'TICKET_READ' },
          { label: 'Cảnh báo SOS', path: '/sos-alerts', permission: 'SOS_READ' },
        ],
      },
      {
        key: 'documents',
        label: 'Quản lý tài liệu',
        icon: DescriptionOutlinedIcon,
        children: [
          { label: 'Tài liệu', path: '/documents', permission: 'DOCUMENT_READ' },
          { label: 'Danh mục tài liệu', path: '/document-categories', permission: 'DOCUMENT_READ' },
        ],
      },
    ],
  },
  {
    key: 'finance',
    label: 'Tài chính',
    railLabel: 'Tài chính',
    railIcon: AccountBalanceWalletOutlinedIcon,
    groups: [
      {
        key: 'fee-notices',
        label: 'Thông báo phí',
        icon: ReceiptLongOutlinedIcon,
        children: [
          { label: 'Thông báo phí', path: '/fee-notices', permission: 'FEE_NOTICE_READ' },
          { label: 'Số liệu', path: '/meter-readings', permission: 'METER_READING_READ' },
          { label: 'Đơn giá', path: '/fee-rates', permission: 'FEE_NOTICE_READ' },
          { label: 'Lịch sử thanh toán', path: '/payments', permission: 'PAYMENT_READ' },
          { label: 'Thanh toán tự động (VietQR)', path: '/vietqr-settings', permission: 'VIETQR_READ' },
        ],
      },
    ],
  },
  {
    key: 'settings',
    label: 'Cài đặt',
    railLabel: 'Cài đặt',
    railIcon: SettingsOutlinedIcon,
    groups: [
      {
        key: 'settings',
        label: 'Cài đặt hệ thống',
        icon: ManageAccountsOutlinedIcon,
        children: [
          { label: 'Người dùng hệ thống', path: '/settings/users', permission: 'USER_READ' },
          { label: 'Vai trò & phân quyền', path: '/settings/roles', permission: 'ROLE_READ' },
          { label: 'Cấu hình chung', path: '/settings/general', permission: 'SETTING_READ' },
        ],
      },
      {
        key: 'communication',
        label: 'Thông báo & nhật ký',
        icon: CampaignOutlinedIcon,
        children: [
          { label: 'Thông báo', path: '/announcements', permission: 'NOTIFICATION_READ' },
          { label: 'Nhật ký hoạt động', path: '/settings/audit-logs', permission: 'AUDIT_LOG_READ' },
        ],
      },
    ],
  },
]

export const ALL_LEAVES: MenuLeaf[] = MENU.flatMap((s) => s.groups.flatMap((g) => g.children))

export function isPathActive(leafPath: string, pathname: string): boolean {
  return pathname === leafPath || pathname.startsWith(`${leafPath}/`)
}

export function findActive(pathname: string): { section?: MenuSection; group?: MenuGroup; leaf?: MenuLeaf } {
  for (const section of MENU) {
    for (const group of section.groups) {
      const leaf = group.children.find((l) => isPathActive(l.path, pathname))
      if (leaf) return { section, group, leaf }
    }
  }
  return {}
}

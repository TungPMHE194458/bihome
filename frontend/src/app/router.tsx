import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from '@/app/guards'
import type { RouteHandle } from '@/app/routeHandle'
import { AccessCardListPage } from '@/features/accesscard/pages/AccessCardListPage'
import { AmenityConfigPage } from '@/features/amenity/pages/AmenityConfigPage'
import { AmenityListPage } from '@/features/amenity/pages/AmenityListPage'
import { AmenityReportPage } from '@/features/amenityreport/pages/AmenityReportPage'
import { ApartmentDetailPage } from '@/features/apartment/pages/ApartmentDetailPage'
import { ApartmentListPage } from '@/features/apartment/pages/ApartmentListPage'
import { AssetPage } from '@/features/asset/pages/AssetPage'
import { AuditLogPage } from '@/features/audit/pages/AuditLogPage'
import { BookingPage } from '@/features/booking/pages/BookingPage'
import { ChangePasswordPage } from '@/features/auth/pages/ChangePasswordPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { BuildingDetailPage } from '@/features/building/pages/BuildingDetailPage'
import { BuildingListPage } from '@/features/building/pages/BuildingListPage'
import { DocumentCategoryListPage } from '@/features/document/pages/DocumentCategoryListPage'
import { DocumentListPage } from '@/features/document/pages/DocumentListPage'
import { AnnouncementListPage } from '@/features/notification/pages/AnnouncementListPage'
import { ProfilePage } from '@/features/profile/pages/ProfilePage'
import { ReminderListPage } from '@/features/reminder/pages/ReminderListPage'
import { ResidentDetailPage } from '@/features/resident/pages/ResidentDetailPage'
import { ResidentListPage } from '@/features/resident/pages/ResidentListPage'
import { RolePage } from '@/features/role/pages/RolePage'
import { ServicePage } from '@/features/servicecatalog/pages/ServicePage'
import { GeneralSettingsPage } from '@/features/setting/pages/GeneralSettingsPage'
import { ServiceTypeListPage } from '@/features/servicecatalog/pages/ServiceTypeListPage'
import { SurveyDetailPage } from '@/features/survey/pages/SurveyDetailPage'
import { FeeNoticeDetailPage } from '@/features/feenotice/pages/FeeNoticeDetailPage'
import { FeeNoticeListPage } from '@/features/feenotice/pages/FeeNoticeListPage'
import { FeeRatePage } from '@/features/feerate/pages/FeeRatePage'
import { MeterReadingListPage } from '@/features/meter/pages/MeterReadingListPage'
import { PaymentListPage } from '@/features/payment/pages/PaymentListPage'
import { VietQrSettingsPage } from '@/features/vietqr/pages/VietQrSettingsPage'
import { SosAlertListPage } from '@/features/sos/pages/SosAlertListPage'
import { SurveyListPage } from '@/features/survey/pages/SurveyListPage'
import { TransactionListPage } from '@/features/transaction/pages/TransactionListPage'
import { TicketCategoryListPage } from '@/features/ticket/pages/TicketCategoryListPage'
import { TicketDetailPage } from '@/features/ticket/pages/TicketDetailPage'
import { TicketListPage } from '@/features/ticket/pages/TicketListPage'
import { UserListPage } from '@/features/user/pages/UserListPage'
import { VoucherListPage } from '@/features/voucher/pages/VoucherListPage'
import { AuthLayout } from '@/layouts/AuthLayout'
import { MainLayout } from '@/layouts/MainLayout'
import { ALL_LEAVES } from '@/layouts/Sidebar/menuConfig'
import { DashboardPage } from '@/pages/DashboardPage'
import { ForbiddenPage, NotFoundPage } from '@/pages/ErrorPages'
import { UnderConstructionPage } from '@/pages/UnderConstructionPage'

const handle = (h: RouteHandle) => h

/** Trang đã có màn hình thật; mục menu còn lại trỏ tới trang "Đang phát triển". */
const IMPLEMENTED: RouteObject[] = [
  {
    path: 'buildings',
    element: <BuildingListPage />,
    handle: handle({ title: 'Tòa nhà', permission: 'BUILDING_READ' }),
  },
  {
    path: 'buildings/:id',
    element: <BuildingDetailPage />,
    handle: handle({ title: 'Chi tiết tòa nhà', permission: 'BUILDING_READ' }),
  },
  {
    path: 'apartments',
    element: <ApartmentListPage />,
    handle: handle({ title: 'Căn hộ', permission: 'APARTMENT_READ' }),
  },
  {
    path: 'apartments/:id',
    element: <ApartmentDetailPage />,
    handle: handle({ title: 'Chi tiết căn hộ', permission: 'APARTMENT_READ' }),
  },
  {
    path: 'residents',
    element: <ResidentListPage />,
    handle: handle({ title: 'Cư dân', permission: 'RESIDENT_READ' }),
  },
  {
    path: 'residents/:id',
    element: <ResidentDetailPage />,
    handle: handle({ title: 'Chi tiết cư dân', permission: 'RESIDENT_READ' }),
  },
  {
    path: 'assets',
    element: <AssetPage />,
    handle: handle({ title: 'Hạng mục căn hộ', permission: 'ASSET_READ' }),
  },
  {
    path: 'amenity-bookings',
    element: <BookingPage />,
    handle: handle({ title: 'Đăng ký tiện ích', permission: 'AMENITY_BOOKING_READ' }),
  },
  {
    path: 'transactions',
    element: <TransactionListPage />,
    handle: handle({ title: 'Lịch sử giao dịch', permission: 'TRANSACTION_READ' }),
  },
  {
    path: 'amenity-reports',
    element: <AmenityReportPage />,
    handle: handle({ title: 'Báo cáo tiện ích', permission: 'AMENITY_REPORT_READ' }),
  },
  {
    path: 'amenities',
    element: <AmenityListPage />,
    handle: handle({ title: 'Danh mục tiện ích', permission: 'AMENITY_READ' }),
  },
  {
    path: 'amenity-configs',
    element: <AmenityConfigPage />,
    handle: handle({ title: 'Cấu hình tiện ích', permission: 'AMENITY_READ' }),
  },
  {
    path: 'services',
    element: <ServicePage />,
    handle: handle({ title: 'Dịch vụ', permission: 'SERVICE_READ' }),
  },
  {
    path: 'service-types',
    element: <ServiceTypeListPage />,
    handle: handle({ title: 'Loại dịch vụ', permission: 'SERVICE_READ' }),
  },
  {
    path: 'reminders',
    element: <ReminderListPage />,
    handle: handle({ title: 'Nhắc nhở', permission: 'REMINDER_READ' }),
  },
  {
    path: 'surveys',
    element: <SurveyListPage />,
    handle: handle({ title: 'Khảo sát ý kiến', permission: 'SURVEY_READ' }),
  },
  {
    path: 'surveys/:id',
    element: <SurveyDetailPage />,
    handle: handle({ title: 'Chi tiết khảo sát', permission: 'SURVEY_READ' }),
  },
  {
    path: 'fee-notices',
    element: <FeeNoticeListPage />,
    handle: handle({ title: 'Thông báo phí', permission: 'FEE_NOTICE_READ' }),
  },
  {
    path: 'fee-notices/:id',
    element: <FeeNoticeDetailPage />,
    handle: handle({ title: 'Chi tiết thông báo phí', permission: 'FEE_NOTICE_READ' }),
  },
  {
    path: 'fee-rates',
    element: <FeeRatePage />,
    handle: handle({ title: 'Đơn giá', permission: 'FEE_NOTICE_READ' }),
  },
  {
    path: 'meter-readings',
    element: <MeterReadingListPage />,
    handle: handle({ title: 'Số liệu', permission: 'METER_READING_READ' }),
  },
  {
    path: 'payments',
    element: <PaymentListPage />,
    handle: handle({ title: 'Lịch sử thanh toán', permission: 'PAYMENT_READ' }),
  },
  {
    path: 'vietqr-settings',
    element: <VietQrSettingsPage />,
    handle: handle({ title: 'Thanh toán tự động (VietQR)', permission: 'VIETQR_READ' }),
  },
  {
    path: 'sos-alerts',
    element: <SosAlertListPage />,
    handle: handle({ title: 'Cảnh báo SOS', permission: 'SOS_READ' }),
  },
  {
    path: 'vouchers',
    element: <VoucherListPage />,
    handle: handle({ title: 'Voucher', permission: 'VOUCHER_READ' }),
  },
  {
    path: 'access-cards',
    element: <AccessCardListPage />,
    handle: handle({ title: 'Thẻ từ', permission: 'ACCESS_CARD_READ' }),
  },
  {
    path: 'tickets',
    element: <TicketListPage />,
    handle: handle({ title: 'Yêu cầu và hỗ trợ', permission: 'TICKET_READ' }),
  },
  {
    path: 'tickets/:id',
    element: <TicketDetailPage />,
    handle: handle({ title: 'Chi tiết yêu cầu', permission: 'TICKET_READ' }),
  },
  {
    path: 'ticket-categories',
    element: <TicketCategoryListPage />,
    handle: handle({ title: 'Danh mục yêu cầu & hỗ trợ', permission: 'TICKET_READ' }),
  },
  {
    path: 'documents',
    element: <DocumentListPage />,
    handle: handle({ title: 'Tài liệu', permission: 'DOCUMENT_READ' }),
  },
  {
    path: 'document-categories',
    element: <DocumentCategoryListPage />,
    handle: handle({ title: 'Danh mục tài liệu', permission: 'DOCUMENT_READ' }),
  },
  {
    path: 'settings/users',
    element: <UserListPage />,
    handle: handle({ title: 'Người dùng hệ thống', permission: 'USER_READ' }),
  },
  {
    path: 'settings/roles',
    element: <RolePage />,
    handle: handle({ title: 'Vai trò & phân quyền', permission: 'ROLE_READ' }),
  },
  {
    path: 'settings/general',
    element: <GeneralSettingsPage />,
    handle: handle({ title: 'Cấu hình chung', permission: 'SETTING_READ' }),
  },
  {
    path: 'settings/audit-logs',
    element: <AuditLogPage />,
    handle: handle({ title: 'Nhật ký hoạt động', permission: 'AUDIT_LOG_READ' }),
  },
  {
    path: 'announcements',
    element: <AnnouncementListPage />,
    handle: handle({ title: 'Thông báo', permission: 'NOTIFICATION_READ' }),
  },
]

const implementedPaths = new Set(IMPLEMENTED.map((r) => `/${r.path}`).filter((p) => !p.includes(':')))

const UNDER_CONSTRUCTION: RouteObject[] = ALL_LEAVES.filter((leaf) => !implementedPaths.has(leaf.path)).map(
  (leaf) => ({
    path: leaf.path.slice(1),
    element: <UnderConstructionPage />,
    handle: handle({ title: leaf.label, permission: leaf.permission }),
  }),
)

export const routes: RouteObject[] = [
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/reset-password', element: <ResetPasswordPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { element: <AuthLayout />, children: [{ path: '/change-password', element: <ChangePasswordPage /> }] },
      {
        path: '/',
        element: <MainLayout />,
        children: [
          { index: true, element: <DashboardPage />, handle: handle({ title: 'Bảng điều khiển' }) },
          { path: 'profile', element: <ProfilePage />, handle: handle({ title: 'Hồ sơ cá nhân' }) },
          { path: '403', element: <ForbiddenPage /> },
          ...IMPLEMENTED,
          ...UNDER_CONSTRUCTION,
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)

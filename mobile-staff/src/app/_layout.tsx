import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '@/lib/auth'
import { subscribeNotificationTaps } from '@/lib/push'
import { colors } from '@/theme'

void SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 20_000 } } }),
  )
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <Navigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

/** Chưa đăng nhập: chỉ màn Đăng nhập; mật khẩu tạm: chỉ Đổi mật khẩu; còn lại: app chính. */
function Navigator() {
  const { status, mustChangePassword } = useAuth()
  const signedIn = status === 'signedIn'

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync()
  }, [status])
  useEffect(() => subscribeNotificationTaps(), [])

  if (status === 'loading') return null

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && mustChangePassword}>
        <Stack.Screen name="change-password" options={{ title: 'Đổi mật khẩu', headerBackVisible: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !mustChangePassword}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="building" options={{ title: 'Chọn tòa nhà', presentation: 'modal' }} />
        <Stack.Screen name="notifications" options={{ title: 'Thông báo' }} />
        <Stack.Screen name="tickets/[id]" options={{ title: 'Yêu cầu hỗ trợ' }} />
        <Stack.Screen name="sos/[id]" options={{ title: 'Cảnh báo SOS' }} />
        <Stack.Screen name="bookings/[id]" options={{ title: 'Đăng ký tiện ích' }} />
        <Stack.Screen name="declarations/[id]" options={{ title: 'Phiếu kê khai' }} />
        <Stack.Screen name="orders/[id]" options={{ title: 'Đơn dịch vụ' }} />
        <Stack.Screen name="meter" options={{ title: 'Ghi chỉ số điện nước' }} />
        <Stack.Screen name="lookup" options={{ title: 'Tra cứu' }} />
        <Stack.Screen name="apartments/[id]" options={{ title: 'Căn hộ' }} />
        <Stack.Screen name="apartments/index" options={{ title: 'Căn hộ' }} />
        <Stack.Screen name="apartments/new" options={{ title: 'Thêm căn hộ' }} />
        <Stack.Screen name="buildings/index" options={{ title: 'Tòa nhà' }} />
        <Stack.Screen name="buildings/new" options={{ title: 'Thêm tòa nhà' }} />
        <Stack.Screen name="buildings/[id]" options={{ title: 'Tòa nhà' }} />
        <Stack.Screen name="apartment-assets/index" options={{ title: 'Hạng mục căn hộ' }} />
        <Stack.Screen name="apartment-assets/categories/new" options={{ title: 'Thêm danh mục' }} />
        <Stack.Screen name="apartment-assets/categories/[id]" options={{ title: 'Danh mục' }} />
        <Stack.Screen name="apartment-assets/items/new" options={{ title: 'Thêm hạng mục' }} />
        <Stack.Screen name="apartment-assets/items/[id]" options={{ title: 'Hạng mục' }} />
        <Stack.Screen name="residents/index" options={{ title: 'Cư dân' }} />
        <Stack.Screen name="residents/new" options={{ title: 'Thêm cư dân' }} />
        <Stack.Screen name="residents/[id]" options={{ title: 'Cư dân' }} />
        <Stack.Screen name="declarations/index" options={{ title: 'Kê khai từ cư dân' }} />
        <Stack.Screen name="access-cards/index" options={{ title: 'Thẻ từ' }} />
        <Stack.Screen name="access-cards/new" options={{ title: 'Thêm thẻ từ' }} />
        <Stack.Screen name="access-cards/[id]" options={{ title: 'Thẻ từ' }} />
        <Stack.Screen name="vouchers/index" options={{ title: 'Voucher' }} />
        <Stack.Screen name="vouchers/new" options={{ title: 'Thêm voucher' }} />
        <Stack.Screen name="vouchers/[id]" options={{ title: 'Voucher' }} />
        <Stack.Screen name="reminders/index" options={{ title: 'Nhắc nhở' }} />
        <Stack.Screen name="reminders/new" options={{ title: 'Thêm nhắc nhở' }} />
        <Stack.Screen name="reminders/[id]" options={{ title: 'Nhắc nhở' }} />
        <Stack.Screen name="surveys/index" options={{ title: 'Khảo sát ý kiến' }} />
        <Stack.Screen name="surveys/new" options={{ title: 'Thêm khảo sát' }} />
        <Stack.Screen name="surveys/[id]" options={{ title: 'Khảo sát' }} />
        <Stack.Screen name="amenities/index" options={{ title: 'Danh mục tiện ích' }} />
        <Stack.Screen name="amenities/new" options={{ title: 'Thêm tiện ích' }} />
        <Stack.Screen name="amenities/[id]" options={{ title: 'Tiện ích' }} />
        <Stack.Screen name="amenity-configs/[id]" options={{ title: 'Cấu hình tiện ích' }} />
        <Stack.Screen name="service-types/index" options={{ title: 'Loại dịch vụ' }} />
        <Stack.Screen name="service-types/new" options={{ title: 'Thêm loại dịch vụ' }} />
        <Stack.Screen name="service-types/[id]" options={{ title: 'Loại dịch vụ' }} />
        <Stack.Screen name="services/index" options={{ title: 'Dịch vụ' }} />
        <Stack.Screen name="services/new" options={{ title: 'Thêm dịch vụ' }} />
        <Stack.Screen name="services/[id]" options={{ title: 'Dịch vụ' }} />
        <Stack.Screen name="orders/new" options={{ title: 'Tạo đơn dịch vụ' }} />
        <Stack.Screen name="transactions/index" options={{ title: 'Lịch sử giao dịch' }} />
        <Stack.Screen name="amenity-reports/index" options={{ title: 'Báo cáo tiện ích' }} />
        <Stack.Screen name="bookings/index" options={{ title: 'Đăng ký tiện ích' }} />
        <Stack.Screen name="bookings/new" options={{ title: 'Tạo lượt đặt' }} />
        <Stack.Screen name="ticket-categories/index" options={{ title: 'Danh mục yêu cầu' }} />
        <Stack.Screen name="ticket-categories/new" options={{ title: 'Thêm danh mục' }} />
        <Stack.Screen name="ticket-categories/[id]" options={{ title: 'Danh mục yêu cầu' }} />
        <Stack.Screen name="tickets/new" options={{ title: 'Tạo yêu cầu' }} />
        <Stack.Screen name="document-categories/index" options={{ title: 'Danh mục tài liệu' }} />
        <Stack.Screen name="document-categories/new" options={{ title: 'Thêm danh mục' }} />
        <Stack.Screen name="document-categories/[id]" options={{ title: 'Danh mục tài liệu' }} />
        <Stack.Screen name="documents/index" options={{ title: 'Tài liệu' }} />
        <Stack.Screen name="documents/new" options={{ title: 'Thêm tài liệu' }} />
        <Stack.Screen name="documents/[id]" options={{ title: 'Tài liệu' }} />
        <Stack.Screen name="profile-password" options={{ title: 'Đổi mật khẩu' }} />
      </Stack.Protected>
    </Stack>
  )
}

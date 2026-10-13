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
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
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
        <Stack.Screen name="fees/[id]" options={{ title: 'Thông báo phí' }} />
        <Stack.Screen name="payments" options={{ title: 'Lịch sử thanh toán' }} />
        <Stack.Screen name="tickets/new" options={{ title: 'Gửi yêu cầu' }} />
        <Stack.Screen name="tickets/[id]" options={{ title: 'Yêu cầu' }} />
        <Stack.Screen name="amenities/[id]" options={{ title: 'Đặt tiện ích' }} />
        <Stack.Screen name="bookings/index" options={{ title: 'Lượt đặt của tôi' }} />
        <Stack.Screen name="bookings/[id]" options={{ title: 'Lượt đặt' }} />
        <Stack.Screen name="inbox" options={{ title: 'Thông báo' }} />
        <Stack.Screen name="sos" options={{ title: 'Khẩn cấp (SOS)', presentation: 'modal' }} />
        <Stack.Screen name="profile-password" options={{ title: 'Đổi mật khẩu' }} />
        <Stack.Screen name="apartment" options={{ title: 'Căn hộ của tôi' }} />
        <Stack.Screen name="declarations/index" options={{ title: 'Phiếu kê khai' }} />
        <Stack.Screen name="declarations/member" options={{ title: 'Kê khai thành viên' }} />
        <Stack.Screen name="declarations/vehicle" options={{ title: 'Kê khai xe' }} />
        <Stack.Screen name="declarations/[id]" options={{ title: 'Phiếu kê khai' }} />
        <Stack.Screen name="services/index" options={{ title: 'Dịch vụ' }} />
        <Stack.Screen name="services/[id]" options={{ title: 'Đặt dịch vụ' }} />
        <Stack.Screen name="orders/index" options={{ title: 'Đơn dịch vụ' }} />
        <Stack.Screen name="orders/[id]" options={{ title: 'Đơn dịch vụ' }} />
        <Stack.Screen name="surveys/index" options={{ title: 'Khảo sát ý kiến' }} />
        <Stack.Screen name="surveys/[id]" options={{ title: 'Khảo sát' }} />
        <Stack.Screen name="documents" options={{ title: 'Tài liệu' }} />
      </Stack.Protected>
    </Stack>
  )
}

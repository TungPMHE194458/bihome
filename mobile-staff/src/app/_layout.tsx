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
        <Stack.Screen name="profile-password" options={{ title: 'Đổi mật khẩu' }} />
      </Stack.Protected>
    </Stack>
  )
}

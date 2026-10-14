import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { Platform } from 'react-native'
import { authApi } from '@/lib/staff'

let token: string | null = null

export const currentPushToken = () => token

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

/**
 * Xin quyền thông báo, lấy Expo push token và gửi lên backend (POST /notifications/push-tokens). Bỏ qua trên web /
 * máy ảo / khi chưa có EAS projectId — chuông thông báo trong app vẫn là nguồn chính.
 */
export async function registerForPush(): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Thông báo BiHome Quản lý',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400],
        lightColor: '#DC2626',
      })
    }
    let { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status
    }
    if (status !== 'granted') return
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
    if (!projectId) return
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
    await authApi.registerPushToken(token, Platform.OS === 'ios' ? 'IOS' : 'ANDROID')
  } catch {
    // Không có push vẫn dùng được app.
  }
}

/**
 * Link trong thông báo là đường dẫn của web BQL (vd /tickets/12, /sos-alerts?view=3) → màn hình tương ứng của app.
 * Không có màn hình phù hợp thì mở danh sách thông báo.
 */
export function routeForLink(link?: string | null): string {
  if (!link) return '/notifications'
  const [path, query = ''] = link.split('?')
  const view = new URLSearchParams(query).get('view')
  const id = view ?? path.match(/\/(\d+)$/)?.[1]
  if (path.startsWith('/tickets') && id) return `/tickets/${id}`
  if (path.startsWith('/sos-alerts')) return id ? `/sos/${id}` : '/sos'
  if (path.startsWith('/amenity-bookings') && id) return `/bookings/${id}`
  if (path.startsWith('/declarations') && id) return `/declarations/${id}`
  if (path.startsWith('/service') && id) return `/orders/${id}`
  return '/notifications'
}

/** Bấm vào thông báo đẩy → mở màn hình theo link backend gửi kèm. */
export function subscribeNotificationTaps(): (() => void) | undefined {
  if (Platform.OS === 'web') return
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const link = response.notification.request.content.data?.link
    router.push(routeForLink(typeof link === 'string' ? link : null) as never)
  })
  return () => sub.remove()
}

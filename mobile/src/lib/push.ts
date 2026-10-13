import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { Platform } from 'react-native'
import { api } from '@/lib/resident'

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
 * Xin quyền thông báo, lấy Expo push token và gửi lên backend. Bỏ qua trên web / máy ảo / khi chưa có EAS projectId
 * (bản dev chưa liên kết EAS) — hộp thư trong app vẫn là nguồn chính.
 */
export async function registerForPush(): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Thông báo BiHome',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1F9D55',
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
    await api.registerPushToken(token, Platform.OS === 'ios' ? 'IOS' : 'ANDROID')
  } catch {
    // Không có push vẫn dùng được app.
  }
}

/** Bấm vào thông báo → mở màn hình theo link backend gửi kèm (vd /fees/12). */
export function subscribeNotificationTaps(): (() => void) | undefined {
  if (Platform.OS === 'web') return
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const link = response.notification.request.content.data?.link
    if (typeof link === 'string' && link.startsWith('/')) router.push(link as never)
  })
  return () => sub.remove()
}

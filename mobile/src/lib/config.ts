import Constants from 'expo-constants'
import { Platform } from 'react-native'

/**
 * Địa chỉ backend: EXPO_PUBLIC_API_URL (vd https://api.bihome.vn). Khi dev không đặt: web dùng localhost; điện thoại
 * chạy Expo Go dùng IP máy đang chạy Metro (cùng mạng Wi-Fi), backend ở cổng 8080.
 */
function defaultApiUrl(): string {
  if (Platform.OS === 'web') return 'http://localhost:8080'
  const host = Constants.expoConfig?.hostUri?.split(':')[0]
  return host ? `http://${host}:8080` : 'http://localhost:8080'
}

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || defaultApiUrl()).replace(/\/$/, '')
export const API_BASE = `${API_URL}/api/v1/resident`
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0'

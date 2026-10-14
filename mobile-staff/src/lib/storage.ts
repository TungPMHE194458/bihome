import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

/** Token lưu ở Keychain / Keystore (expo-secure-store); bản web khi dev dùng localStorage. */
export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(key) ?? null
      } catch {
        return null
      }
    }
    return SecureStore.getItemAsync(key)
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(key, value)
      } catch {
        // Trình duyệt chặn lưu trữ: phiên chỉ còn trong bộ nhớ.
      }
      return
    }
    await SecureStore.setItemAsync(key, value)
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.removeItem(key)
      } catch {
        // bỏ qua
      }
      return
    }
    await SecureStore.deleteItemAsync(key)
  },
}

export const KEYS = {
  refreshToken: 'bihome.staff.refreshToken',
  /** Id tòa đang chọn, "all" = Tất cả tòa. */
  building: 'bihome.staff.building',
} as const

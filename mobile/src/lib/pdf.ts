import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import { authHeaders, http } from '@/lib/api'
import { API_BASE } from '@/lib/config'

/**
 * Mở tệp cần đăng nhập (PDF thông báo phí, tài liệu BQL): điện thoại tải về bộ nhớ đệm rồi mở bảng chia sẻ / xem của
 * hệ điều hành; bản web mở ở tab mới. {@code path} tính từ /api/v1/resident.
 */
export async function openFile(path: string, fileName: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const { data } = await http.get<Blob>(path, { responseType: 'blob' })
    globalThis.open?.(URL.createObjectURL(data), '_blank')
    return
  }
  const safeName = fileName.replace(/[\\/:*?"<>|]/g, '_')
  const file = await File.downloadFileAsync(`${API_BASE}${path}`, new File(Paths.cache, safeName), {
    headers: authHeaders(),
    idempotent: true,
  })
  await Sharing.shareAsync(file.uri, {
    mimeType,
    UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined,
    dialogTitle: fileName,
  })
}

export function openPdf(path: string, fileName: string): Promise<void> {
  return openFile(path, fileName, 'application/pdf')
}

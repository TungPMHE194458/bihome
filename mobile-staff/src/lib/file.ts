import DateTimePicker from '@react-native-community/datetimepicker'
import * as DocumentPicker from 'expo-document-picker'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import { authHeaders, http } from '@/lib/api'
import { API_BASE } from '@/lib/config'

export { DateTimePicker }

/**
 * Mở tệp cần đăng nhập (PDF, Excel xuất, ảnh gốc): điện thoại tải về bộ nhớ đệm rồi mở bảng chia sẻ / xem của hệ điều
 * hành; bản web mở tab mới / tải xuống. {@code path} tính từ /api/v1 (vd /apartments/export).
 */
export async function openFile(path: string, fileName: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const { data } = await http.get<Blob>(path, { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
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

export const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export function downloadExcel(path: string, fileName: string): Promise<void> {
  return openFile(path, fileName, EXCEL_MIME)
}

export interface PickedFile {
  uri: string
  name: string
  mimeType: string
  /** Bản web: Blob thật để gửi multipart; app: dùng uri. */
  blob?: Blob
}

/** Chọn một file Excel từ máy (nhập dữ liệu hàng loạt). null = người dùng huỷ. */
export async function pickExcelFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [EXCEL_MIME, 'application/vnd.ms-excel'],
    copyToCacheDirectory: true,
  })
  if (result.canceled || !result.assets[0]) return null
  const asset = result.assets[0]
  const blob = Platform.OS === 'web' ? await fetch(asset.uri).then((r) => r.blob()) : undefined
  return { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? EXCEL_MIME, blob }
}

/** Chọn một tệp bất kỳ (tài liệu PDF / Word / ảnh...). null = người dùng huỷ. */
export async function pickDocumentFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
  if (result.canceled || !result.assets[0]) return null
  const asset = result.assets[0]
  const blob = Platform.OS === 'web' ? await fetch(asset.uri).then((r) => r.blob()) : undefined
  return { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream', blob }
}

/** Gửi multipart/form-data với field "file" (dùng cho import Excel, upload ảnh thô). */
export function toFormData(file: PickedFile, fieldName = 'file'): FormData {
  const form = new FormData()
  if (Platform.OS === 'web' && file.blob) {
    form.append(fieldName, file.blob, file.name)
  } else {
    form.append(fieldName, { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob)
  }
  return form
}

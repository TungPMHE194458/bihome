import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native'
import { Icon } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { notify } from '@/lib/dialogs'
import { authApi } from '@/lib/staff'
import { colors } from '@/theme'

export interface UploadedPhoto {
  fileId: number
  uri: string
}

/** Chụp / chọn ảnh và tải lên ngay (POST /files theo mục đích); trả danh sách fileId để gửi kèm. */
export function PhotoPicker({
  value,
  onChange,
  max = 5,
  purpose = 'TICKET_ATTACHMENT',
}: {
  value: UploadedPhoto[]
  onChange: (v: UploadedPhoto[]) => void
  max?: number
  purpose?: string
}) {
  const [uploading, setUploading] = useState(false)

  const pick = async (camera: boolean) => {
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) {
        notify('Chưa cấp quyền máy ảnh', 'Hãy cho phép BiHome Quản lý dùng máy ảnh trong Cài đặt.')
        return
      }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: false }
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options)
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setUploading(true)
    try {
      const name = asset.fileName ?? `anh-${Date.now()}.jpg`
      const uploaded =
        Platform.OS === 'web' && asset.file
          ? await authApi.uploadBlob(asset.file, name, purpose)
          : await authApi.uploadPhoto(asset.uri, name, asset.mimeType ?? 'image/jpeg', purpose)
      onChange([...value, { fileId: uploaded.id, uri: asset.uri }])
    } catch (e) {
      notify('Không tải được ảnh', errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <View style={styles.row}>
      {value.map((p) => (
        <View key={p.fileId}>
          <Image source={{ uri: p.uri }} style={styles.thumb} contentFit="cover" />
          <Pressable
            style={styles.remove}
            onPress={() => onChange(value.filter((x) => x.fileId !== p.fileId))}
            accessibilityLabel="Bỏ ảnh"
            hitSlop={6}
          >
            <Icon name="close" size={14} color="#FFFFFF" />
          </Pressable>
        </View>
      ))}
      {uploading && (
        <View style={[styles.thumb, styles.add]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
      {!uploading && value.length < max && (
        <>
          {Platform.OS !== 'web' && (
            <Pressable style={[styles.thumb, styles.add]} onPress={() => void pick(true)} accessibilityLabel="Chụp ảnh">
              <Icon name="camera-plus-outline" size={26} color={colors.primary} />
            </Pressable>
          )}
          <Pressable style={[styles.thumb, styles.add]} onPress={() => void pick(false)} accessibilityLabel="Chọn ảnh">
            <Icon name="image-plus" size={26} color={colors.primary} />
          </Pressable>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  add: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

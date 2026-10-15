import { useQuery } from '@tanstack/react-query'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import { Button, Chip, Icon, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { pickDocumentFile, toFormData } from '@/lib/file'
import { formatDateTime, formatFileSize } from '@/lib/format'
import { authApi, documentApi } from '@/lib/staff'
import type { DocumentItem } from '@/lib/types'
import { colors, radius } from '@/theme'

export function ReplaceFileModal({
  visible,
  doc,
  onClose,
  onSaved,
}: {
  visible: boolean
  doc: DocumentItem
  onClose: () => void
  onSaved: (d: DocumentItem) => void
}) {
  const versions = useQuery({ queryKey: ['document-versions', doc.id], queryFn: () => documentApi.versions(doc.id), enabled: visible })
  const [fileId, setFileId] = useState<number | null>(null)
  const [fileName, setFileName] = useState<string>()
  const [fileSize, setFileSize] = useState<number>()
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const pickFile = async () => {
    const picked = await pickDocumentFile()
    if (!picked) return
    setUploading(true)
    try {
      const uploaded = await authApi.uploadForm(toFormData(picked), 'DOCUMENT')
      setFileId(uploaded.id)
      setFileName(picked.name)
      setFileSize(picked.blob?.size)
    } catch (e) {
      setMessage(errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!fileId) e.fileId = 'Vui lòng chọn tệp mới'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      onSaved(await documentApi.replaceFile(doc.id, { fileId: fileId!, note: note.trim() || null, version: doc.version }))
    } catch (err) {
      setErrors(fieldErrors(err))
      setMessage(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={styles.close}>Đóng</Text>
        </Pressable>
        <Text style={styles.title}>Thay file</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {message && <Text style={{ color: colors.danger }}>{message}</Text>}
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          Tài liệu <Text style={{ fontWeight: '700', color: colors.text }}>{doc.name}</Text> — tệp hiện tại (v{doc.fileVersionNo}) sẽ được lưu lại thành phiên bản cũ.
        </Text>
        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Tệp mới *</Text>
          {fileName ? (
            <View style={styles.filePicked}>
              <Icon name="file-document-outline" size={20} color={colors.primaryDark} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
                {fileSize != null && <Text style={styles.fileMeta}>{formatFileSize(fileSize)}</Text>}
              </View>
              <Pressable onPress={() => void pickFile()} hitSlop={8}>
                <Icon name="swap-horizontal" size={20} color={colors.primaryDark} />
              </Pressable>
            </View>
          ) : (
            <Button title="Chọn tệp" icon="file-upload-outline" variant="outline" onPress={() => void pickFile()} loading={uploading} />
          )}
          {errors.fileId && <Text style={styles.error}>{errors.fileId}</Text>}
        </View>
        <TextField label="Ghi chú thay đổi" value={note} onChangeText={setNote} placeholder="vd Cập nhật biểu phí 2027" />
        <Button title="Thay file" onPress={() => void submit()} loading={saving} />

        <View style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>Lịch sử phiên bản</Text>
          {(versions.data ?? []).map((v) => (
            <View key={v.versionNo} style={styles.versionRow}>
              <View style={styles.versionTop}>
                <Text style={styles.versionNo}>v{v.versionNo}</Text>
                {v.current && <Chip label="Hiện tại" tone="success" />}
              </View>
              <Text style={styles.versionFile} numberOfLines={1}>{v.fileName} · {formatFileSize(v.fileSize)}</Text>
              <Text style={styles.versionMeta}>
                {formatDateTime(v.uploadedAt)}{v.uploadedBy ? ` · ${v.uploadedBy}` : ''}
              </Text>
              {!v.current && v.note ? <Text style={styles.versionNote}>Ghi chú: {v.note}</Text> : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  close: { color: colors.primaryDark, fontWeight: '600', fontSize: 15 },
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  filePicked: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  fileName: { fontSize: 14, color: colors.text, fontWeight: '600' },
  fileMeta: { fontSize: 12, color: colors.textMuted },
  error: { fontSize: 12, color: colors.danger },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  versionRow: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, gap: 2 },
  versionTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  versionNo: { fontSize: 14, fontWeight: '700', color: colors.text },
  versionFile: { fontSize: 13, color: colors.text },
  versionMeta: { fontSize: 12, color: colors.textMuted },
  versionNote: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
})

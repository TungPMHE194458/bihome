import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ChipSelect, SearchPicker } from '@/components/form'
import { Button, Icon, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { DOCUMENT_AUDIENCE } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { pickDocumentFile, toFormData } from '@/lib/file'
import { formatFileSize } from '@/lib/format'
import { authApi, documentApi } from '@/lib/staff'
import type { DocumentAudience, DocumentItem, DocumentRequest } from '@/lib/types'
import { colors, radius } from '@/theme'

const AUDIENCE_OPTIONS = (Object.keys(DOCUMENT_AUDIENCE) as DocumentAudience[]).map((v) => ({ value: v, label: DOCUMENT_AUDIENCE[v] }))

/** Thêm tài liệu (kèm tệp, bắt buộc) hoặc sửa thông tin; thay tệp làm riêng ở trang chi tiết. */
export function DocumentForm({ doc, onSaved }: { doc?: DocumentItem; onSaved: (d: DocumentItem) => void }) {
  const editing = !!doc
  const [code, setCode] = useState(doc?.code ?? '')
  const [name, setName] = useState(doc?.name ?? '')
  const [categoryId, setCategoryId] = useState<number | null>(doc?.categoryId ?? null)
  const [categoryLabel, setCategoryLabel] = useState(doc?.categoryName)
  const [audience, setAudience] = useState<DocumentAudience>(doc?.audience ?? 'ALL_RESIDENTS')
  const [tagsText, setTagsText] = useState(doc?.tags.join(', ') ?? '')
  const [description, setDescription] = useState(doc?.description ?? '')
  const [fileId, setFileId] = useState<number | null>(null)
  const [fileName, setFileName] = useState<string>()
  const [fileSize, setFileSize] = useState<number>()
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
      if (!name.trim()) setName(picked.name.replace(/\.[^.]+$/, ''))
    } catch (e) {
      notify('Không tải được tệp', errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Vui lòng nhập tên tài liệu'
    if (!categoryId) e.categoryId = 'Vui lòng chọn danh mục'
    if (!editing && !fileId) e.fileId = 'Vui lòng chọn tệp'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    const body: DocumentRequest = {
      code: code.trim() ? code.trim().toUpperCase() : null,
      name: name.trim(),
      description: description.trim() || null,
      categoryId: categoryId!,
      audience,
      tags: tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      fileId: editing ? undefined : (fileId ?? undefined),
      version: doc?.version,
    }
    setSaving(true)
    try {
      onSaved(await documentApi.save(doc?.id, body))
    } catch (err) {
      setErrors(fieldErrors(err))
      setMessage(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ gap: 16 }}>
      {message && <Text style={{ color: colors.danger }}>{message}</Text>}
      {!editing && (
        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Tệp tài liệu *</Text>
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
      )}
      <TextField label="Tên tài liệu *" value={name} onChangeText={setName} error={errors.name} />
      <TextField label="Mã" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" placeholder={editing ? undefined : 'Bỏ trống để tự sinh số'} />
      <SearchPicker
        label="Danh mục"
        required
        value={categoryId}
        valueLabel={categoryLabel}
        onSearch={(k) =>
          documentApi.categoryOptions().then((os) => os.filter((o) => !k || o.name.toLowerCase().includes(k.toLowerCase())).map((o) => ({ value: o.id, label: o.name })))
        }
        onChange={(v, o) => {
          setCategoryId(v)
          setCategoryLabel(o?.label)
        }}
        error={errors.categoryId}
      />
      <ChipSelect label="Đối tượng" required options={AUDIENCE_OPTIONS} value={audience} onChange={(v) => v && setAudience(v)} />
      <TextField label="Thẻ (phân cách bằng dấu phẩy)" value={tagsText} onChangeText={setTagsText} placeholder="vd nội quy, phòng cháy" />
      <TextField label="Mô tả" value={description} onChangeText={setDescription} multiline />
      <Button title={editing ? 'Lưu thay đổi' : 'Thêm tài liệu'} onPress={() => void submit()} loading={saving} />
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  filePicked: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  fileName: { fontSize: 14, color: colors.text, fontWeight: '600' },
  fileMeta: { fontSize: 12, color: colors.textMuted },
  error: { fontSize: 12, color: colors.danger },
})

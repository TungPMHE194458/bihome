import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import { Button, Icon, SwitchRow, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { CATEGORY_COLORS, DOCUMENT_CATEGORY_STATUS } from '@/lib/constants'
import { documentApi } from '@/lib/staff'
import type { DocumentCategory, DocumentCategoryRequest } from '@/lib/types'
import { colors } from '@/theme'

export function DocumentCategoryForm({ category, onSaved }: { category?: DocumentCategory; onSaved: (c: DocumentCategory) => void }) {
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0])
  const [active, setActive] = useState((category?.status ?? 'ACTIVE') === 'ACTIVE')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Vui lòng nhập tên danh mục'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    const body: DocumentCategoryRequest = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      status: active ? 'ACTIVE' : 'INACTIVE',
      version: category?.version,
    }
    setSaving(true)
    try {
      onSaved(await documentApi.saveCategory(category?.id, body))
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
      <TextField label="Tên danh mục *" value={name} onChangeText={setName} error={errors.name} />
      <View style={{ gap: 6 }}>
        <Text style={styles.label}>Màu</Text>
        <View style={styles.colors}>
          {CATEGORY_COLORS.map((c) => (
            <Pressable key={c} onPress={() => setColor(c)} style={[styles.swatch, { backgroundColor: c }]}>
              {c === color && <Icon name="check" size={18} color="#fff" />}
            </Pressable>
          ))}
        </View>
      </View>
      <TextField label="Mô tả" value={description} onChangeText={setDescription} multiline />
      <SwitchRow label={active ? DOCUMENT_CATEGORY_STATUS.ACTIVE.label : DOCUMENT_CATEGORY_STATUS.INACTIVE.label} value={active} onValueChange={setActive} />
      <Button title={category ? 'Lưu thay đổi' : 'Thêm danh mục'} onPress={() => void submit()} loading={saving} />
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
})

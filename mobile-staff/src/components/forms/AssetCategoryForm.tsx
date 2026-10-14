import { useState } from 'react'
import { Text, View } from 'react-native'
import { Button, SwitchRow, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { ASSET_STATUS, ASSET_UNIT_SUGGESTIONS } from '@/lib/constants'
import { assetApi } from '@/lib/staff'
import type { AssetCategory, AssetCategoryRequest } from '@/lib/types'
import { colors } from '@/theme'

export function AssetCategoryForm({ category, onSaved }: { category?: AssetCategory; onSaved: (c: AssetCategory) => void }) {
  const { buildingId } = useAuth()
  const [name, setName] = useState(category?.name ?? '')
  const [unit, setUnit] = useState(category?.unit ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [active, setActive] = useState((category?.status ?? 'ACTIVE') === 'ACTIVE')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const effectiveBuildingId = category?.buildingId ?? buildingId

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Vui lòng nhập tên danh mục'
    if (!unit.trim()) e.unit = 'Vui lòng nhập đơn vị'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    if (!effectiveBuildingId) {
      setMessage('Chọn một tòa nhà trước khi thêm danh mục.')
      return
    }
    const body: AssetCategoryRequest = {
      buildingId: effectiveBuildingId,
      name: name.trim(),
      unit: unit.trim(),
      description: description.trim() || null,
      status: active ? 'ACTIVE' : 'INACTIVE',
      version: category?.version,
    }
    setSaving(true)
    try {
      onSaved(await assetApi.saveCategory(category?.id, body))
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
      <TextField
        label="Đơn vị *"
        value={unit}
        onChangeText={setUnit}
        error={errors.unit}
        placeholder={ASSET_UNIT_SUGGESTIONS.join(', ')}
      />
      <TextField label="Mô tả" value={description} onChangeText={setDescription} multiline />
      <SwitchRow label={active ? ASSET_STATUS.ACTIVE.label : ASSET_STATUS.INACTIVE.label} value={active} onValueChange={setActive} />
      <Button title={category ? 'Lưu thay đổi' : 'Thêm danh mục'} onPress={() => void submit()} loading={saving} />
    </View>
  )
}

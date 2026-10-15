import { useState } from 'react'
import { Text, View } from 'react-native'
import { Button, SwitchRow, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { SERVICE_STATUS } from '@/lib/constants'
import { serviceApi } from '@/lib/staff'
import type { ServiceType, ServiceTypeRequest } from '@/lib/types'
import { colors } from '@/theme'

export function ServiceTypeForm({ type, onSaved }: { type?: ServiceType; onSaved: (t: ServiceType) => void }) {
  const [name, setName] = useState(type?.name ?? '')
  const [description, setDescription] = useState(type?.description ?? '')
  const [active, setActive] = useState((type?.status ?? 'ACTIVE') === 'ACTIVE')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Vui lòng nhập tên loại dịch vụ'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    const body: ServiceTypeRequest = { name: name.trim(), description: description.trim() || null, status: active ? 'ACTIVE' : 'INACTIVE', version: type?.version }
    setSaving(true)
    try {
      onSaved(await serviceApi.saveType(type?.id, body))
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
      <TextField label="Tên loại dịch vụ *" value={name} onChangeText={setName} error={errors.name} />
      <TextField label="Mô tả" value={description} onChangeText={setDescription} multiline />
      <SwitchRow label={active ? SERVICE_STATUS.ACTIVE.label : SERVICE_STATUS.INACTIVE.label} value={active} onValueChange={setActive} />
      <Button title={type ? 'Lưu thay đổi' : 'Thêm loại dịch vụ'} onPress={() => void submit()} loading={saving} />
    </View>
  )
}

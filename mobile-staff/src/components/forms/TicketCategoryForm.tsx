import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { SearchPicker } from '@/components/form'
import { Button, SwitchRow, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { TICKET_CATEGORY_STATUS } from '@/lib/constants'
import { ticketApi } from '@/lib/staff'
import type { TicketCategory, TicketCategoryRequest } from '@/lib/types'
import { colors } from '@/theme'

export function TicketCategoryForm({ category, onSaved }: { category?: TicketCategory; onSaved: (c: TicketCategory) => void }) {
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [responseSla, setResponseSla] = useState(category ? String(category.responseSlaHours) : '')
  const [resolutionSla, setResolutionSla] = useState(category ? String(category.resolutionSlaHours) : '')
  const [assigneeId, setAssigneeId] = useState<number | null>(category?.defaultAssigneeId ?? null)
  const [assigneeLabel, setAssigneeLabel] = useState(category?.defaultAssigneeName)
  const [active, setActive] = useState((category?.status ?? 'ACTIVE') === 'ACTIVE')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (category?.defaultAssigneeId && !assigneeLabel) {
      void ticketApi.categoryAssignees().then((list) => {
        const found = list.find((a) => a.id === category.defaultAssigneeId)
        if (found) setAssigneeLabel(found.fullName)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Vui lòng nhập tên danh mục'
    if (!responseSla.trim()) e.responseSlaHours = 'Vui lòng nhập SLA phản hồi'
    if (!resolutionSla.trim()) e.resolutionSlaHours = 'Vui lòng nhập SLA xử lý'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    const body: TicketCategoryRequest = {
      name: name.trim(),
      description: description.trim() || null,
      responseSlaHours: Number(responseSla) || 0,
      resolutionSlaHours: Number(resolutionSla) || 0,
      defaultAssigneeId: assigneeId,
      status: active ? 'ACTIVE' : 'INACTIVE',
      version: category?.version,
    }
    setSaving(true)
    try {
      onSaved(await ticketApi.saveCategory(category?.id, body))
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
      <TextField label="Tên danh mục *" value={name} onChangeText={setName} error={errors.name} placeholder="vd Điện, Nước, Thang máy" />
      <TextField
        label="SLA phản hồi (giờ) *"
        value={responseSla}
        onChangeText={(t) => setResponseSla(t.replace(/\D/g, ''))}
        keyboardType="number-pad"
        error={errors.responseSlaHours}
      />
      <TextField
        label="SLA xử lý (giờ) *"
        value={resolutionSla}
        onChangeText={(t) => setResolutionSla(t.replace(/\D/g, ''))}
        keyboardType="number-pad"
        error={errors.resolutionSlaHours}
      />
      <SearchPicker
        label="Người phụ trách mặc định"
        value={assigneeId}
        valueLabel={assigneeLabel}
        placeholder="Không có"
        onSearch={(k) =>
          ticketApi
            .categoryAssignees()
            .then((list) => list.filter((a) => !k || a.fullName.toLowerCase().includes(k.toLowerCase())).map((a) => ({ value: a.id, label: a.fullName })))
        }
        onChange={(v, o) => {
          setAssigneeId(v)
          setAssigneeLabel(o?.label)
        }}
      />
      <TextField label="Mô tả" value={description} onChangeText={setDescription} multiline />
      <SwitchRow label={active ? TICKET_CATEGORY_STATUS.ACTIVE.label : TICKET_CATEGORY_STATUS.INACTIVE.label} value={active} onValueChange={setActive} />
      <Button title={category ? 'Lưu thay đổi' : 'Thêm danh mục'} onPress={() => void submit()} loading={saving} />
    </View>
  )
}

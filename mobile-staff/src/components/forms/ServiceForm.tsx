import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { ChipSelect } from '@/components/form'
import { PhotoPicker, type UploadedPhoto } from '@/components/PhotoPicker'
import { Button, SwitchRow, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { SERVICE_STATUS, SERVICE_UNIT_SUGGESTIONS } from '@/lib/constants'
import { serviceApi } from '@/lib/staff'
import type { Service, ServiceRequest } from '@/lib/types'
import { colors } from '@/theme'

export function ServiceForm({ service, onSaved }: { service?: Service; onSaved: (s: Service) => void }) {
  const types = useQuery({ queryKey: ['service-type-options'], queryFn: () => serviceApi.typeOptions() })
  const [code, setCode] = useState(service?.code ?? '')
  const [name, setName] = useState(service?.name ?? '')
  const [serviceTypeId, setServiceTypeId] = useState<number | null>(service?.serviceTypeId ?? null)
  const [unitPrice, setUnitPrice] = useState(service?.unitPrice != null ? String(service.unitPrice) : '')
  const [unit, setUnit] = useState(service?.unit ?? '')
  const [description, setDescription] = useState(service?.description ?? '')
  const [active, setActive] = useState((service?.status ?? 'ACTIVE') === 'ACTIVE')
  const [images, setImages] = useState<UploadedPhoto[]>(service?.images.map((i) => ({ fileId: i.fileId, uri: i.url })) ?? [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const typeOptions = [...(types.data ?? []), ...(service && !types.data?.some((t) => t.id === service.serviceTypeId) ? [{ id: service.serviceTypeId, name: `${service.serviceTypeName} (ngừng hoạt động)` }] : [])]

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Vui lòng nhập tên dịch vụ'
    if (!serviceTypeId) e.serviceTypeId = 'Vui lòng chọn loại dịch vụ'
    if (!unitPrice.trim() || Number(unitPrice) < 0) e.unitPrice = 'Đơn giá không hợp lệ'
    if (!unit.trim()) e.unit = 'Vui lòng nhập đơn vị'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    const body: ServiceRequest = {
      code: code.trim() ? code.trim().toUpperCase() : null,
      name: name.trim(),
      serviceTypeId: serviceTypeId!,
      unitPrice: Number(unitPrice),
      unit: unit.trim(),
      description: description.trim() || null,
      status: active ? 'ACTIVE' : 'INACTIVE',
      images: images.map((img, i) => ({ fileId: img.fileId, cover: i === 0 })),
      version: service?.version,
    }
    setSaving(true)
    try {
      onSaved(await serviceApi.save(service?.id, body))
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
      <Text style={{ fontWeight: '700', color: colors.text }}>Ảnh dịch vụ</Text>
      <PhotoPicker value={images} onChange={setImages} purpose="SERVICE_IMAGE" max={20} />
      <TextField label="Mã" value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="Bỏ trống để tự sinh DV0001..." error={errors.code} />
      <TextField label="Tên dịch vụ *" value={name} onChangeText={setName} error={errors.name} />
      <ChipSelect
        label="Loại dịch vụ"
        required
        options={typeOptions.map((t) => ({ value: t.id, label: t.name }))}
        value={serviceTypeId}
        onChange={setServiceTypeId}
        error={errors.serviceTypeId}
      />
      <TextField label="Đơn giá (đ) *" value={unitPrice} onChangeText={(t) => setUnitPrice(t.replace(/\D/g, ''))} keyboardType="number-pad" error={errors.unitPrice} />
      <TextField label="Đơn vị *" value={unit} onChangeText={setUnit} placeholder={SERVICE_UNIT_SUGGESTIONS.join(', ')} error={errors.unit} />
      <TextField label="Mô tả" value={description} onChangeText={setDescription} multiline />
      <SwitchRow label={active ? SERVICE_STATUS.ACTIVE.label : SERVICE_STATUS.INACTIVE.label} value={active} onValueChange={setActive} />
      <Button title={service ? 'Lưu thay đổi' : 'Thêm dịch vụ'} onPress={() => void submit()} loading={saving} />
    </View>
  )
}

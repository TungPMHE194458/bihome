import { useState } from 'react'
import { Text, View } from 'react-native'
import { PhotoPicker, type UploadedPhoto } from '@/components/PhotoPicker'
import { Button, SwitchRow, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { AMENITY_STATUS } from '@/lib/constants'
import { amenityApi } from '@/lib/staff'
import type { Amenity, AmenityRequest } from '@/lib/types'
import { colors } from '@/theme'

function validTime(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
}

export function AmenityForm({ amenity, onSaved }: { amenity?: Amenity; onSaved: (a: Amenity) => void }) {
  const [code, setCode] = useState(amenity?.code ?? '')
  const [name, setName] = useState(amenity?.name ?? '')
  const [location, setLocation] = useState(amenity?.location ?? '')
  const [capacity, setCapacity] = useState(amenity?.capacity != null ? String(amenity.capacity) : '')
  const [openTime, setOpenTime] = useState(amenity?.openTime ?? '06:00')
  const [closeTime, setCloseTime] = useState(amenity?.closeTime ?? '22:00')
  const [rules, setRules] = useState(amenity?.rules ?? '')
  const [requiresApproval, setRequiresApproval] = useState(amenity?.requiresApproval ?? false)
  const [active, setActive] = useState((amenity?.status ?? 'ACTIVE') === 'ACTIVE')
  const [images, setImages] = useState<UploadedPhoto[]>(amenity?.images.map((i) => ({ fileId: i.fileId, uri: i.url })) ?? [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!code.trim()) e.code = 'Vui lòng nhập mã'
    if (!name.trim()) e.name = 'Vui lòng nhập tên'
    const cap = Number(capacity)
    if (!capacity.trim() || !(cap > 0)) e.capacity = 'Sức chứa phải lớn hơn 0'
    if (!validTime(openTime)) e.openTime = 'Định dạng hh:mm'
    if (!validTime(closeTime)) e.closeTime = 'Định dạng hh:mm'
    else if (closeTime <= openTime) e.closeTime = 'Giờ đóng cửa phải sau giờ mở cửa'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return

    const body: AmenityRequest = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      location: location.trim() || null,
      capacity: cap,
      openTime,
      closeTime,
      rules: rules.trim() || null,
      requiresApproval,
      status: active ? 'ACTIVE' : 'INACTIVE',
      images: images.map((img, i) => ({ fileId: img.fileId, cover: i === 0 })),
      version: amenity?.version,
    }
    setSaving(true)
    try {
      onSaved(await amenityApi.save(amenity?.id, body))
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
      <Text style={{ fontWeight: '700', color: colors.text }}>Ảnh tiện ích</Text>
      <PhotoPicker value={images} onChange={setImages} purpose="AMENITY_IMAGE" max={20} />
      <TextField label="Mã *" value={code} onChangeText={(t) => setCode(t.toUpperCase())} error={errors.code} />
      <TextField label="Tên *" value={name} onChangeText={setName} error={errors.name} />
      <TextField label="Vị trí" value={location} onChangeText={setLocation} />
      <TextField label="Sức chứa *" value={capacity} onChangeText={(t) => setCapacity(t.replace(/\D/g, ''))} keyboardType="number-pad" error={errors.capacity} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TextField label="Giờ mở cửa" value={openTime} onChangeText={setOpenTime} placeholder="hh:mm" style={{ flex: 1 }} error={errors.openTime} />
        <TextField label="Giờ đóng cửa" value={closeTime} onChangeText={setCloseTime} placeholder="hh:mm" style={{ flex: 1 }} error={errors.closeTime} />
      </View>
      <TextField label="Nội quy" value={rules} onChangeText={setRules} multiline />
      <SwitchRow label="Cần duyệt đăng ký" value={requiresApproval} onValueChange={setRequiresApproval} />
      <SwitchRow label={active ? AMENITY_STATUS.ACTIVE.label : AMENITY_STATUS.INACTIVE.label} value={active} onValueChange={setActive} />
      <Button title={amenity ? 'Lưu thay đổi' : 'Thêm tiện ích'} onPress={() => void submit()} loading={saving} />
    </View>
  )
}

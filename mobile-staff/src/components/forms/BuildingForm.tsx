import { useState } from 'react'
import { Text, View } from 'react-native'
import { ChipSelect, SearchPicker } from '@/components/form'
import { PhotoPicker, type UploadedPhoto } from '@/components/PhotoPicker'
import { Button, SwitchRow, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { BUILDING_STATUS, BUILDING_TYPE, VN_PROVINCES } from '@/lib/constants'
import { buildingApi } from '@/lib/staff'
import type { BuildingDetail, BuildingRequest, BuildingType } from '@/lib/types'
import { colors } from '@/theme'

const TYPE_OPTIONS = (Object.keys(BUILDING_TYPE) as BuildingType[]).map((v) => ({ value: v, label: BUILDING_TYPE[v].label }))

/** Dùng chung cho tạo mới (app/buildings/new.tsx) và sửa (app/buildings/[id].tsx ở chế độ edit). */
export function BuildingForm({ building, onSaved }: { building?: BuildingDetail; onSaved: (b: BuildingDetail) => void }) {
  const [code, setCode] = useState(building?.code ?? '')
  const [name, setName] = useState(building?.name ?? '')
  const [province, setProvince] = useState(building?.province ?? '')
  const [ward, setWard] = useState(building?.ward ?? '')
  const [addressDetail, setAddressDetail] = useState(building?.addressDetail ?? '')
  const [type, setType] = useState<BuildingType>(building?.type ?? 'BUILDING')
  const [floorsAbove, setFloorsAbove] = useState(building?.floorsAbove != null ? String(building.floorsAbove) : '')
  const [floorsBelow, setFloorsBelow] = useState(building?.floorsBelow != null ? String(building.floorsBelow) : '')
  const [investor, setInvestor] = useState(building?.investor ?? '')
  const [hotline, setHotline] = useState(building?.hotline ?? '')
  const [managementEmail, setManagementEmail] = useState(building?.managementEmail ?? '')
  const [description, setDescription] = useState(building?.description ?? '')
  const [active, setActive] = useState((building?.status ?? 'ACTIVE') === 'ACTIVE')
  const [images, setImages] = useState<UploadedPhoto[]>(
    building?.images.map((i) => ({ fileId: i.fileId, uri: i.url })) ?? [],
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!code.trim()) e.code = 'Vui lòng nhập mã tòa'
    else if (!/^[A-Za-z0-9_-]+$/.test(code.trim())) e.code = 'Chỉ gồm chữ không dấu, số và _ -'
    if (!name.trim()) e.name = 'Vui lòng nhập tên tòa'
    if (!province.trim()) e.province = 'Vui lòng chọn tỉnh/thành'
    if (!ward.trim()) e.ward = 'Vui lòng nhập phường/xã'
    if (!addressDetail.trim()) e.addressDetail = 'Vui lòng nhập địa chỉ chi tiết'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return

    const body: BuildingRequest = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      province: province.trim(),
      ward: ward.trim(),
      addressDetail: addressDetail.trim(),
      type,
      floorsAbove: floorsAbove.trim() ? Number(floorsAbove) : null,
      floorsBelow: floorsBelow.trim() ? Number(floorsBelow) : null,
      investor: investor.trim() || null,
      hotline: hotline.trim() || null,
      managementEmail: managementEmail.trim() || null,
      description: description.trim() || null,
      status: active ? 'ACTIVE' : 'INACTIVE',
      images: images.map((img, i) => ({ fileId: img.fileId, cover: i === 0 })),
      version: building?.version,
    }
    setSaving(true)
    try {
      const saved = await buildingApi.save(building?.id, body)
      onSaved(saved)
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
      <Text style={{ fontWeight: '700', color: colors.text }}>Ảnh tòa nhà</Text>
      <PhotoPicker value={images} onChange={setImages} purpose="BUILDING_IMAGE" max={20} />
      <TextField label="Mã tòa *" value={code} onChangeText={setCode} autoCapitalize="characters" error={errors.code} />
      <TextField label="Tên tòa *" value={name} onChangeText={setName} error={errors.name} />
      <ChipSelect label="Loại" required options={TYPE_OPTIONS} value={type} onChange={(v) => v && setType(v)} />
      <SearchPicker
        label="Tỉnh/Thành phố"
        required
        value={province || null}
        options={VN_PROVINCES.map((p) => ({ value: p, label: p }))}
        onChange={(v) => setProvince(v ?? '')}
        error={errors.province}
      />
      <TextField label="Phường/Xã *" value={ward} onChangeText={setWard} error={errors.ward} />
      <TextField label="Địa chỉ chi tiết *" value={addressDetail} onChangeText={setAddressDetail} error={errors.addressDetail} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TextField
          label="Số tầng nổi"
          value={floorsAbove}
          onChangeText={(t) => setFloorsAbove(t.replace(/\D/g, ''))}
          keyboardType="number-pad"
          style={{ flex: 1 }}
        />
        <TextField
          label="Số tầng hầm"
          value={floorsBelow}
          onChangeText={(t) => setFloorsBelow(t.replace(/\D/g, ''))}
          keyboardType="number-pad"
          style={{ flex: 1 }}
        />
      </View>
      <TextField label="Chủ đầu tư" value={investor} onChangeText={setInvestor} />
      <TextField label="Hotline" value={hotline} onChangeText={setHotline} keyboardType="phone-pad" />
      <TextField label="Email quản lý" value={managementEmail} onChangeText={setManagementEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextField label="Mô tả" value={description} onChangeText={setDescription} multiline />
      <SwitchRow label={active ? BUILDING_STATUS.ACTIVE.label : BUILDING_STATUS.INACTIVE.label} value={active} onValueChange={setActive} />
      <Button title={building ? 'Lưu thay đổi' : 'Thêm tòa nhà'} onPress={() => void submit()} loading={saving} />
    </View>
  )
}

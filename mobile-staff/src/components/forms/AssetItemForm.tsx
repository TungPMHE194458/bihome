import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Switch, Text, View } from 'react-native'
import { DateInput, SearchPicker } from '@/components/form'
import { Button, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { apartmentApi } from '@/lib/api/apartment'
import { ASSET_STATUS, willBeInactive } from '@/lib/constants'
import { assetApi } from '@/lib/staff'
import type { ApartmentOption, AssetItem, AssetItemRequest } from '@/lib/types'
import { colors } from '@/theme'

function normalizePlate(v: string): string {
  return v.trim().replace(/\s+/g, ' ').toUpperCase()
}

export function AssetItemForm({ item, onSaved }: { item?: AssetItem; onSaved: (i: AssetItem) => void }) {
  const [apartmentId, setApartmentId] = useState<number | null>(item?.apartmentId ?? null)
  const [apartmentLabel, setApartmentLabel] = useState(item ? `${item.apartmentCode} · ${item.apartmentName}` : undefined)
  const [buildingId, setBuildingId] = useState<number | null>(item?.buildingId ?? null)
  const [apartmentOptions, setApartmentOptions] = useState<ApartmentOption[]>([])
  const [categoryId, setCategoryId] = useState<number | null>(item?.categoryId ?? null)
  const categories = useQuery({
    queryKey: ['asset-category-options', buildingId],
    queryFn: () => assetApi.categoryOptions(buildingId ?? undefined),
    enabled: buildingId != null,
  })
  const [name, setName] = useState(item?.name ?? '')
  const [plateNumber, setPlateNumber] = useState(item?.plateNumber ?? '')
  const [unit, setUnit] = useState(item?.unit ?? '')
  const [unitTouched, setUnitTouched] = useState(!!item?.unit)
  const [entryDate, setEntryDate] = useState<string | undefined>(item?.entryDate ?? new Date().toISOString().slice(0, 10))
  const [exitDate, setExitDate] = useState<string | undefined>(item?.exitDate)
  const [description, setDescription] = useState(item?.description ?? '')
  const [active, setActive] = useState((item?.status ?? 'ACTIVE') === 'ACTIVE')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!apartmentId) e.apartment = 'Vui lòng chọn căn hộ'
    if (!categoryId) e.categoryId = 'Vui lòng chọn danh mục'
    if (!name.trim()) e.name = 'Vui lòng nhập tên'
    if (!entryDate) e.entryDate = 'Vui lòng chọn ngày vào'
    if (exitDate && entryDate && exitDate < entryDate) e.exitDate = 'Ngày ra phải sau hoặc bằng ngày vào.'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return

    const body: AssetItemRequest = {
      apartmentId: apartmentId!,
      categoryId: categoryId!,
      name: name.trim(),
      plateNumber: plateNumber.trim() ? normalizePlate(plateNumber) : null,
      description: description.trim() || null,
      unit: unit.trim() || null,
      entryDate: entryDate!,
      exitDate: exitDate || null,
      status: active ? 'ACTIVE' : 'INACTIVE',
      version: item?.version,
    }
    setSaving(true)
    try {
      onSaved(await assetApi.saveItem(item?.id, body))
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
      <SearchPicker
        label="Căn hộ"
        required
        value={apartmentId}
        valueLabel={apartmentLabel}
        onSearch={(k) =>
          apartmentApi.options(k).then((os) => {
            setApartmentOptions(os)
            return os.map((o) => ({ value: o.id, label: `${o.code} · ${o.name}`, sublabel: o.buildingName }))
          })
        }
        onChange={(v, o) => {
          setApartmentId(v)
          setApartmentLabel(o?.label)
          setCategoryId(null)
          setBuildingId(v == null ? null : (apartmentOptions.find((x) => x.id === v)?.buildingId ?? null))
        }}
        error={errors.apartment}
      />
      <SearchPicker
        label="Danh mục"
        required
        value={categoryId}
        options={(categories.data ?? []).map((c) => ({ value: c.id, label: `${c.name}${c.status === 'INACTIVE' ? ' (ngừng hoạt động)' : ''}` }))}
        onChange={(v, o) => {
          setCategoryId(v)
          if (o && !unitTouched) setUnit((categories.data ?? []).find((c) => c.id === v)?.unit ?? '')
        }}
        error={errors.categoryId}
      />
      <TextField label="Tên *" value={name} onChangeText={setName} error={errors.name} />
      <TextField label="Biển số" value={plateNumber} onChangeText={(t) => setPlateNumber(t.toUpperCase())} autoCapitalize="characters" />
      <TextField
        label="Đơn vị"
        value={unit}
        onChangeText={(t) => {
          setUnit(t)
          setUnitTouched(true)
        }}
      />
      <DateInput label="Ngày vào *" value={entryDate} onChange={setEntryDate} error={errors.entryDate} />
      <DateInput label="Ngày ra" value={exitDate} onChange={setExitDate} error={errors.exitDate} />
      {willBeInactive(exitDate) && (
        <Text style={{ color: colors.warning, fontSize: 13 }}>
          Ngày ra không sau hôm nay nên hạng mục sẽ được chuyển sang Ngừng hoạt động khi lưu.
        </Text>
      )}
      <TextField label="Mô tả" value={description} onChangeText={setDescription} multiline />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.primary }} />
        <Text style={{ color: colors.text }}>{active ? ASSET_STATUS.ACTIVE.label : ASSET_STATUS.INACTIVE.label}</Text>
      </View>
      <Button title={item ? 'Lưu thay đổi' : 'Thêm hạng mục'} onPress={() => void submit()} loading={saving} />
    </View>
  )
}

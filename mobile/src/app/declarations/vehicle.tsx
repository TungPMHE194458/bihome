import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { ChipSelect } from '@/components/form'
import { Screen } from '@/components/Screen'
import { Button, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { useApartment } from '@/lib/auth'
import { notify } from '@/lib/dialogs'
import { api } from '@/lib/resident'
import { colors } from '@/theme'

/** Kê khai xe của căn: BQL duyệt rồi thêm vào Hạng mục căn hộ (biển số duy nhất trong tòa). */
export default function DeclareVehicleScreen() {
  const apt = useApartment()
  const qc = useQueryClient()
  const categories = useQuery({ queryKey: ['apt', apt.id, 'vehicle-categories'], queryFn: () => api.vehicleCategories(apt.id) })
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [plate, setPlate] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  if (categories.isLoading) return <Loading />
  if (categories.error) return <ErrorView message={errorMessage(categories.error)} onRetry={() => void categories.refetch()} />

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!categoryId) e.categoryId = 'Vui lòng chọn loại xe'
    if (!name.trim()) e.vehicleName = 'Tên xe không được để trống'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const d = await api.declareVehicle({
        apartmentId: apt.id,
        categoryId: categoryId!,
        vehicleName: name.trim(),
        plateNumber: plate.trim() || undefined,
        vehicleDescription: description.trim() || undefined,
        note: note.trim() || undefined,
      })
      await qc.invalidateQueries({ queryKey: ['apt', apt.id] })
      router.replace(`/declarations/${d.id}`)
    } catch (err) {
      const fe = fieldErrors(err)
      setErrors(fe)
      if (!Object.keys(fe).length) notify('Không gửi được', errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <Text style={styles.intro}>Đăng ký xe của căn {apt.code} để Ban quản lý cấp thẻ gửi xe và tính phí gửi xe.</Text>
      <ChipSelect
        label="Loại xe"
        options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
        value={categoryId}
        onChange={setCategoryId}
        required
        error={errors.categoryId}
      />
      <TextField label="Tên xe *" placeholder="VD: Honda Vision trắng" value={name} onChangeText={setName} error={errors.vehicleName} maxLength={150} />
      <TextField label="Biển số" placeholder="VD: 29B1-123.45" autoCapitalize="characters" value={plate} onChangeText={setPlate}
        error={errors.plateNumber} maxLength={30} />
      <TextField label="Mô tả (màu, đặc điểm)" multiline value={description} onChangeText={setDescription} maxLength={1000} />
      <TextField label="Ghi chú cho Ban quản lý" value={note} onChangeText={setNote} maxLength={1000} />
      <Button title="Gửi kê khai" icon="send" onPress={() => void submit()} loading={saving} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, fontSize: 14 },
})

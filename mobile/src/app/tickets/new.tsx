import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { PhotoPicker, type UploadedPhoto } from '@/components/PhotoPicker'
import { Screen } from '@/components/Screen'
import { Button, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { useApartment } from '@/lib/auth'
import { api } from '@/lib/resident'
import { colors } from '@/theme'

export default function NewTicketScreen() {
  const apt = useApartment()
  const qc = useQueryClient()
  const categories = useQuery({ queryKey: ['ticket-categories'], queryFn: api.ticketCategories, staleTime: 5 * 60_000 })
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!categoryId) e.categoryId = 'Vui lòng chọn danh mục'
    if (!title.trim()) e.title = 'Tiêu đề không được để trống'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const created = await api.createTicket({
        apartmentId: apt.id,
        categoryId: categoryId!,
        title: title.trim(),
        description: description.trim() || undefined,
        fileIds: photos.map((p) => p.fileId),
      })
      await qc.invalidateQueries({ queryKey: ['apt', apt.id] })
      router.replace(`/tickets/${created.ticket.id}`)
    } catch (err) {
      setErrors(fieldErrors(err))
      setMessage(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (categories.isLoading) return <Loading />
  if (categories.error) return <ErrorView message={errorMessage(categories.error)} onRetry={() => void categories.refetch()} />

  return (
    <Screen>
      <Text style={styles.label}>Căn hộ</Text>
      <Text style={styles.value}>
        {apt.code} · {apt.buildingName}
      </Text>
      <Text style={styles.label}>Danh mục</Text>
      <View style={styles.chips}>
        {categories.data?.map((c) => (
          <Pressable key={c.id} onPress={() => setCategoryId(c.id)} style={[styles.chip, categoryId === c.id && styles.chipActive]}>
            <Text style={[styles.chipText, categoryId === c.id && { color: '#FFFFFF' }]}>{c.name}</Text>
          </Pressable>
        ))}
      </View>
      {errors.categoryId ? <Text style={styles.error}>{errors.categoryId}</Text> : null}
      <TextField label="Tiêu đề" placeholder="VD: Bóng đèn hành lang tầng 3 bị hỏng" value={title} onChangeText={setTitle} error={errors.title} maxLength={200} />
      <TextField
        label="Mô tả"
        placeholder="Mô tả vị trí, thời điểm, mức độ…"
        multiline
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        maxLength={4000}
      />
      <Text style={styles.label}>Ảnh đính kèm (tối đa 5)</Text>
      <PhotoPicker value={photos} onChange={setPhotos} />
      {message && <Text style={styles.error}>{message}</Text>}
      <Button title="Gửi yêu cầu" icon="send" onPress={() => void submit()} loading={saving} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  value: { fontSize: 15, color: colors.textMuted, marginTop: -6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '500' },
  error: { color: colors.danger, fontSize: 13 },
})

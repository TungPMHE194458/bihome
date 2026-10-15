import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AmenityForm } from '@/components/forms/AmenityForm'
import { Screen } from '@/components/Screen'
import { AuthImage, Button, Card, Chip, ErrorView, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { AMENITY_STATUS, APPROVAL_LABEL } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { amenityApi } from '@/lib/staff'
import { colors } from '@/theme'

export default function AmenityDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const amenity = useQuery({ queryKey: ['amenity', id], queryFn: () => amenityApi.get(id) })

  if (amenity.isLoading) return <Loading />
  if (amenity.error || !amenity.data) return <ErrorView message={errorMessage(amenity.error)} onRetry={() => void amenity.refetch()} />
  const a = amenity.data

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Sửa ${a.name}` }} />
        <AmenityForm
          amenity={a}
          onSaved={() => {
            setEditing(false)
            void amenity.refetch()
            notify('Đã lưu thay đổi')
          }}
        />
      </Screen>
    )
  }

  const toggleStatus = () => {
    const next = a.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    confirm(
      next === 'INACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại',
      `Chuyển "${a.name}" sang ${next === 'INACTIVE' ? 'ngừng hoạt động' : 'hoạt động'}?`,
      next === 'INACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt',
      () => void amenityApi.status(id, next).then(() => amenity.refetch()),
      next === 'INACTIVE',
    )
  }

  const remove = () => {
    confirm('Xoá tiện ích', `Xoá "${a.name}"? Chỉ xoá được khi chưa có đăng ký liên quan.`, 'Xoá', () =>
      void amenityApi.remove(id).then(() => {
        void qc.invalidateQueries({ queryKey: ['amenities'] })
        router.back()
      }).catch((e) => notify('Không xoá được', errorMessage(e))), true,
    )
  }

  return (
    <Screen onRefresh={() => amenity.refetch()}>
      <Stack.Screen options={{ title: a.name }} />
      {a.coverImageUrl && <AuthImage url={a.coverImageUrl} style={styles.cover} icon="pool" />}
      <Card style={{ gap: 2 }}>
        <View style={styles.top}>
          <Text style={styles.title}>{a.code} · {a.name}</Text>
          <Chip {...AMENITY_STATUS[a.status]} />
        </View>
        {a.location && <Row label="Vị trí" value={a.location} />}
        <Row label="Sức chứa" value={`${a.capacity} người`} />
        <Row label="Giờ mở cửa" value={`${a.openTime} – ${a.closeTime}`} />
        <Row label="Duyệt đăng ký" value={APPROVAL_LABEL[a.requiresApproval ? 'true' : 'false']} />
        <Row label="Khung giờ" value={a.slotCount === 0 ? 'Chưa cấu hình' : `${a.slotCount} khung`} />
        {a.rules && <Row label="Nội quy" value={a.rules} />}
      </Card>

      <Button title="Cấu hình khung giờ & giá" icon="calendar-clock" onPress={() => router.push(`/amenity-configs/${id}`)} />
      {can('AMENITY_WRITE') && (
        <View style={{ gap: 10 }}>
          <Button title="Chỉnh sửa" icon="pencil-outline" variant="outline" onPress={() => setEditing(true)} />
          <Button title={a.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại'} variant="outline" onPress={toggleStatus} />
        </View>
      )}
      {can('AMENITY_DELETE') && <Button title="Xoá tiện ích" variant="ghost" onPress={remove} />}
    </Screen>
  )
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 180, borderRadius: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, flexShrink: 1 },
})

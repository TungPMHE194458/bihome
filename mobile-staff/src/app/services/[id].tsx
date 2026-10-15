import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ServiceForm } from '@/components/forms/ServiceForm'
import { Screen } from '@/components/Screen'
import { AuthImage, Button, Card, Chip, ErrorView, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { SERVICE_STATUS } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { money } from '@/lib/format'
import { serviceApi } from '@/lib/staff'
import { colors } from '@/theme'

export default function ServiceDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const service = useQuery({ queryKey: ['service', id], queryFn: () => serviceApi.get(id) })

  if (service.isLoading) return <Loading />
  if (service.error || !service.data) return <ErrorView message={errorMessage(service.error)} onRetry={() => void service.refetch()} />
  const s = service.data

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Sửa ${s.name}` }} />
        <ServiceForm
          service={s}
          onSaved={() => {
            setEditing(false)
            void service.refetch()
            notify('Đã lưu thay đổi')
          }}
        />
      </Screen>
    )
  }

  const toggleStatus = () => {
    const next = s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    void serviceApi.status(id, next).then(() => service.refetch())
  }

  const remove = () => {
    confirm('Xoá dịch vụ', `Xoá "${s.name}"? Chỉ xoá được khi chưa có đơn liên quan.`, 'Xoá', () =>
      void serviceApi.remove(id).then(() => {
        void qc.invalidateQueries({ queryKey: ['services'] })
        router.back()
      }).catch((e) => notify('Không xoá được', errorMessage(e))), true,
    )
  }

  return (
    <Screen onRefresh={() => service.refetch()}>
      <Stack.Screen options={{ title: s.name }} />
      {s.coverImageUrl && <AuthImage url={s.coverImageUrl} style={styles.cover} icon="room-service-outline" />}
      <Card style={{ gap: 2 }}>
        <View style={styles.top}>
          <Text style={styles.title}>{s.code} · {s.name}</Text>
          <Chip {...SERVICE_STATUS[s.status]} />
        </View>
        <Row label="Loại dịch vụ" value={s.serviceTypeName} />
        <Row label="Đơn giá" value={`${money(s.unitPrice)} / ${s.unit}`} strong />
        {s.description && <Row label="Mô tả" value={s.description} />}
      </Card>
      {can('SERVICE_WRITE') && (
        <View style={{ gap: 10 }}>
          <Button title="Chỉnh sửa" icon="pencil-outline" onPress={() => setEditing(true)} />
          <Button title={s.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại'} variant="outline" onPress={toggleStatus} />
        </View>
      )}
      {can('SERVICE_DELETE') && <Button title="Xoá dịch vụ" variant="ghost" onPress={remove} />}
    </Screen>
  )
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 180, borderRadius: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, flexShrink: 1 },
})

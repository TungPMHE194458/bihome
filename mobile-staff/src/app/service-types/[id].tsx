import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ServiceTypeForm } from '@/components/forms/ServiceTypeForm'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { SERVICE_STATUS } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { serviceApi } from '@/lib/staff'

export default function ServiceTypeDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const type = useQuery({ queryKey: ['service-type', id], queryFn: () => serviceApi.type(id) })

  if (type.isLoading) return <Loading />
  if (type.error || !type.data) return <ErrorView message={errorMessage(type.error)} onRetry={() => void type.refetch()} />
  const t = type.data

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Sửa ${t.name}` }} />
        <ServiceTypeForm
          type={t}
          onSaved={() => {
            setEditing(false)
            void type.refetch()
            notify('Đã lưu thay đổi')
          }}
        />
      </Screen>
    )
  }

  const toggleStatus = () => {
    const next = t.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    void serviceApi.typeStatus(id, next).then(() => type.refetch())
  }

  const remove = () => {
    confirm('Xoá loại dịch vụ', `Xoá "${t.name}"? Loại đang có dịch vụ thì chỉ chuyển được sang Ngừng hoạt động.`, 'Xoá', () =>
      void serviceApi.removeType(id).then(() => {
        void qc.invalidateQueries({ queryKey: ['service-types'] })
        router.back()
      }).catch((e) => notify('Không xoá được', errorMessage(e))), true,
    )
  }

  return (
    <Screen onRefresh={() => type.refetch()}>
      <Stack.Screen options={{ title: t.name }} />
      <Card style={{ gap: 2 }}>
        <Row label="Tên" value={t.name} strong />
        <Row label="Trạng thái" value={<Chip {...SERVICE_STATUS[t.status]} />} />
        <Row label="Số dịch vụ" value={t.serviceCount} />
        {t.description ? <Row label="Mô tả" value={t.description} /> : null}
      </Card>
      {can('SERVICE_WRITE') && (
        <>
          <Button title="Chỉnh sửa" icon="pencil-outline" onPress={() => setEditing(true)} />
          <Button title={t.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại'} variant="outline" onPress={toggleStatus} />
        </>
      )}
      {can('SERVICE_DELETE') && <Button title="Xoá loại dịch vụ" variant="ghost" onPress={remove} />}
    </Screen>
  )
}

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { TicketCategoryForm } from '@/components/forms/TicketCategoryForm'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { TICKET_CATEGORY_STATUS, formatHours } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { ticketApi } from '@/lib/staff'

export default function TicketCategoryDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const category = useQuery({ queryKey: ['ticket-category', id], queryFn: () => ticketApi.category(id) })

  if (category.isLoading) return <Loading />
  if (category.error || !category.data) return <ErrorView message={errorMessage(category.error)} onRetry={() => void category.refetch()} />
  const c = category.data

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Sửa ${c.name}` }} />
        <TicketCategoryForm
          category={c}
          onSaved={() => {
            setEditing(false)
            void category.refetch()
            notify('Đã lưu thay đổi')
          }}
        />
      </Screen>
    )
  }

  const toggleStatus = () => {
    const next = c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    void ticketApi.categoryStatus(id, next).then(() => category.refetch())
  }

  const remove = () => {
    confirm('Xoá danh mục', `Xoá "${c.name}"? Danh mục đang có yêu cầu thì không xoá được.`, 'Xoá', () =>
      void ticketApi.removeCategory(id).then(() => {
        void qc.invalidateQueries({ queryKey: ['ticket-categories'] })
        router.back()
      }).catch((e) => notify('Không xoá được', errorMessage(e))), true,
    )
  }

  return (
    <Screen onRefresh={() => category.refetch()}>
      <Stack.Screen options={{ title: c.name }} />
      <Card style={{ gap: 2 }}>
        <Row label="Tên" value={c.name} strong />
        <Row label="Trạng thái" value={<Chip {...TICKET_CATEGORY_STATUS[c.status]} />} />
        <Row label="SLA phản hồi" value={formatHours(c.responseSlaHours)} />
        <Row label="SLA xử lý" value={formatHours(c.resolutionSlaHours)} />
        {c.defaultAssigneeName ? <Row label="Người phụ trách mặc định" value={c.defaultAssigneeName} /> : null}
        <Row label="Số yêu cầu" value={c.ticketCount} />
        {c.description ? <Row label="Mô tả" value={c.description} /> : null}
      </Card>
      {can('TICKET_WRITE') && (
        <>
          <Button title="Chỉnh sửa" icon="pencil-outline" onPress={() => setEditing(true)} />
          <Button title={c.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại'} variant="outline" onPress={toggleStatus} />
        </>
      )}
      {can('TICKET_DELETE') && <Button title="Xoá danh mục" variant="ghost" onPress={remove} />}
    </Screen>
  )
}

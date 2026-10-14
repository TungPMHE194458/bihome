import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { AssetItemForm } from '@/components/forms/AssetItemForm'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { ASSET_STATUS } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { formatDate } from '@/lib/format'
import { assetApi } from '@/lib/staff'

export default function AssetItemScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const item = useQuery({ queryKey: ['asset-item', id], queryFn: () => assetApi.item(id) })

  if (item.isLoading) return <Loading />
  if (item.error || !item.data) return <ErrorView message={errorMessage(item.error)} onRetry={() => void item.refetch()} />
  const i = item.data

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Sửa ${i.name}` }} />
        <AssetItemForm
          item={i}
          onSaved={() => {
            setEditing(false)
            void item.refetch()
            notify('Đã lưu thay đổi')
          }}
        />
      </Screen>
    )
  }

  const toggleStatus = () => {
    const next = i.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    void assetApi.itemStatus(id, next).then(() => item.refetch())
  }

  const remove = () => {
    confirm(
      'Xoá hạng mục',
      `Xoá "${i.name}"? Nếu xe đã rời đi, nên nhập Ngày ra thay vì xoá để giữ lịch sử.`,
      'Xoá',
      () =>
        void assetApi
          .removeItem(id)
          .then(() => {
            void qc.invalidateQueries({ queryKey: ['asset-items'] })
            router.back()
          })
          .catch((e) => notify('Không xoá được', errorMessage(e))),
      true,
    )
  }

  return (
    <Screen onRefresh={() => item.refetch()}>
      <Stack.Screen options={{ title: i.name }} />
      <Card style={{ gap: 2 }}>
        <Row label="Tên" value={i.name} strong />
        <Row label="Danh mục" value={i.categoryName} />
        <Row label="Căn hộ" value={`${i.apartmentCode} · ${i.apartmentName}`} />
        {i.plateNumber && <Row label="Biển số" value={i.plateNumber} />}
        {i.accessCardNo && <Row label="Thẻ từ" value={i.accessCardNo} />}
        <Row label="Ngày vào" value={formatDate(i.entryDate)} />
        {i.exitDate && <Row label="Ngày ra" value={formatDate(i.exitDate)} />}
        <Row label="Trạng thái" value={<Chip {...ASSET_STATUS[i.status]} />} />
        {i.description ? <Row label="Mô tả" value={i.description} /> : null}
      </Card>
      {can('ASSET_WRITE') && (
        <>
          <Button title="Chỉnh sửa" icon="pencil-outline" onPress={() => setEditing(true)} />
          <Button title={i.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại'} variant="outline" onPress={toggleStatus} />
        </>
      )}
      {can('ASSET_DELETE') && <Button title="Xoá hạng mục" variant="ghost" onPress={remove} />}
    </Screen>
  )
}

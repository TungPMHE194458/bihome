import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { AssetCategoryForm } from '@/components/forms/AssetCategoryForm'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { ASSET_STATUS } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { assetApi } from '@/lib/staff'

export default function AssetCategoryScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const category = useQuery({ queryKey: ['asset-category', id], queryFn: () => assetApi.category(id) })

  if (category.isLoading) return <Loading />
  if (category.error || !category.data) return <ErrorView message={errorMessage(category.error)} onRetry={() => void category.refetch()} />
  const c = category.data

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Sửa ${c.name}` }} />
        <AssetCategoryForm
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
    void assetApi.categoryStatus(id, next).then(() => category.refetch())
  }

  const remove = () => {
    confirm(
      'Xoá danh mục',
      `Xoá danh mục "${c.name}"? Danh mục đang có hạng mục thì không xoá được, hãy chuyển sang Ngừng hoạt động.`,
      'Xoá',
      () =>
        void assetApi
          .removeCategory(id)
          .then(() => {
            void qc.invalidateQueries({ queryKey: ['asset-categories'] })
            router.back()
          })
          .catch((e) => notify('Không xoá được', errorMessage(e))),
      true,
    )
  }

  return (
    <Screen onRefresh={() => category.refetch()}>
      <Stack.Screen options={{ title: c.name }} />
      <Card style={{ gap: 2 }}>
        <Row label="Tên danh mục" value={c.name} strong />
        <Row label="Đơn vị" value={c.unit} />
        <Row label="Trạng thái" value={<Chip {...ASSET_STATUS[c.status]} />} />
        {c.description ? <Row label="Mô tả" value={c.description} /> : null}
      </Card>
      {can('ASSET_WRITE') && (
        <>
          <Button title="Chỉnh sửa" icon="pencil-outline" onPress={() => setEditing(true)} />
          <Button
            title={c.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
            variant="outline"
            onPress={toggleStatus}
          />
        </>
      )}
      {can('ASSET_DELETE') && <Button title="Xoá danh mục" variant="ghost" onPress={remove} />}
    </Screen>
  )
}

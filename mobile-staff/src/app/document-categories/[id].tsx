import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { DocumentCategoryForm } from '@/components/forms/DocumentCategoryForm'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { DOCUMENT_CATEGORY_STATUS } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { documentApi } from '@/lib/staff'
import { colors } from '@/theme'

export default function DocumentCategoryDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const category = useQuery({ queryKey: ['document-category', id], queryFn: () => documentApi.category(id) })

  if (category.isLoading) return <Loading />
  if (category.error || !category.data) return <ErrorView message={errorMessage(category.error)} onRetry={() => void category.refetch()} />
  const c = category.data

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Sửa ${c.name}` }} />
        <DocumentCategoryForm
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
    void documentApi.categoryStatus(id, next).then(() => category.refetch())
  }

  const remove = () => {
    confirm('Xoá danh mục', `Xoá "${c.name}"? Danh mục đang có tài liệu thì không xoá được.`, 'Xoá', () =>
      void documentApi.removeCategory(id).then(() => {
        void qc.invalidateQueries({ queryKey: ['document-categories'] })
        router.back()
      }).catch((e) => notify('Không xoá được', errorMessage(e))), true,
    )
  }

  return (
    <Screen onRefresh={() => category.refetch()}>
      <Stack.Screen options={{ title: c.name }} />
      <Card style={{ gap: 2 }}>
        <Row
          label="Tên"
          value={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.color }} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{c.name}</Text>
            </View>
          }
        />
        <Row label="Trạng thái" value={<Chip {...DOCUMENT_CATEGORY_STATUS[c.status]} />} />
        <Row label="Số tài liệu" value={c.documentCount} />
        {c.description ? <Row label="Mô tả" value={c.description} /> : null}
      </Card>
      {can('DOCUMENT_WRITE') && (
        <>
          <Button title="Chỉnh sửa" icon="pencil-outline" onPress={() => setEditing(true)} />
          <Button title={c.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại'} variant="outline" onPress={toggleStatus} />
        </>
      )}
      {can('DOCUMENT_DELETE') && <Button title="Xoá danh mục" variant="ghost" onPress={remove} />}
    </Screen>
  )
}

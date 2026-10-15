import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { DocumentForm } from '@/components/forms/DocumentForm'
import { ReplaceFileModal } from '@/components/ReplaceFileModal'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { DOCUMENT_AUDIENCE } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { openFile } from '@/lib/file'
import { formatDateTime, formatFileSize } from '@/lib/format'
import { documentApi } from '@/lib/staff'

export default function DocumentDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [opening, setOpening] = useState(false)
  const doc = useQuery({ queryKey: ['document', id], queryFn: () => documentApi.get(id) })

  if (doc.isLoading) return <Loading />
  if (doc.error || !doc.data) return <ErrorView message={errorMessage(doc.error)} onRetry={() => void doc.refetch()} />
  const d = doc.data

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Sửa ${d.name}` }} />
        <DocumentForm
          doc={d}
          onSaved={() => {
            setEditing(false)
            void doc.refetch()
            notify('Đã lưu thay đổi')
          }}
        />
      </Screen>
    )
  }

  const open = async () => {
    setOpening(true)
    try {
      await openFile(`/documents/${id}/content`, d.fileName, d.contentType)
    } catch (e) {
      notify('Không mở được tệp', errorMessage(e))
    } finally {
      setOpening(false)
    }
  }

  const remove = () => {
    confirm('Xoá tài liệu', `Xoá "${d.name}"? Thao tác này xoá cả tệp đính kèm.`, 'Xoá', () =>
      void documentApi.remove(id).then(() => {
        void qc.invalidateQueries({ queryKey: ['documents'] })
        router.back()
      }).catch((e) => notify('Không xoá được', errorMessage(e))), true,
    )
  }

  return (
    <Screen onRefresh={() => doc.refetch()}>
      <Stack.Screen options={{ title: d.name }} />
      <Card style={{ gap: 2 }}>
        <Row label="Mã" value={d.code} strong />
        <Row label="Danh mục" value={d.categoryName} />
        <Row label="Đối tượng" value={DOCUMENT_AUDIENCE[d.audience]} />
        <Row label="Tệp" value={`${d.fileName} (${formatFileSize(d.fileSize)}) · v${d.fileVersionNo}`} />
        {d.tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {d.tags.map((t) => (
              <Chip key={t} label={t} tone="neutral" />
            ))}
          </View>
        )}
        {d.description ? <Row label="Mô tả" value={d.description} /> : null}
        <Row label="Cập nhật" value={`${formatDateTime(d.updatedAt)}${d.updatedBy ? ` · ${d.updatedBy}` : ''}`} />
      </Card>

      <Button title="Mở / tải tệp" icon="download-outline" onPress={() => void open()} loading={opening} />
      {can('DOCUMENT_WRITE') && (
        <>
          <Button title="Chỉnh sửa" icon="pencil-outline" onPress={() => setEditing(true)} />
          <Button title="Thay file" icon="file-replace-outline" variant="outline" onPress={() => setReplacing(true)} />
        </>
      )}
      {can('DOCUMENT_DELETE') && <Button title="Xoá tài liệu" variant="ghost" onPress={remove} />}

      <ReplaceFileModal
        visible={replacing}
        doc={d}
        onClose={() => setReplacing(false)}
        onSaved={() => {
          setReplacing(false)
          void doc.refetch()
          notify('Đã thay tệp')
        }}
      />
    </Screen>
  )
}

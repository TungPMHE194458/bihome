import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { Card, EmptyState, ErrorView, Icon, Loading, type IconName } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useApartment } from '@/lib/auth'
import { notify } from '@/lib/dialogs'
import { formatDate } from '@/lib/format'
import { openFile } from '@/lib/pdf'
import { api } from '@/lib/resident'
import type { DocumentItem } from '@/lib/types'
import { colors } from '@/theme'

function iconOf(d: DocumentItem): IconName {
  if (d.contentType.includes('pdf')) return 'file-pdf-box'
  if (d.contentType.startsWith('image/')) return 'file-image-outline'
  if (d.contentType.includes('sheet') || d.contentType.includes('excel')) return 'file-excel-outline'
  if (d.contentType.includes('word')) return 'file-word-outline'
  return 'file-document-outline'
}

function size(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Tài liệu BQL công bố cho cư dân (nội quy, biểu mẫu, thông báo...). Bấm để mở / chia sẻ tệp. */
export default function DocumentsScreen() {
  const apt = useApartment()
  const docs = useQuery({ queryKey: ['apt', apt.id, 'documents'], queryFn: () => api.documents(apt.id) })
  const [opening, setOpening] = useState<number | null>(null)
  const items = docs.data?.content ?? []

  const open = async (d: DocumentItem) => {
    setOpening(d.id)
    try {
      await openFile(`/documents/${d.id}/content?apartmentId=${apt.id}`, d.fileName, d.contentType)
    } catch (e) {
      notify('Không mở được tài liệu', errorMessage(e))
    } finally {
      setOpening(null)
    }
  }

  return (
    <Screen onRefresh={() => docs.refetch()}>
      {docs.isLoading ? (
        <Loading />
      ) : docs.error ? (
        <ErrorView message={errorMessage(docs.error)} onRetry={() => void docs.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="folder-open-outline" message="Ban quản lý chưa công bố tài liệu nào" />
      ) : (
        items.map((d) => (
          <Card key={d.id} onPress={() => void open(d)} style={styles.row}>
            <View style={styles.iconBox}>
              {opening === d.id ? <ActivityIndicator color={colors.primary} /> : <Icon name={iconOf(d)} size={26} color={colors.primary} />}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.name} numberOfLines={2}>
                {d.name}
              </Text>
              <Text style={styles.muted}>
                {d.categoryName} · {size(d.fileSize)} · {formatDate(d.updatedAt)}
              </Text>
              {d.description ? (
                <Text style={styles.muted} numberOfLines={2}>
                  {d.description}
                </Text>
              ) : null}
            </View>
          </Card>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
})

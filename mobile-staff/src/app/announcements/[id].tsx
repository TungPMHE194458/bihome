import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AnnouncementForm } from '@/components/forms/AnnouncementForm'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Icon, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { ANNOUNCEMENT_AUDIENCE, ANNOUNCEMENT_CATEGORY, ANNOUNCEMENT_STATUS } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { formatDateTime } from '@/lib/format'
import { announcementApi } from '@/lib/staff'
import { colors } from '@/theme'

export default function AnnouncementDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const [sending, setSending] = useState(false)
  const announcement = useQuery({ queryKey: ['announcement', id], queryFn: () => announcementApi.get(id) })

  if (announcement.isLoading) return <Loading />
  if (announcement.error || !announcement.data) return <ErrorView message={errorMessage(announcement.error)} onRetry={() => void announcement.refetch()} />
  const a = announcement.data
  const editable = a.status !== 'SENT'

  const refresh = async () => {
    void qc.invalidateQueries({ queryKey: ['announcements'] })
    await announcement.refetch()
  }

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Sửa thông báo' }} />
        <AnnouncementForm
          announcement={a}
          onSaved={(_, mode) => {
            setEditing(false)
            void refresh()
            notify(mode === 'NOW' ? 'Đã gửi thông báo' : mode === 'SCHEDULED' ? 'Đã hẹn giờ gửi' : 'Đã lưu nháp')
          }}
        />
      </Screen>
    )
  }

  const sendNow = async () => {
    setSending(true)
    try {
      await announcementApi.send(id, a.version)
      await refresh()
      notify('Đã gửi thông báo')
    } catch (e) {
      notify('Không gửi được', errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  const remove = () => {
    confirm('Xoá thông báo', `Xoá "${a.title}"?`, 'Xoá', () =>
      void announcementApi.remove(id).then(() => {
        void qc.invalidateQueries({ queryKey: ['announcements'] })
        router.back()
      }).catch((e) => notify('Không xoá được', errorMessage(e))), true,
    )
  }

  return (
    <Screen onRefresh={() => announcement.refetch()}>
      <Stack.Screen options={{ title: a.title }} />
      <Card style={{ gap: 2 }}>
        <View style={styles.top}>
          <Text style={styles.title}>{a.title}</Text>
          <Chip {...ANNOUNCEMENT_STATUS[a.status]} />
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
          <Chip {...ANNOUNCEMENT_CATEGORY[a.category]} />
        </View>
        <Row label="Gửi tới" value={ANNOUNCEMENT_AUDIENCE[a.audience]} />
        {a.scheduledAt ? <Row label="Hẹn giờ gửi" value={formatDateTime(a.scheduledAt)} /> : null}
        {a.sentAt ? <Row label="Đã gửi" value={`${formatDateTime(a.sentAt)}${a.sentBy ? ` · ${a.sentBy}` : ''}`} /> : null}
        {a.status === 'SENT' && (
          <Row label="Đã nhận" value={`${a.staffCount} nhân viên · ${a.residentCount} cư dân`} />
        )}
        <Text style={styles.content}>{a.content}</Text>
      </Card>

      {a.attachments.length > 0 && (
        <Card style={{ gap: 8 }}>
          <Text style={styles.section}>Tệp đính kèm</Text>
          {a.attachments.map((f) => (
            <View key={f.fileId} style={styles.attachment}>
              <Icon name="paperclip" size={16} color={colors.primaryDark} />
              <Text style={styles.attachmentName} numberOfLines={1}>{f.name}</Text>
            </View>
          ))}
        </Card>
      )}

      {can('NOTIFICATION_WRITE') && editable && (
        <View style={{ gap: 10 }}>
          <Button title="Chỉnh sửa" icon="pencil-outline" onPress={() => setEditing(true)} />
          <Button title="Gửi ngay" icon="send-outline" onPress={() => void sendNow()} loading={sending} />
        </View>
      )}
      {can('NOTIFICATION_DELETE') && editable && <Button title="Xoá thông báo" variant="ghost" onPress={remove} />}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, flexShrink: 1 },
  content: { fontSize: 14, color: colors.text, marginTop: 8, lineHeight: 20 },
  section: { fontSize: 14, fontWeight: '700', color: colors.text },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attachmentName: { fontSize: 13, color: colors.text, flexShrink: 1 },
})

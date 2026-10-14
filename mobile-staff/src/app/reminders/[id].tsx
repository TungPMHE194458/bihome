import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ReminderForm } from '@/components/forms/ReminderForm'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Loading, Row, SectionTitle } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { AUDIENCE, DELIVERY_STATUS, REMINDER_CHANNEL, REMINDER_STATUS, scheduleText } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { formatDateTime } from '@/lib/format'
import { reminderApi } from '@/lib/staff'
import { colors } from '@/theme'

export default function ReminderDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const [showDeliveries, setShowDeliveries] = useState(false)
  const reminder = useQuery({ queryKey: ['reminder', id], queryFn: () => reminderApi.get(id) })
  const deliveries = useQuery({ queryKey: ['reminder', id, 'deliveries'], queryFn: () => reminderApi.deliveries(id), enabled: showDeliveries })

  if (reminder.isLoading) return <Loading />
  if (reminder.error || !reminder.data) return <ErrorView message={errorMessage(reminder.error)} onRetry={() => void reminder.refetch()} />
  const r = reminder.data
  const editable = r.status === 'DRAFT' || r.status === 'SCHEDULED'

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Sửa ${r.title}` }} />
        <ReminderForm
          reminder={r}
          onSaved={() => {
            setEditing(false)
            void reminder.refetch()
            notify('Đã lưu thay đổi')
          }}
        />
      </Screen>
    )
  }

  const refresh = async () => {
    void qc.invalidateQueries({ queryKey: ['reminders'] })
    await reminder.refetch()
  }

  const send = () => {
    confirm('Gửi ngay', `Gửi nhắc nhở "${r.title}" ngay bây giờ?`, 'Gửi', () =>
      void reminderApi
        .send(id, r.version)
        .then(() => refresh())
        .catch((e) => notify('Không gửi được', errorMessage(e))),
    )
  }

  const cancel = () => {
    confirm('Huỷ lịch gửi', `Huỷ nhắc nhở "${r.title}"?`, 'Huỷ', () =>
      void reminderApi
        .cancel(id, r.version)
        .then(() => refresh())
        .catch((e) => notify('Không huỷ được', errorMessage(e))),
      true,
    )
  }

  const remove = () => {
    confirm('Xoá nhắc nhở', `Xoá "${r.title}"? Chỉ xoá được nhắc nhở Nháp hoặc Đã huỷ.`, 'Xoá', () =>
      void reminderApi
        .remove(id)
        .then(() => {
          void qc.invalidateQueries({ queryKey: ['reminders'] })
          router.back()
        })
        .catch((e) => notify('Không xoá được', errorMessage(e))),
      true,
    )
  }

  return (
    <Screen onRefresh={() => reminder.refetch()}>
      <Stack.Screen options={{ title: r.title }} />
      <Card style={{ gap: 2 }}>
        <View style={styles.top}>
          <Text style={styles.title}>{r.title}</Text>
          <Chip {...REMINDER_STATUS[r.status]} />
        </View>
        <Row label="Đối tượng" value={`${AUDIENCE[r.audience]}${r.audience !== 'ALL' ? ` · ${r.targetLabel}` : ''}`} />
        <Row label="Kênh gửi" value={r.channels.map((c) => REMINDER_CHANNEL[c]).join(', ')} />
        <Row label="Lịch gửi" value={scheduleText(r)} />
        {r.lastSentAt && <Row label="Gửi gần nhất" value={formatDateTime(r.lastSentAt)} />}
        {r.status === 'SENT' && <Row label="Số người nhận" value={r.recipientCount} />}
        <Text style={styles.body}>{r.content}</Text>
      </Card>

      {can('REMINDER_WRITE') && editable && (
        <View style={{ gap: 10 }}>
          <Button title="Chỉnh sửa" icon="pencil-outline" onPress={() => setEditing(true)} />
          {r.scheduleType === 'NOW' && r.status === 'DRAFT' && <Button title="Gửi ngay" onPress={send} />}
          {r.status === 'SCHEDULED' && <Button title="Huỷ lịch gửi" variant="outline" onPress={cancel} />}
        </View>
      )}
      {can('REMINDER_DELETE') && (r.status === 'DRAFT' || r.status === 'CANCELLED') && <Button title="Xoá nhắc nhở" variant="ghost" onPress={remove} />}

      {r.runCount > 0 && (
        <>
          <SectionTitle title="Lịch sử gửi" action={<Text style={styles.link} onPress={() => setShowDeliveries((s) => !s)}>{showDeliveries ? 'Ẩn' : 'Xem'}</Text>} />
          {showDeliveries &&
            (deliveries.isLoading ? (
              <Loading />
            ) : (
              (deliveries.data?.content ?? []).map((d) => (
                <Card key={d.id} style={{ gap: 2 }}>
                  <View style={styles.top}>
                    <Text style={styles.deliveryName}>{d.residentName}</Text>
                    <Chip {...DELIVERY_STATUS[d.status]} />
                  </View>
                  <Text style={styles.muted}>
                    {d.apartmentCode ? `Căn ${d.apartmentCode} · ` : ''}
                    {REMINDER_CHANNEL[d.channel]}
                    {d.destination ? ` · ${d.destination}` : ''}
                  </Text>
                  {d.note && <Text style={styles.muted}>{d.note}</Text>}
                  <Text style={styles.muted}>{formatDateTime(d.sentAt)}</Text>
                </Card>
              ))
            ))}
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, flexShrink: 1 },
  body: { fontSize: 14, color: colors.text, marginTop: 8, lineHeight: 20 },
  link: { color: colors.primaryDark, fontWeight: '600' },
  muted: { fontSize: 13, color: colors.textMuted },
  deliveryName: { fontSize: 14, fontWeight: '700', color: colors.text },
})

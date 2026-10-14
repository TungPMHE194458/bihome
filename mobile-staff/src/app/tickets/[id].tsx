import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { callPhone, PromptModal } from '@/components/common'
import { Segmented } from '@/components/form'
import { PhotoPicker, type UploadedPhoto } from '@/components/PhotoPicker'
import { Screen } from '@/components/Screen'
import { AuthImage, Button, Card, Chip, ErrorView, Icon, Loading, Row, SectionTitle, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { STATUS_ACTION, TICKET_PRIORITY, TICKET_STATUS } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { formatDateTime } from '@/lib/format'
import { ticketApi } from '@/lib/staff'
import type { Attachment, TicketStatus, TimelineEntry, Visibility } from '@/lib/types'
import { colors, radius } from '@/theme'

export default function TicketScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { me, can } = useAuth()
  const canWrite = can('TICKET_WRITE')
  const ticket = useQuery({ queryKey: ['ticket', id], queryFn: () => ticketApi.get(id) })
  const timeline = useQuery({ queryKey: ['ticket', id, 'timeline'], queryFn: () => ticketApi.timeline(id) })
  const buildingId = ticket.data?.ticket.buildingId
  const assignees = useQuery({
    queryKey: ['assignees', buildingId],
    queryFn: () => ticketApi.assignees(buildingId!),
    enabled: canWrite && buildingId != null,
  })

  const [target, setTarget] = useState<TicketStatus | null>(null)
  const [noteVisible, setNoteVisible] = useState(true)
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [comment, setComment] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('INTERNAL')
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [sending, setSending] = useState(false)

  const refresh = () => Promise.all([ticket.refetch(), timeline.refetch()])
  const changed = async () => {
    await refresh()
    void qc.invalidateQueries({ queryKey: ['tickets'] })
    void qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  if (ticket.isLoading) return <Loading />
  if (ticket.error || !ticket.data) return <ErrorView message={errorMessage(ticket.error)} onRetry={() => void refresh()} />
  const t = ticket.data
  const s = t.ticket
  const isHandler = (assignees.data ?? []).some((a) => a.id === me?.id)

  const changeStatus = async (note: string) => {
    if (!target) return
    try {
      await ticketApi.changeStatus(id, { status: target, note: note || null, visibility: noteVisible ? 'PUBLIC' : 'INTERNAL', version: s.version })
      setTarget(null)
      await changed()
    } catch (e) {
      notify('Không đổi được trạng thái', errorMessage(e))
    }
  }

  const assign = async (assigneeId: number | null) => {
    setBusy(true)
    try {
      await ticketApi.assign(id, assigneeId, s.version)
      setPicking(false)
      await changed()
    } catch (e) {
      notify('Không giao được việc', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const send = async () => {
    if (!comment.trim()) return
    setSending(true)
    try {
      await ticketApi.comment(id, comment.trim(), visibility, photos.map((p) => p.fileId))
      setComment('')
      setPhotos([])
      await timeline.refetch()
    } catch (e) {
      notify('Không gửi được bình luận', errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <Screen onRefresh={refresh}>
      <Card style={{ gap: 8 }}>
        <View style={styles.top}>
          <Text style={styles.code}>{s.code}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Chip {...TICKET_PRIORITY[s.priority]} />
            <Chip {...TICKET_STATUS[s.status]} />
          </View>
        </View>
        <Text style={styles.title}>{s.title}</Text>
        {s.overdue && (
          <View style={styles.overdue}>
            <Icon name="clock-alert-outline" size={16} color={colors.danger} />
            <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 13 }}>Quá hạn xử lý</Text>
          </View>
        )}
        {t.description ? <Text style={styles.body}>{t.description}</Text> : null}
        <Photos items={t.attachments} />
        <View style={styles.divider} />
        <Row label="Danh mục" value={s.categoryName} />
        <Row label="Tòa nhà" value={s.buildingName} />
        {s.apartmentCode && <Row label="Căn hộ" value={s.apartmentCode} />}
        {s.residentName && (
          <Row
            label="Cư dân"
            value={
              <Pressable onPress={() => callPhone(s.residentPhone)} style={styles.call} disabled={!s.residentPhone}>
                <Text style={styles.callText}>
                  {s.residentName}
                  {s.residentPhone ? ` · ${s.residentPhone}` : ''}
                </Text>
                {s.residentPhone && <Icon name="phone" size={16} color={colors.primaryDark} />}
              </Pressable>
            }
          />
        )}
        <Row label="Người xử lý" value={s.assigneeName ?? 'Chưa giao'} />
        <Row label="Tạo lúc" value={formatDateTime(s.createdAt)} />
        <Row label="Hạn phản hồi" value={formatDateTime(s.responseDueAt)} />
        <Row label="Hạn xử lý" value={formatDateTime(s.resolutionDueAt)} />
        {s.rating != null && <Row label="Đánh giá" value={`${s.rating}/5${t.ratingComment ? ` – ${t.ratingComment}` : ''}`} />}
      </Card>

      {canWrite && (t.allowedStatuses.length > 0 || isHandler || assignees.data?.length) ? (
        <Card style={{ gap: 10 }}>
          <Text style={styles.cardTitle}>Xử lý</Text>
          {s.assigneeId !== me?.id && isHandler && (
            <Button title="Nhận việc này" icon="account-check-outline" onPress={() => void assign(me!.id)} loading={busy} />
          )}
          <View style={styles.actions}>
            {t.allowedStatuses.map((st) => (
              <Button
                key={st}
                title={STATUS_ACTION[st]}
                variant={st === 'CANCELLED' ? 'danger' : st === 'DONE' ? 'primary' : 'outline'}
                onPress={() => {
                  setNoteVisible(true)
                  setTarget(st)
                }}
                style={styles.actionButton}
              />
            ))}
          </View>
          {!!assignees.data?.length && (
            <Button title={s.assigneeId ? 'Giao cho người khác' : 'Giao việc'} variant="ghost" icon="account-arrow-right-outline" onPress={() => setPicking(true)} />
          )}
        </Card>
      ) : null}

      <SectionTitle title="Dòng thời gian" />
      <Card style={{ gap: 14 }}>
        {timeline.isLoading ? <Loading /> : (timeline.data ?? []).map((e) => <Entry key={e.id} entry={e} />)}
      </Card>

      {canWrite && s.status !== 'CANCELLED' && s.status !== 'CLOSED' && (
        <Card style={{ gap: 10 }}>
          <Text style={styles.cardTitle}>Bình luận</Text>
          <Segmented
            items={[
              { value: 'INTERNAL', label: 'Nội bộ' },
              { value: 'PUBLIC', label: 'Gửi cư dân' },
            ]}
            value={visibility}
            onChange={setVisibility}
          />
          <TextField
            label={visibility === 'INTERNAL' ? 'Ghi chú nội bộ (cư dân không thấy)' : 'Tin gửi cư dân (hiện trên app cư dân)'}
            multiline
            value={comment}
            onChangeText={setComment}
            maxLength={4000}
          />
          <PhotoPicker value={photos} onChange={setPhotos} />
          <Button title="Gửi" icon="send" onPress={() => void send()} loading={sending} disabled={!comment.trim()} />
        </Card>
      )}

      <PromptModal
        visible={target != null}
        title={target ? `${STATUS_ACTION[target]} – ${s.code}` : ''}
        label={target === 'CANCELLED' ? 'Lý do huỷ *' : 'Ghi chú (không bắt buộc)'}
        confirmLabel={target ? STATUS_ACTION[target] : 'Xác nhận'}
        danger={target === 'CANCELLED'}
        required={target === 'CANCELLED'}
        extra={
          <View style={styles.switchRow}>
            <Text style={{ flex: 1, color: colors.text }}>Cư dân thấy ghi chú này</Text>
            <Switch value={noteVisible} onValueChange={setNoteVisible} trackColor={{ true: colors.primary }} />
          </View>
        }
        onCancel={() => setTarget(null)}
        onConfirm={changeStatus}
      />

      <Modal visible={picking} transparent animationType="slide" onRequestClose={() => setPicking(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPicking(false)}>
          <View style={styles.sheet}>
            <Text style={styles.cardTitle}>Giao việc cho</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {(assignees.data ?? []).map((a) => (
                <Pressable key={a.id} style={styles.person} onPress={() => void assign(a.id)} disabled={busy}>
                  <Icon name={a.id === s.assigneeId ? 'check-circle' : 'account-circle-outline'} size={24} color={a.id === s.assigneeId ? colors.primary : colors.textMuted} />
                  <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>
                    {a.fullName}
                    {a.id === me?.id ? ' (tôi)' : ''}
                  </Text>
                </Pressable>
              ))}
              {s.assigneeId && (
                <Pressable style={styles.person} onPress={() => void assign(null)} disabled={busy}>
                  <Icon name="account-remove-outline" size={24} color={colors.danger} />
                  <Text style={{ flex: 1, fontSize: 15, color: colors.danger }}>Bỏ giao việc</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  )
}

function Entry({ entry }: { entry: TimelineEntry }) {
  const text =
    entry.type === 'CREATED'
      ? 'Tạo yêu cầu'
      : entry.type === 'STATUS_CHANGE' && entry.toStatus
        ? `Chuyển sang "${TICKET_STATUS[entry.toStatus].label}"${entry.content ? `: ${entry.content}` : ''}`
        : entry.type === 'ASSIGNMENT'
          ? entry.assigneeName
            ? `Giao cho ${entry.assigneeName}`
            : 'Bỏ giao việc'
          : entry.type === 'RATING'
            ? `Cư dân đánh giá ${entry.content ?? ''}`
            : (entry.content ?? '')
  const isComment = entry.type === 'COMMENT'
  const internal = entry.visibility === 'INTERNAL'
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={[styles.dot, { backgroundColor: isComment ? (internal ? colors.warning : colors.primary) : colors.border }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.actor}>
          {entry.actorName ?? entry.actorUsername ?? 'Hệ thống'} · {formatDateTime(entry.createdAt)}
          {isComment && internal ? ' · nội bộ' : ''}
        </Text>
        <Text style={isComment ? styles.body : styles.muted}>{text}</Text>
        <Photos items={entry.attachments} />
      </View>
    </View>
  )
}

function Photos({ items }: { items: Attachment[] }) {
  const images = items.filter((a) => a.contentType.startsWith('image/'))
  if (!images.length) return null
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {images.map((a) => (
        <AuthImage key={a.id} url={a.url} style={styles.photo} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  code: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  muted: { fontSize: 13, color: colors.textMuted },
  actor: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  photo: { width: 96, height: 96, borderRadius: 10 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 },
  overdue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  call: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  callText: { color: colors.primaryDark, fontWeight: '600', fontSize: 14, textAlign: 'right', flexShrink: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { flexGrow: 1, flexBasis: '45%' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 18, gap: 10 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
})

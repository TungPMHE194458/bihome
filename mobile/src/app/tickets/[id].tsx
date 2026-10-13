import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { AuthImage, Button, Card, Chip, ErrorView, Icon, Loading, SectionTitle, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { TICKET_STATUS } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { formatDateTime } from '@/lib/format'
import { api } from '@/lib/resident'
import type { Attachment, TimelineEntry } from '@/lib/types'
import { colors } from '@/theme'

export default function TicketScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { me } = useAuth()
  const ticket = useQuery({ queryKey: ['ticket', id], queryFn: () => api.ticket(id) })
  const timeline = useQuery({ queryKey: ['ticket', id, 'timeline'], queryFn: () => api.timeline(id) })
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [stars, setStars] = useState(0)
  const [rating, setRating] = useState(false)

  const refresh = () => Promise.all([ticket.refetch(), timeline.refetch()])

  if (ticket.isLoading) return <Loading />
  if (ticket.error || !ticket.data) return <ErrorView message={errorMessage(ticket.error)} onRetry={() => void refresh()} />
  const t = ticket.data
  const s = t.ticket
  const canRate = (s.status === 'DONE' || s.status === 'CLOSED') && s.rating == null

  const send = async () => {
    if (!comment.trim()) return
    setSending(true)
    try {
      await api.comment(id, comment.trim())
      setComment('')
      await timeline.refetch()
    } catch (e) {
      notify('Không gửi được', errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  const rate = async () => {
    setRating(true)
    try {
      await api.rate(id, stars)
      await refresh()
      void qc.invalidateQueries({ queryKey: ['apt'] })
    } catch (e) {
      notify('Không gửi được đánh giá', errorMessage(e))
    } finally {
      setRating(false)
    }
  }

  return (
    <Screen onRefresh={refresh}>
      <Card style={{ gap: 8 }}>
        <View style={styles.top}>
          <Text style={styles.code}>{s.code}</Text>
          <Chip {...TICKET_STATUS[s.status]} />
        </View>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.muted}>
          {s.categoryName} · gửi {formatDateTime(s.createdAt)}
          {s.assigneeName ? ` · phụ trách: ${s.assigneeName}` : ''}
        </Text>
        {t.description ? <Text style={styles.body}>{t.description}</Text> : null}
        <Photos items={t.attachments} />
        {s.rating != null && (
          <Text style={styles.muted}>
            Bạn đã đánh giá {s.rating}/5 sao{t.ratingComment ? ` — ${t.ratingComment}` : ''}
          </Text>
        )}
      </Card>

      {canRate && (
        <Card style={{ gap: 10, alignItems: 'center' }}>
          <Text style={styles.title}>Bạn hài lòng với kết quả xử lý?</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setStars(n)} accessibilityLabel={`${n} sao`} hitSlop={4}>
                <Icon name={n <= stars ? 'star' : 'star-outline'} size={34} color="#F59E0B" />
              </Pressable>
            ))}
          </View>
          <Button title="Gửi đánh giá" onPress={() => void rate()} disabled={!stars} loading={rating} style={{ alignSelf: 'stretch' }} />
        </Card>
      )}

      <SectionTitle title="Trao đổi" />
      <Card style={{ gap: 14 }}>
        {timeline.isLoading ? (
          <Loading />
        ) : (
          (timeline.data ?? []).map((e) => <Entry key={e.id} entry={e} mine={e.actorUsername?.includes(me?.phone ?? '#') ?? false} />)
        )}
      </Card>

      {!(s.status === 'CANCELLED') && (
        <View style={{ gap: 8 }}>
          <TextField label="Gửi tin cho Ban quản lý" multiline value={comment} onChangeText={setComment} maxLength={4000} placeholder="Nhập nội dung…" />
          <Button title="Gửi" icon="send" onPress={() => void send()} loading={sending} disabled={!comment.trim()} />
        </View>
      )}
    </Screen>
  )
}

function Entry({ entry, mine }: { entry: TimelineEntry; mine: boolean }) {
  const text =
    entry.type === 'CREATED'
      ? 'Đã gửi yêu cầu'
      : entry.type === 'STATUS_CHANGE' && entry.toStatus
        ? `Chuyển sang "${TICKET_STATUS[entry.toStatus].label}"${entry.content ? `: ${entry.content}` : ''}`
        : entry.type === 'RATING'
          ? `Đánh giá ${entry.content ?? ''}`
          : (entry.content ?? '')
  const isComment = entry.type === 'COMMENT'
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={[styles.dot, { backgroundColor: isComment ? colors.primary : colors.border }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.actor}>
          {mine ? 'Bạn' : (entry.actorName ?? 'Ban quản lý')} · {formatDateTime(entry.createdAt)}
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
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  muted: { fontSize: 13, color: colors.textMuted },
  actor: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  photo: { width: 96, height: 96, borderRadius: 10 },
})

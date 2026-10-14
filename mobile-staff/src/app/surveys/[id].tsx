import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Segmented } from '@/components/form'
import { SurveyForm } from '@/components/forms/SurveyForm'
import { Screen } from '@/components/Screen'
import { SurveyResponseModal } from '@/components/SurveyResponseModal'
import { Button, Card, Chip, EmptyState, ErrorView, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { AUDIENCE, QUESTION_TYPE, SURVEY_PHASE, SURVEY_STATUS } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { formatDateTime } from '@/lib/format'
import { surveyApi } from '@/lib/staff'
import { colors, radius } from '@/theme'

type Tab = 'info' | 'results' | 'responses'

export default function SurveyDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState<Tab>('info')
  const [responding, setResponding] = useState(false)
  const survey = useQuery({ queryKey: ['survey', id], queryFn: () => surveyApi.get(id) })
  const results = useQuery({ queryKey: ['survey', id, 'results'], queryFn: () => surveyApi.results(id), enabled: tab === 'results' })
  const responses = useQuery({ queryKey: ['survey', id, 'responses'], queryFn: () => surveyApi.responses(id), enabled: tab === 'responses' })

  if (survey.isLoading) return <Loading />
  if (survey.error || !survey.data) return <ErrorView message={errorMessage(survey.error)} onRetry={() => void survey.refetch()} />
  const s = survey.data

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Sửa ${s.title}` }} />
        <SurveyForm
          survey={s}
          onSaved={() => {
            setEditing(false)
            void survey.refetch()
            notify('Đã lưu thay đổi')
          }}
        />
      </Screen>
    )
  }

  const refresh = async () => {
    void qc.invalidateQueries({ queryKey: ['surveys'] })
    await survey.refetch()
  }

  const publish = () => {
    confirm('Mở khảo sát', `Phát hành "${s.title}" để cư dân trả lời?`, 'Mở khảo sát', () =>
      void surveyApi.publish(id, s.version).then(refresh).catch((e) => notify('Không mở được', errorMessage(e))),
    )
  }
  const close = () => {
    confirm('Đóng khảo sát', `Đóng "${s.title}"? Cư dân sẽ không trả lời được nữa.`, 'Đóng', () =>
      void surveyApi.close(id, s.version).then(refresh).catch((e) => notify('Không đóng được', errorMessage(e))), true,
    )
  }
  const remove = () => {
    confirm('Xoá khảo sát', `Xoá "${s.title}"? Chỉ xoá được khi chưa có phản hồi.`, 'Xoá', () =>
      void surveyApi.remove(id).then(() => {
        void qc.invalidateQueries({ queryKey: ['surveys'] })
        router.back()
      }).catch((e) => notify('Không xoá được', errorMessage(e))), true,
    )
  }

  const tabs = [
    { value: 'info' as Tab, label: 'Thông tin' },
    { value: 'results' as Tab, label: 'Kết quả' },
    { value: 'responses' as Tab, label: 'Phản hồi' },
  ]

  return (
    <Screen onRefresh={() => Promise.all([survey.refetch(), tab === 'results' ? results.refetch() : Promise.resolve(), tab === 'responses' ? responses.refetch() : Promise.resolve()])}>
      <Stack.Screen options={{ title: s.title }} />
      <View style={styles.top}>
        <Text style={styles.title}>{s.title}</Text>
        <Chip {...(s.status === 'OPEN' ? SURVEY_PHASE[s.phase] : SURVEY_STATUS[s.status])} />
      </View>
      <Segmented items={tabs} value={tab} onChange={setTab} />

      {tab === 'info' && (
        <>
          <Card style={{ gap: 2 }}>
            {s.description ? <Text style={styles.body}>{s.description}</Text> : null}
            <Row label="Đối tượng" value={`${AUDIENCE[s.audience]}${s.audience !== 'ALL' ? ` · ${s.targetLabel}` : ''}`} />
            <Row label="Thời gian" value={`${formatDateTime(s.startAt)} – ${formatDateTime(s.endAt)}`} />
            <Row label="Ẩn danh" value={s.anonymous ? 'Có' : 'Không'} />
            <Row label="Số câu hỏi" value={s.questionCount} />
            <Row label="Số phản hồi" value={s.responseCount} />
          </Card>
          {can('SURVEY_WRITE') && s.status !== 'CLOSED' && (
            <View style={{ gap: 10 }}>
              <Button title="Chỉnh sửa" icon="pencil-outline" onPress={() => setEditing(true)} />
              {s.status === 'DRAFT' && <Button title="Mở khảo sát" onPress={publish} />}
              {s.status === 'OPEN' && <Button title="Đóng khảo sát" variant="outline" onPress={close} />}
            </View>
          )}
          {can('SURVEY_WRITE') && s.phase === 'ACTIVE' && <Button title="Nhập phản hồi hộ" variant="outline" icon="account-edit-outline" onPress={() => setResponding(true)} />}
          {can('SURVEY_DELETE') && s.responseCount === 0 && <Button title="Xoá khảo sát" variant="ghost" onPress={remove} />}
          {can('SURVEY_EXPORT') && s.responseCount > 0 && <Button title="Xuất Excel" variant="ghost" icon="file-excel-outline" onPress={() => void surveyApi.export(id, s.title)} />}
        </>
      )}

      {tab === 'results' &&
        (results.isLoading ? (
          <Loading />
        ) : s.responseCount === 0 ? (
          <EmptyState icon="chart-box-outline" message="Chưa có phản hồi nào." />
        ) : (
          (results.data?.questions ?? []).map((q, qi) => (
            <Card key={q.questionId} style={{ gap: 10 }}>
              <Text style={styles.questionTitle}>
                {qi + 1}. {q.content}
              </Text>
              <Text style={styles.muted}>
                {QUESTION_TYPE[q.type]} · {q.answered}/{s.responseCount} người trả lời
              </Text>
              {(q.type === 'SINGLE' || q.type === 'MULTIPLE') &&
                q.options.map((o) => (
                  <View key={o.optionId} style={{ gap: 4 }}>
                    <View style={styles.barRow}>
                      <Text style={styles.barLabel} numberOfLines={1}>{o.label}</Text>
                      <Text style={styles.barValue}>{o.count} ({Math.round(o.percent * 100) / 100}%)</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.min(100, o.percent)}%` }]} />
                    </View>
                  </View>
                ))}
              {q.type === 'RATING' && (
                <>
                  <Text style={styles.rating}>{q.averageRating?.toFixed(1) ?? '—'} ★ trung bình</Text>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = q.ratings?.[star - 1] ?? 0
                    const pct = q.answered ? (count / q.answered) * 100 : 0
                    return (
                      <View key={star} style={{ gap: 4 }}>
                        <View style={styles.barRow}>
                          <Text style={styles.barLabel}>{star} sao</Text>
                          <Text style={styles.barValue}>{count}</Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors.warning }]} />
                        </View>
                      </View>
                    )
                  })}
                </>
              )}
              {q.type === 'TEXT' &&
                (q.texts.length === 0 ? (
                  <Text style={styles.muted}>Chưa có câu trả lời.</Text>
                ) : (
                  q.texts.map((t, ti) => (
                    <Text key={ti} style={styles.body}>
                      • {t}
                    </Text>
                  ))
                ))}
            </Card>
          ))
        ))}

      {tab === 'responses' &&
        (responses.isLoading ? (
          <Loading />
        ) : !responses.data?.content.length ? (
          <EmptyState icon="inbox-outline" message="Chưa có phản hồi nào." />
        ) : (
          responses.data.content.map((r) => (
            <Card key={r.id} style={{ gap: 4 }}>
              <Text style={styles.questionTitle}>{s.anonymous ? 'Ẩn danh' : `${r.apartmentCode ?? '—'} · ${r.residentName ?? '—'}`}</Text>
              <Text style={styles.muted}>{formatDateTime(r.submittedAt)}</Text>
              {r.answers.map((a, ai) => (
                <Text key={ai} style={styles.body}>
                  {ai + 1}. {a}
                </Text>
              ))}
            </Card>
          ))
        ))}

      {responding && (
        <SurveyResponseModal
          visible
          survey={s}
          onClose={() => setResponding(false)}
          onSaved={() => {
            setResponding(false)
            void refresh()
            notify('Đã ghi nhận phản hồi')
          }}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, flexShrink: 1 },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  muted: { fontSize: 13, color: colors.textMuted },
  questionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  barLabel: { fontSize: 13, color: colors.text, flexShrink: 1 },
  barValue: { fontSize: 13, color: colors.textMuted },
  barTrack: { height: 8, borderRadius: radius.sm, backgroundColor: colors.neutralLight, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.primary, borderRadius: radius.sm },
  rating: { fontSize: 18, fontWeight: '800', color: colors.warning },
})

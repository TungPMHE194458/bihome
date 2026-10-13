import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { Button, Card, ErrorView, Icon, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useApartment } from '@/lib/auth'
import { notify } from '@/lib/dialogs'
import { formatDateTime } from '@/lib/format'
import { api } from '@/lib/resident'
import type { SurveyAnswer, SurveyQuestion } from '@/lib/types'
import { colors } from '@/theme'

type Draft = Record<number, { optionIds?: number[]; text?: string; rating?: number }>

function isAnswered(q: SurveyQuestion, a: Draft[number] | undefined): boolean {
  if (!a) return false
  if (q.type === 'TEXT') return !!a.text?.trim()
  if (q.type === 'RATING') return !!a.rating
  return !!a.optionIds?.length
}

/** Trả lời khảo sát: một / nhiều lựa chọn, chấm sao 1–5, văn bản. Mỗi cư dân trả lời một lần. */
export default function SurveyScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const apt = useApartment()
  const qc = useQueryClient()
  const survey = useQuery({ queryKey: ['survey', id, apt.id], queryFn: () => api.survey(id, apt.id) })
  const [draft, setDraft] = useState<Draft>({})
  const [missing, setMissing] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  if (survey.isLoading) return <Loading />
  if (survey.error || !survey.data) return <ErrorView message={errorMessage(survey.error)} onRetry={() => void survey.refetch()} />
  const s = survey.data
  const set = (qid: number, v: Draft[number]) => {
    setDraft((d) => ({ ...d, [qid]: { ...d[qid], ...v } }))
    setMissing((m) => m.filter((x) => x !== qid))
  }

  const submit = async () => {
    const need = s.questions.filter((q) => q.required && !isAnswered(q, draft[q.id])).map((q) => q.id)
    setMissing(need)
    if (need.length) return
    const answers: SurveyAnswer[] = s.questions
      .filter((q) => isAnswered(q, draft[q.id]))
      .map((q) => ({ questionId: q.id, ...draft[q.id], text: draft[q.id]?.text?.trim() || undefined }))
    if (!answers.length) {
      notify('Chưa trả lời câu hỏi nào')
      return
    }
    setSaving(true)
    try {
      await api.answerSurvey(id, apt.id, answers)
      await qc.invalidateQueries({ queryKey: ['apt', apt.id, 'surveys'] })
      notify('Cảm ơn bạn đã tham gia khảo sát!')
      router.back()
    } catch (e) {
      notify('Không gửi được', errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Khảo sát' }} />
      <Card style={{ gap: 6 }}>
        <Text style={styles.title}>{s.title}</Text>
        {s.description ? <Text style={styles.body}>{s.description}</Text> : null}
        <Text style={styles.muted}>
          Nhận phản hồi đến {formatDateTime(s.endAt)}
          {s.anonymous ? ' · Ẩn danh: Ban quản lý không biết ai trả lời' : ''}
        </Text>
      </Card>

      {s.answered ? (
        <Card style={styles.done}>
          <Icon name="check-circle" size={40} color={colors.primary} />
          <Text style={styles.doneText}>Bạn đã trả lời khảo sát này. Cảm ơn bạn!</Text>
        </Card>
      ) : !s.accepting ? (
        <Text style={styles.muted}>Khảo sát chưa mở hoặc đã hết thời gian nhận phản hồi.</Text>
      ) : (
        <>
          {s.questions.map((q, i) => (
            <Card key={q.id} style={[{ gap: 10 }, missing.includes(q.id) && { borderColor: colors.danger, borderWidth: 1 }]}>
              <Text style={styles.question}>
                {i + 1}. {q.content}
                {q.required ? <Text style={{ color: colors.danger }}> *</Text> : null}
              </Text>
              {q.type === 'SINGLE' || q.type === 'MULTIPLE' ? (
                q.options.map((o) => {
                  const selected = draft[q.id]?.optionIds?.includes(o.id) ?? false
                  const toggle = () => {
                    const cur = draft[q.id]?.optionIds ?? []
                    set(q.id, {
                      optionIds: q.type === 'SINGLE' ? [o.id] : selected ? cur.filter((x) => x !== o.id) : [...cur, o.id],
                    })
                  }
                  return (
                    <Pressable key={o.id} onPress={toggle} style={[styles.option, selected && styles.optionActive]}
                      accessibilityRole={q.type === 'SINGLE' ? 'radio' : 'checkbox'} accessibilityState={{ checked: selected }}>
                      <Icon
                        name={q.type === 'SINGLE' ? (selected ? 'radiobox-marked' : 'radiobox-blank') : selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={22}
                        color={selected ? colors.primary : colors.textMuted}
                      />
                      <Text style={styles.optionText}>{o.label}</Text>
                    </Pressable>
                  )
                })
              ) : q.type === 'RATING' ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => set(q.id, { rating: n })} accessibilityLabel={`${n} sao`} hitSlop={4}>
                      <Icon name={n <= (draft[q.id]?.rating ?? 0) ? 'star' : 'star-outline'} size={36} color="#F59E0B" />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <TextField label="Câu trả lời" multiline value={draft[q.id]?.text ?? ''} onChangeText={(t) => set(q.id, { text: t })}
                  maxLength={2000} />
              )}
              {missing.includes(q.id) && <Text style={styles.error}>Câu hỏi bắt buộc</Text>}
            </Card>
          ))}
          <Button title="Gửi câu trả lời" icon="send" onPress={() => void submit()} loading={saving} />
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  body: { fontSize: 14, color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  question: { fontSize: 15, fontWeight: '600', color: colors.text },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionText: { fontSize: 15, color: colors.text, flex: 1 },
  error: { color: colors.danger, fontSize: 13 },
  done: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  doneText: { fontSize: 15, color: colors.text, textAlign: 'center' },
})

import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SearchPicker } from '@/components/form'
import { Button, Icon } from '@/components/ui'
import { apartmentApi } from '@/lib/api/apartment'
import { errorMessage } from '@/lib/api'
import { notify } from '@/lib/dialogs'
import { surveyApi } from '@/lib/staff'
import type { AnswerRequest, ApartmentMember, Survey } from '@/lib/types'
import { colors } from '@/theme'

export function SurveyResponseModal({ visible, survey, onClose, onSaved }: { visible: boolean; survey: Survey; onClose: () => void; onSaved: () => void }) {
  const [apartmentId, setApartmentId] = useState<number | null>(null)
  const [apartmentLabel, setApartmentLabel] = useState<string>()
  const [residentId, setResidentId] = useState<number | null>(null)
  const [members, setMembers] = useState<ApartmentMember[]>([])
  const [answers, setAnswers] = useState<Record<number, { optionIds: Set<number>; text: string; rating: number }>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const questions = survey.questions ?? []

  const answerFor = (qid: number) => answers[qid] ?? { optionIds: new Set<number>(), text: '', rating: 0 }
  const setAnswer = (qid: number, patch: Partial<{ optionIds: Set<number>; text: string; rating: number }>) =>
    setAnswers((a) => ({ ...a, [qid]: { ...answerFor(qid), ...patch } }))

  const submit = async () => {
    if (!survey.anonymous && !apartmentId) {
      setMessage('Vui lòng chọn căn hộ')
      return
    }
    const e: Record<number, string> = {}
    const built: AnswerRequest[] = []
    for (const q of questions) {
      if (!q.id) continue
      const a = answerFor(q.id)
      if (q.type === 'TEXT') {
        if (q.required && !a.text.trim()) e[q.id] = 'Câu bắt buộc'
        built.push({ questionId: q.id, text: a.text.trim() || undefined })
      } else if (q.type === 'RATING') {
        if (q.required && !a.rating) e[q.id] = 'Câu bắt buộc'
        built.push({ questionId: q.id, rating: a.rating || undefined })
      } else {
        if (q.required && a.optionIds.size === 0) e[q.id] = 'Câu bắt buộc'
        built.push({ questionId: q.id, optionIds: Array.from(a.optionIds) })
      }
    }
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      await surveyApi.submitResponse(survey.id, {
        apartmentId: survey.anonymous ? null : apartmentId,
        residentId: survey.anonymous ? null : residentId,
        answers: built,
      })
      onSaved()
    } catch (err) {
      notify('Không gửi được', errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={styles.close}>Đóng</Text>
        </Pressable>
        <Text style={styles.title}>Nhập phản hồi hộ</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {message && <Text style={{ color: colors.danger }}>{message}</Text>}
        {survey.anonymous ? (
          <Text style={styles.muted}>Khảo sát ẩn danh — không cần chọn căn hộ / cư dân.</Text>
        ) : (
          <>
            <SearchPicker
              label="Căn hộ"
              required
              value={apartmentId}
              valueLabel={apartmentLabel}
              onSearch={(k) => apartmentApi.options(k).then((os) => os.map((o) => ({ value: o.id, label: `${o.code} · ${o.name}`, sublabel: o.buildingName })))}
              onChange={(v, o) => {
                setApartmentId(v)
                setApartmentLabel(o?.label)
                setResidentId(null)
                if (v) void apartmentApi.members(v).then(setMembers)
                else setMembers([])
              }}
            />
            {apartmentId != null && (
              <SearchPicker
                label="Cư dân (không bắt buộc)"
                value={residentId}
                options={members.filter((m) => m.residenceStatus !== 'MOVED_OUT').map((m) => ({ value: m.residentId, label: m.fullName }))}
                onChange={setResidentId}
              />
            )}
          </>
        )}

        {questions.map((q, qi) => {
          const a = q.id ? answerFor(q.id) : { optionIds: new Set<number>(), text: '', rating: 0 }
          return (
            <View key={q.id ?? qi} style={styles.question}>
              <Text style={styles.questionText}>
                {qi + 1}. {q.content}
                {q.required ? ' *' : ''}
              </Text>
              {q.type === 'TEXT' && (
                <TextInput
                  style={styles.input}
                  multiline
                  maxLength={2000}
                  value={a.text}
                  onChangeText={(t) => q.id && setAnswer(q.id, { text: t })}
                  placeholderTextColor={colors.textMuted}
                />
              )}
              {q.type === 'RATING' && (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => q.id && setAnswer(q.id, { rating: n })} hitSlop={4}>
                      <Icon name={n <= a.rating ? 'star' : 'star-outline'} size={28} color={colors.warning} />
                    </Pressable>
                  ))}
                </View>
              )}
              {(q.type === 'SINGLE' || q.type === 'MULTIPLE') &&
                q.options.map((o, oi) => {
                  const optId = o.id ?? oi
                  const checked = a.optionIds.has(optId)
                  return (
                    <Pressable
                      key={oi}
                      onPress={() => {
                        if (!q.id) return
                        const next = new Set(q.type === 'SINGLE' ? [] : a.optionIds)
                        if (q.type === 'SINGLE') next.add(optId)
                        else if (checked) next.delete(optId)
                        else next.add(optId)
                        setAnswer(q.id, { optionIds: next })
                      }}
                      style={styles.optionRow}
                    >
                      <Icon
                        name={q.type === 'SINGLE' ? (checked ? 'radiobox-marked' : 'radiobox-blank') : checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={20}
                        color={checked ? colors.primary : colors.textMuted}
                      />
                      <Text style={styles.optionText}>{o.label}</Text>
                    </Pressable>
                  )
                })}
              {q.id && errors[q.id] ? <Text style={styles.error}>{errors[q.id]}</Text> : null}
            </View>
          )
        })}

        <Button title="Gửi phản hồi" onPress={() => void submit()} loading={saving} />
      </ScrollView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  close: { color: colors.primaryDark, fontWeight: '600', fontSize: 15 },
  muted: { fontSize: 13, color: colors.textMuted },
  question: { gap: 10, backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  questionText: { fontSize: 15, fontWeight: '600', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, fontSize: 14, color: colors.text, minHeight: 60 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  optionText: { fontSize: 14, color: colors.text },
  error: { color: colors.danger, fontSize: 12 },
})

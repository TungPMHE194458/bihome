import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Icon, SwitchRow } from '@/components/ui'
import { QUESTION_TYPE, hasOptions } from '@/lib/constants'
import type { QuestionType, SurveyQuestion } from '@/lib/types'
import { colors, radius } from '@/theme'

const TYPES: QuestionType[] = ['SINGLE', 'MULTIPLE', 'TEXT', 'RATING']
const MAX_QUESTIONS = 50
const MAX_OPTIONS = 20

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function newQuestion(type: QuestionType): SurveyQuestion {
  return { type, content: '', required: true, options: hasOptions(type) ? [{ label: '' }, { label: '' }] : [] }
}

/**
 * Trình soạn câu hỏi khảo sát — thay thế kéo thả của web bằng nút lên/xuống. `locked` (đã có phản hồi) thì chỉ đọc.
 */
export function QuestionBuilder({ questions, onChange, locked, error }: { questions: SurveyQuestion[]; onChange: (qs: SurveyQuestion[]) => void; locked?: boolean; error?: string }) {
  const update = (i: number, patch: Partial<SurveyQuestion>) => {
    const next = [...questions]
    next[i] = { ...next[i], ...patch }
    onChange(next)
  }
  const changeType = (i: number, type: QuestionType) => {
    const q = questions[i]
    const options = hasOptions(type) ? (q.options.length >= 2 ? q.options : [{ label: '' }, { label: '' }]) : []
    update(i, { type, options })
  }
  const updateOption = (qi: number, oi: number, label: string) => {
    const next = [...questions]
    const options = [...next[qi].options]
    options[oi] = { ...options[oi], label }
    next[qi] = { ...next[qi], options }
    onChange(next)
  }
  const addOption = (qi: number) => {
    if (questions[qi].options.length >= MAX_OPTIONS) return
    update(qi, { options: [...questions[qi].options, { label: '' }] })
  }
  const removeOption = (qi: number, oi: number) => {
    if (questions[qi].options.length <= 2) return
    update(qi, { options: questions[qi].options.filter((_, i) => i !== oi) })
  }

  return (
    <View style={{ gap: 14 }}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {questions.map((q, qi) => (
        <View key={qi} style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.index}>Câu {qi + 1}</Text>
            {!locked && (
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Pressable onPress={() => onChange(move(questions, qi, qi - 1))} hitSlop={6} accessibilityLabel="Lên" disabled={qi === 0}>
                  <Icon name="chevron-up" size={20} color={qi === 0 ? colors.border : colors.textMuted} />
                </Pressable>
                <Pressable onPress={() => onChange(move(questions, qi, qi + 1))} hitSlop={6} accessibilityLabel="Xuống" disabled={qi === questions.length - 1}>
                  <Icon name="chevron-down" size={20} color={qi === questions.length - 1 ? colors.border : colors.textMuted} />
                </Pressable>
                <Pressable onPress={() => onChange(questions.filter((_, i) => i !== qi))} hitSlop={6} accessibilityLabel="Xoá câu hỏi">
                  <Icon name="delete-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            )}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Nội dung câu hỏi"
            placeholderTextColor={colors.textMuted}
            value={q.content}
            onChangeText={(t) => update(qi, { content: t })}
            maxLength={500}
            editable={!locked}
            multiline
          />
          {!locked && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TYPES.map((t) => (
                <Pressable key={t} onPress={() => changeType(qi, t)} style={[styles.typeChip, q.type === t && styles.typeChipActive]}>
                  <Text style={[styles.typeChipText, q.type === t && { color: '#FFFFFF' }]}>{QUESTION_TYPE[t]}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {locked && <Text style={styles.muted}>{QUESTION_TYPE[q.type]}</Text>}

          {hasOptions(q.type) && (
            <View style={{ gap: 8 }}>
              {q.options.map((o, oi) => (
                <View key={oi} style={styles.optionRow}>
                  <Icon name={q.type === 'SINGLE' ? 'radiobox-blank' : 'checkbox-blank-outline'} size={18} color={colors.textMuted} />
                  <TextInput
                    style={styles.optionInput}
                    placeholder={`Lựa chọn ${oi + 1}`}
                    placeholderTextColor={colors.textMuted}
                    value={o.label}
                    onChangeText={(t) => updateOption(qi, oi, t)}
                    maxLength={200}
                    editable={!locked}
                  />
                  {!locked && q.options.length > 2 && (
                    <Pressable onPress={() => removeOption(qi, oi)} hitSlop={6}>
                      <Icon name="close" size={16} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>
              ))}
              {!locked && q.options.length < MAX_OPTIONS && (
                <Pressable onPress={() => addOption(qi)} style={styles.addOption}>
                  <Icon name="plus" size={16} color={colors.primaryDark} />
                  <Text style={styles.addOptionText}>Thêm lựa chọn</Text>
                </Pressable>
              )}
            </View>
          )}
          {q.type === 'RATING' && (
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Icon key={n} name="star-outline" size={20} color={colors.warning} />
              ))}
            </View>
          )}
          {q.type === 'TEXT' && <Text style={styles.muted}>Người trả lời nhập câu trả lời ngắn.</Text>}

          {!locked && <SwitchRow label="Bắt buộc trả lời" value={q.required} onValueChange={(v) => update(qi, { required: v })} />}
        </View>
      ))}

      {!locked && questions.length < MAX_QUESTIONS && (
        <View style={{ gap: 8 }}>
          <Text style={styles.addLabel}>Thêm câu hỏi</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TYPES.map((t) => (
              <Pressable key={t} onPress={() => onChange([...questions, newQuestion(t)])} style={styles.addTypeChip}>
                <Icon name="plus" size={14} color={colors.primaryDark} />
                <Text style={styles.addOptionText}>{QUESTION_TYPE[t]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontSize: 13 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  index: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10, fontSize: 15, color: colors.text, minHeight: 44 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  muted: { fontSize: 12, color: colors.textMuted },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: colors.text },
  addOption: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  addOptionText: { fontSize: 13, color: colors.primaryDark, fontWeight: '600' },
  requiredRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  addTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
})

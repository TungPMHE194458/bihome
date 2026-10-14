import { useState } from 'react'
import { Text, View } from 'react-native'
import { AudienceFields } from '@/components/AudienceFields'
import { DateInput, TimeInput } from '@/components/form'
import { QuestionBuilder } from '@/components/QuestionBuilder'
import { Button, SwitchRow, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { surveyApi } from '@/lib/staff'
import type { Audience, PickItem, Survey, SurveyQuestion, SurveyRequest } from '@/lib/types'
import { colors } from '@/theme'

export function SurveyForm({ survey, onSaved }: { survey?: Survey; onSaved: (s: Survey) => void }) {
  const locked = survey?.questionsLocked ?? false
  const [title, setTitle] = useState(survey?.title ?? '')
  const [description, setDescription] = useState(survey?.description ?? '')
  const [audience, setAudience] = useState<Audience>(survey?.audience ?? 'ALL')
  const [targets, setTargets] = useState<PickItem[]>(survey?.targetItems ?? [])
  const [startDate, setStartDate] = useState<string | undefined>(survey?.startAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState<string | undefined>(survey?.startAt?.slice(11, 16) ?? '08:00')
  const [endDate, setEndDate] = useState<string | undefined>(survey?.endAt?.slice(0, 10))
  const [endTime, setEndTime] = useState<string | undefined>(survey?.endAt?.slice(11, 16) ?? '17:00')
  const [anonymous, setAnonymous] = useState(survey?.anonymous ?? false)
  const [questions, setQuestions] = useState<SurveyQuestion[]>(survey?.questions ?? [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Vui lòng nhập tiêu đề'
    if (audience !== 'ALL' && targets.length === 0) e.targets = 'Vui lòng chọn ít nhất một đối tượng'
    if (!startDate || !startTime) e.startAt = 'Vui lòng chọn thời gian bắt đầu'
    if (!endDate || !endTime) e.endAt = 'Vui lòng chọn thời gian kết thúc'
    const startAt = startDate && startTime ? `${startDate}T${startTime}:00+07:00` : ''
    const endAt = endDate && endTime ? `${endDate}T${endTime}:00+07:00` : ''
    if (startAt && endAt && endAt <= startAt) e.endAt = 'Thời gian kết thúc phải sau thời gian bắt đầu'
    if (questions.length === 0) e.questions = 'Thêm ít nhất một câu hỏi'
    for (const q of questions) {
      if (!q.content.trim()) {
        e.questions = 'Mỗi câu hỏi cần có nội dung'
        break
      }
      if ((q.type === 'SINGLE' || q.type === 'MULTIPLE') && q.options.filter((o) => o.label.trim()).length < 2) {
        e.questions = 'Câu một/nhiều lựa chọn cần ít nhất 2 lựa chọn'
        break
      }
    }
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return

    const body: SurveyRequest = {
      title: title.trim(),
      description: description.trim() || null,
      audience,
      targets: targets.map((t) => t.value),
      startAt,
      endAt,
      anonymous,
      questions: locked ? (survey?.questions ?? []) : questions,
      version: survey?.version,
    }
    setSaving(true)
    try {
      onSaved(await surveyApi.save(survey?.id, body))
    } catch (err) {
      setErrors(fieldErrors(err))
      setMessage(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ gap: 16 }}>
      {message && <Text style={{ color: colors.danger }}>{message}</Text>}
      <TextField label="Tiêu đề *" value={title} onChangeText={setTitle} error={errors.title} />
      <TextField label="Mô tả" value={description} onChangeText={setDescription} multiline />
      <AudienceFields audience={audience} targets={targets} onChange={(a, t) => { setAudience(a); setTargets(t) }} allowResident={false} />
      {errors.targets ? <Text style={{ color: colors.danger, fontSize: 13 }}>{errors.targets}</Text> : null}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <DateInput label="Bắt đầu" value={startDate} onChange={setStartDate} />
        <View style={{ flex: 1 }}>
          <TimeInput label="Giờ" value={startTime} onChange={setStartTime} error={errors.startAt} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <DateInput label="Kết thúc" value={endDate} onChange={setEndDate} />
        <View style={{ flex: 1 }}>
          <TimeInput label="Giờ" value={endTime} onChange={setEndTime} error={errors.endAt} />
        </View>
      </View>

      {locked ? (
        <Text style={{ fontSize: 13, color: colors.textMuted }}>
          {anonymous ? 'Ẩn danh' : 'Không ẩn danh'} — đã có phản hồi nên không đổi được.
        </Text>
      ) : (
        <SwitchRow label="Ẩn danh (không lưu căn hộ / cư dân của người trả lời)" value={anonymous} onValueChange={setAnonymous} />
      )}

      <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>Câu hỏi</Text>
      {locked && <Text style={{ fontSize: 13, color: colors.warning }}>Khảo sát đã có phản hồi nên không sửa được câu hỏi.</Text>}
      <QuestionBuilder questions={questions} onChange={setQuestions} locked={locked} error={errors.questions} />

      <Button title={survey ? 'Lưu thay đổi' : 'Tạo khảo sát (Nháp)'} onPress={() => void submit()} loading={saving} />
    </View>
  )
}

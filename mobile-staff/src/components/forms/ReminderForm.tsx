import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { AudienceFields } from '@/components/AudienceFields'
import { ChipSelect, DateInput, TimeInput } from '@/components/form'
import { Button, Icon, SwitchRow, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { REMINDER_CHANNEL, SCHEDULE_TYPE } from '@/lib/constants'
import { reminderApi } from '@/lib/staff'
import type { Audience, PickItem, Reminder, ReminderChannel, ReminderRequest, ScheduleType } from '@/lib/types'
import { colors } from '@/theme'

const SCHEDULE_OPTIONS = (Object.keys(SCHEDULE_TYPE) as ScheduleType[]).map((v) => ({ value: v, label: SCHEDULE_TYPE[v] }))
const CHANNELS: ReminderChannel[] = ['IN_APP', 'EMAIL', 'SMS']

export function ReminderForm({ reminder, onSaved }: { reminder?: Reminder; onSaved: (r: Reminder) => void }) {
  const [title, setTitle] = useState(reminder?.title ?? '')
  const [content, setContent] = useState(reminder?.content ?? '')
  const [audience, setAudience] = useState<Audience>(reminder?.audience ?? 'ALL')
  const [targets, setTargets] = useState<PickItem[]>(reminder?.targetItems ?? [])
  const [channels, setChannels] = useState<Set<ReminderChannel>>(new Set(reminder?.channels ?? ['IN_APP']))
  const [scheduleType, setScheduleType] = useState<ScheduleType>(reminder?.scheduleType ?? 'NOW')
  const [scheduledDate, setScheduledDate] = useState<string | undefined>(reminder?.scheduledAt?.slice(0, 10))
  const [scheduledTime, setScheduledTime] = useState<string | undefined>(reminder?.scheduledAt?.slice(11, 16))
  const [monthlyDay, setMonthlyDay] = useState(reminder?.monthlyDay != null ? String(reminder.monthlyDay) : '1')
  const [monthlyTime, setMonthlyTime] = useState<string | undefined>(reminder?.monthlyTime ?? '08:00')
  const [endDate, setEndDate] = useState<string | undefined>(reminder?.endDate)
  const [draft, setDraft] = useState(reminder ? reminder.status === 'DRAFT' : true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const toggleChannel = (c: ReminderChannel) => {
    const next = new Set(channels)
    if (next.has(c)) next.delete(c)
    else next.add(c)
    setChannels(next)
  }

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Vui lòng nhập tiêu đề'
    if (!content.trim()) e.content = 'Vui lòng nhập nội dung'
    if (audience !== 'ALL' && targets.length === 0) e.targets = 'Vui lòng chọn ít nhất một đối tượng'
    if (channels.size === 0) e.channels = 'Chọn ít nhất một kênh gửi'
    if (!draft) {
      if (scheduleType === 'ONCE' && (!scheduledDate || !scheduledTime)) e.scheduledAt = 'Vui lòng chọn thời điểm gửi'
      if (scheduleType === 'MONTHLY') {
        const d = Number(monthlyDay)
        if (!(d >= 1 && d <= 31)) e.monthlyDay = 'Ngày trong tháng từ 1 đến 31'
        if (!monthlyTime) e.monthlyTime = 'Vui lòng chọn giờ gửi'
      }
    }
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return

    const body: ReminderRequest = {
      title: title.trim(),
      content: content.trim(),
      audience,
      targets: targets.map((t) => t.value),
      channels: Array.from(channels),
      scheduleType,
      scheduledAt: scheduleType === 'ONCE' && scheduledDate && scheduledTime ? `${scheduledDate}T${scheduledTime}:00+07:00` : null,
      monthlyDay: scheduleType === 'MONTHLY' ? Number(monthlyDay) : null,
      monthlyTime: scheduleType === 'MONTHLY' ? (monthlyTime ?? null) : null,
      endDate: scheduleType === 'MONTHLY' ? (endDate ?? null) : null,
      draft,
      version: reminder?.version,
    }
    setSaving(true)
    try {
      onSaved(await reminderApi.save(reminder?.id, body))
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
      <TextField label="Nội dung *" value={content} onChangeText={setContent} multiline error={errors.content} />
      <AudienceFields audience={audience} targets={targets} onChange={(a, t) => { setAudience(a); setTargets(t) }} />
      {errors.targets ? <Text style={{ color: colors.danger, fontSize: 13 }}>{errors.targets}</Text> : null}

      <Text style={{ fontWeight: '600', color: colors.text }}>Kênh gửi</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {CHANNELS.map((c) => (
          <Pressable key={c} onPress={() => toggleChannel(c)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name={channels.has(c) ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={channels.has(c) ? colors.primary : colors.textMuted} />
            <Text style={{ color: colors.text }}>{REMINDER_CHANNEL[c]}</Text>
          </Pressable>
        ))}
      </View>
      {errors.channels ? <Text style={{ color: colors.danger, fontSize: 13 }}>{errors.channels}</Text> : null}
      <Text style={{ fontSize: 12, color: colors.textMuted }}>Email / SMS: môi trường thử chỉ ghi log; Trong app: lưu vào hộp thư app cư dân.</Text>

      <ChipSelect label="Thời điểm gửi" required options={SCHEDULE_OPTIONS} value={scheduleType} onChange={(v) => v && setScheduleType(v)} />
      {scheduleType === 'ONCE' && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <DateInput label="Ngày gửi" value={scheduledDate} onChange={setScheduledDate} minimumDate={new Date()} />
          <View style={{ flex: 1 }}>
            <TimeInput label="Giờ gửi" value={scheduledTime} onChange={setScheduledTime} error={errors.scheduledAt} />
          </View>
        </View>
      )}
      {scheduleType === 'MONTHLY' && (
        <>
          <TextField label="Ngày trong tháng (1–31)" value={monthlyDay} onChangeText={(t) => setMonthlyDay(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" error={errors.monthlyDay} />
          <Text style={{ fontSize: 12, color: colors.textMuted }}>Tháng ít ngày hơn thì gửi vào ngày cuối tháng.</Text>
          <TimeInput label="Giờ gửi" value={monthlyTime} onChange={setMonthlyTime} error={errors.monthlyTime} />
          <DateInput label="Đến ngày (không bắt buộc)" value={endDate} onChange={setEndDate} />
          <Text style={{ fontSize: 12, color: colors.textMuted }}>Bỏ trống = không giới hạn.</Text>
        </>
      )}

      <SwitchRow label="Lưu nháp (chưa gửi, chưa lên lịch)" value={draft} onValueChange={setDraft} />

      <Button
        title={draft ? 'Lưu nháp' : scheduleType === 'NOW' ? 'Gửi ngay' : 'Lên lịch gửi'}
        onPress={() => void submit()}
        loading={saving}
      />
    </View>
  )
}

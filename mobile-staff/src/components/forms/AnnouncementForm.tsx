import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ChipSelect, DateInput, Segmented, TimeInput } from '@/components/form'
import { Button, Icon, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { ANNOUNCEMENT_AUDIENCE, ANNOUNCEMENT_CATEGORY } from '@/lib/constants'
import { pickDocumentFile, toFormData } from '@/lib/file'
import { formatFileSize } from '@/lib/format'
import { announcementApi, authApi } from '@/lib/staff'
import type { Announcement, AnnouncementAudience, AnnouncementCategory, AnnouncementRequest } from '@/lib/types'
import { colors, radius } from '@/theme'

const CATEGORY_OPTIONS = (Object.keys(ANNOUNCEMENT_CATEGORY) as AnnouncementCategory[]).map((v) => ({ value: v, label: ANNOUNCEMENT_CATEGORY[v].label }))
const AUDIENCE_OPTIONS = (Object.keys(ANNOUNCEMENT_AUDIENCE) as AnnouncementAudience[]).map((v) => ({ value: v, label: ANNOUNCEMENT_AUDIENCE[v] }))

type Mode = 'DRAFT' | 'SCHEDULED' | 'NOW'

interface AttachmentDraft {
  fileId: number
  name: string
  size?: number
}

export function AnnouncementForm({ announcement, onSaved }: { announcement?: Announcement; onSaved: (a: Announcement, mode: Mode) => void }) {
  const [title, setTitle] = useState(announcement?.title ?? '')
  const [content, setContent] = useState(announcement?.content ?? '')
  const [category, setCategory] = useState<AnnouncementCategory>(announcement?.category ?? 'GENERAL')
  const [audience, setAudience] = useState<AnnouncementAudience>(announcement?.audience ?? 'ALL')
  const [mode, setMode] = useState<Mode>(announcement?.status === 'SCHEDULED' ? 'SCHEDULED' : 'DRAFT')
  const [scheduledDate, setScheduledDate] = useState(announcement?.scheduledAt?.slice(0, 10))
  const [scheduledTime, setScheduledTime] = useState(announcement?.scheduledAt?.slice(11, 16))
  const [attachments, setAttachments] = useState<AttachmentDraft[]>(
    announcement?.attachments.map((a) => ({ fileId: a.fileId, name: a.name, size: a.size })) ?? [],
  )
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const addAttachment = async () => {
    if (attachments.length >= 10) {
      notifyLimit()
      return
    }
    const picked = await pickDocumentFile()
    if (!picked) return
    setUploading(true)
    try {
      const uploaded = await authApi.uploadForm(toFormData(picked), 'ANNOUNCEMENT_ATTACHMENT')
      setAttachments((prev) => [...prev, { fileId: uploaded.id, name: picked.name, size: picked.blob?.size }])
    } catch (e) {
      setMessage(errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  const notifyLimit = () => setMessage('Tối đa 10 tệp đính kèm')

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Vui lòng nhập tiêu đề'
    if (!content.trim()) e.content = 'Vui lòng nhập nội dung'
    if (mode === 'SCHEDULED' && !(scheduledDate && scheduledTime)) e.scheduledAt = 'Vui lòng chọn thời điểm gửi'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    const body: AnnouncementRequest = {
      title: title.trim(),
      content: content.trim(),
      category,
      audience,
      scheduledAt: mode === 'SCHEDULED' ? `${scheduledDate}T${scheduledTime}:00+07:00` : null,
      fileIds: attachments.map((a) => a.fileId),
      version: announcement?.version,
    }
    setSaving(true)
    try {
      const saved = await announcementApi.save(announcement?.id, body)
      if (mode === 'NOW') {
        const sent = await announcementApi.send(saved.id, saved.version)
        onSaved(sent, mode)
      } else {
        onSaved(saved, mode)
      }
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
      <TextField label="Tiêu đề *" value={title} onChangeText={setTitle} error={errors.title} maxLength={200} />
      <ChipSelect label="Loại thông báo" required options={CATEGORY_OPTIONS} value={category} onChange={(v) => v && setCategory(v)} />
      <ChipSelect label="Gửi tới" required options={AUDIENCE_OPTIONS} value={audience} onChange={(v) => v && setAudience(v)} />
      <TextField label="Nội dung *" value={content} onChangeText={setContent} multiline error={errors.content} maxLength={4000} />

      <View style={{ gap: 6 }}>
        <Text style={styles.label}>Đính kèm tệp</Text>
        {attachments.map((a, i) => (
          <View key={a.fileId} style={styles.attachment}>
            <Icon name="paperclip" size={18} color={colors.primaryDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.attachmentName} numberOfLines={1}>{a.name}</Text>
              {a.size != null && <Text style={styles.attachmentMeta}>{formatFileSize(a.size)}</Text>}
            </View>
            <Pressable onPress={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))} hitSlop={8}>
              <Icon name="close" size={18} color={colors.danger} />
            </Pressable>
          </View>
        ))}
        <Button title="Thêm tệp" icon="paperclip" variant="outline" onPress={() => void addAttachment()} loading={uploading} />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={styles.label}>Thời điểm gửi</Text>
        <Segmented
          items={[
            { value: 'DRAFT', label: 'Lưu nháp' },
            { value: 'NOW', label: 'Gửi ngay' },
            { value: 'SCHEDULED', label: 'Hẹn giờ' },
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>
      {mode === 'SCHEDULED' && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <DateInput label="Ngày gửi" value={scheduledDate} onChange={setScheduledDate} minimumDate={new Date()} error={errors.scheduledAt} />
          <View style={{ flex: 1 }}>
            <TimeInput label="Giờ gửi" value={scheduledTime} onChange={setScheduledTime} />
          </View>
        </View>
      )}

      <Text style={styles.hint}>
        {audience !== 'RESIDENT' && 'Nhân viên làm việc ở tòa nhận thông báo ngay trên chuông của hệ thống. '}
        {audience !== 'STAFF' && 'Cư dân sẽ nhận qua app cư dân.'}
      </Text>

      <Button
        title={mode === 'NOW' ? 'Gửi ngay' : mode === 'SCHEDULED' ? 'Hẹn giờ gửi' : 'Lưu nháp'}
        onPress={() => void submit()}
        loading={saving}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10 },
  attachmentName: { fontSize: 13, color: colors.text, fontWeight: '600' },
  attachmentMeta: { fontSize: 11, color: colors.textMuted },
  hint: { fontSize: 12, color: colors.textMuted },
})

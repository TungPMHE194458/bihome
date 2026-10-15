import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { ChipSelect, SearchPicker } from '@/components/form'
import { PhotoPicker, type UploadedPhoto } from '@/components/PhotoPicker'
import { Button, TextField } from '@/components/ui'
import { apartmentApi } from '@/lib/api/apartment'
import { errorMessage, fieldErrors } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { TICKET_CHANNEL, TICKET_PRIORITY, formatHours } from '@/lib/constants'
import { ticketApi } from '@/lib/staff'
import type { ApartmentMember, Assignee, TicketChannel, TicketDetail, TicketPriority, TicketRequest } from '@/lib/types'
import { colors } from '@/theme'

const PRIORITY_OPTIONS = (Object.keys(TICKET_PRIORITY) as TicketPriority[]).map((v) => ({ value: v, label: TICKET_PRIORITY[v].label }))
const CHANNEL_OPTIONS = (Object.keys(TICKET_CHANNEL) as TicketChannel[]).map((v) => ({ value: v, label: TICKET_CHANNEL[v] }))

/** Tạo yêu cầu hỗ trợ mới (BQL tạo hộ cư dân hoặc ghi nhận yêu cầu nội bộ). Sửa thông tin dùng web. */
export function TicketForm({ onSaved }: { onSaved: (t: TicketDetail) => void }) {
  const { buildingId: selectedBuildingId } = useAuth()
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [categoryLabel, setCategoryLabel] = useState<string>()
  const [categorySla, setCategorySla] = useState<string>()
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM')
  const [channel, setChannel] = useState<TicketChannel>('DIRECT')
  const [apartmentId, setApartmentId] = useState<number | null>(null)
  const [apartmentLabel, setApartmentLabel] = useState<string>()
  const [apartmentBuildingId, setApartmentBuildingId] = useState<number | null>(null)
  const [residentId, setResidentId] = useState<number | null>(null)
  const [members, setMembers] = useState<ApartmentMember[]>([])
  const [assigneeId, setAssigneeId] = useState<number | null>(null)
  const [assigneeLabel, setAssigneeLabel] = useState<string>()
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [assigneesKey, setAssigneesKey] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const buildingId = apartmentBuildingId ?? selectedBuildingId ?? null

  useEffect(() => {
    if (buildingId == null) return
    void ticketApi.assignees(buildingId).then((list) => {
      setAssignees(list)
      setAssigneesKey(buildingId)
    })
  }, [buildingId])

  /** Toà đổi thì danh sách người xử lý cũ coi như chưa khớp cho tới khi tải xong (tránh setState đồng bộ trong effect). */
  const currentAssignees = buildingId != null && assigneesKey === buildingId ? assignees : []
  const effectiveAssigneeId = assigneeId != null && currentAssignees.some((a) => a.id === assigneeId) ? assigneeId : null

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Vui lòng nhập tiêu đề'
    if (!categoryId) e.categoryId = 'Vui lòng chọn danh mục'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    const body: TicketRequest = {
      title: title.trim(),
      description: description.trim() || null,
      categoryId: categoryId!,
      apartmentId,
      residentId,
      channel,
      priority,
      assigneeId: effectiveAssigneeId,
      fileIds: photos.map((p) => p.fileId),
    }
    setSaving(true)
    try {
      onSaved(await ticketApi.save(undefined, body))
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
      {buildingId == null && (
        <Text style={{ color: colors.warning, fontSize: 13 }}>
          Đang xem tất cả tòa nhà: hãy chọn căn hộ (yêu cầu sẽ thuộc tòa của căn hộ) hoặc chọn một tòa ở trên.
        </Text>
      )}
      <TextField label="Tiêu đề *" value={title} onChangeText={setTitle} error={errors.title} placeholder="vd Mất điện căn A-12.05" />
      <SearchPicker
        label="Danh mục"
        required
        value={categoryId}
        valueLabel={categoryLabel}
        onSearch={(k) =>
          ticketApi
            .categoryOptions()
            .then((os) =>
              os
                .filter((o) => !k || o.name.toLowerCase().includes(k.toLowerCase()))
                .map((o) => ({ value: o.id, label: o.name, sublabel: `SLA phản hồi ${formatHours(o.responseSlaHours)} · xử lý ${formatHours(o.resolutionSlaHours)}` })),
            )
        }
        onChange={(v, o) => {
          setCategoryId(v)
          setCategoryLabel(o?.label)
          setCategorySla(o?.sublabel)
        }}
        error={errors.categoryId}
      />
      {categorySla && <Text style={{ color: colors.textMuted, fontSize: 12 }}>{categorySla}</Text>}
      <ChipSelect label="Mức ưu tiên" required options={PRIORITY_OPTIONS} value={priority} onChange={(v) => v && setPriority(v)} />
      <ChipSelect label="Kênh tiếp nhận" required options={CHANNEL_OPTIONS} value={channel} onChange={(v) => v && setChannel(v)} />
      <SearchPicker
        label="Căn hộ (không bắt buộc)"
        value={apartmentId}
        valueLabel={apartmentLabel}
        onSearch={(k) => apartmentApi.options(k).then((os) => os.map((o) => ({ value: o.id, label: `${o.code} · ${o.name}`, sublabel: o.buildingName })))}
        onChange={(v, o) => {
          setApartmentId(v)
          setApartmentLabel(o?.label)
          setApartmentBuildingId(null)
          setResidentId(null)
          setMembers([])
          if (v != null) {
            void apartmentApi.get(v).then((a) => setApartmentBuildingId(a.buildingId))
            void apartmentApi.members(v).then(setMembers)
          }
        }}
      />
      {apartmentId != null && (
        <SearchPicker
          label="Cư dân gửi yêu cầu (không bắt buộc)"
          value={residentId}
          options={members.filter((m) => m.residenceStatus !== 'MOVED_OUT').map((m) => ({ value: m.residentId, label: m.fullName }))}
          onChange={setResidentId}
        />
      )}
      <SearchPicker
        label="Người xử lý (không bắt buộc)"
        value={effectiveAssigneeId}
        valueLabel={assigneeLabel}
        placeholder={buildingId == null ? 'Chọn căn hộ hoặc tòa trước' : 'Theo người phụ trách mặc định của danh mục'}
        options={currentAssignees.map((a) => ({ value: a.id, label: a.fullName }))}
        onChange={(v, o) => {
          setAssigneeId(v)
          setAssigneeLabel(o?.label)
        }}
      />
      <TextField label="Mô tả" value={description} onChangeText={setDescription} multiline />
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>Đính kèm ảnh</Text>
        <PhotoPicker value={photos} onChange={setPhotos} purpose="TICKET_ATTACHMENT" />
      </View>
      <Button title="Tạo yêu cầu" onPress={() => void submit()} loading={saving} />
    </View>
  )
}

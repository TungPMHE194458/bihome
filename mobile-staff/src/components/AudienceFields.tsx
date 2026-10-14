import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ChipSelect, MultiSearchPicker } from '@/components/form'
import { Icon } from '@/components/ui'
import { apartmentApi } from '@/lib/api/apartment'
import { reminderApi } from '@/lib/api/reminder'
import { residentApi } from '@/lib/api/resident'
import { AUDIENCE } from '@/lib/constants'
import type { Audience, PickItem } from '@/lib/types'
import { colors } from '@/theme'

const ALL_OPTIONS = (Object.keys(AUDIENCE) as Audience[]).map((v) => ({ value: v, label: AUDIENCE[v] }))

/**
 * Chọn đối tượng nhận (ALL/FLOOR/APARTMENT/RESIDENT) dùng chung cho Nhắc nhở và Khảo sát. Khảo sát không có đối
 * tượng RESIDENT (allowResident=false). Đổi audience thì xoá targets đang chọn, giống web.
 */
export function AudienceFields({
  audience,
  targets,
  onChange,
  allowResident = true,
}: {
  audience: Audience
  targets: PickItem[]
  onChange: (audience: Audience, targets: PickItem[]) => void
  allowResident?: boolean
}) {
  const options = allowResident ? ALL_OPTIONS : ALL_OPTIONS.filter((o) => o.value !== 'RESIDENT')
  const [preview, setPreview] = useState<{ count: number; withEmail: number; withPhone: number; sample: string[] } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    // Chưa có đối tượng cụ thể: không gọi preview; ô hiển thị cũng tự ẩn (xem điều kiện render bên dưới).
    if (audience !== 'ALL' && targets.length === 0) return
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      setLoadingPreview(true)
      reminderApi
        .previewRecipients(audience, targets.map((t) => t.value))
        .then(setPreview)
        .catch(() => setPreview(null))
        .finally(() => setLoadingPreview(false))
    }, 400)
    return () => clearTimeout(debounce.current)
  }, [audience, targets])

  return (
    <View style={{ gap: 12 }}>
      <ChipSelect
        label="Đối tượng nhận"
        required
        options={options}
        value={audience}
        onChange={(v) => v && onChange(v, [])}
      />
      {audience === 'ALL' && <Text style={styles.hint}>Mọi cư dân đang ở của tòa.</Text>}
      {audience === 'FLOOR' && (
        <MultiSearchPicker
          label="Tầng"
          selected={targets}
          onSearch={(k) =>
            reminderApi.floors().then((fs) => fs.filter((f) => !k || f.includes(k)).map((f) => ({ value: f, label: `Tầng ${f}` })))
          }
          onChange={(v) => onChange(audience, v)}
        />
      )}
      {audience === 'APARTMENT' && (
        <MultiSearchPicker
          label="Căn hộ"
          selected={targets}
          onSearch={(k) => apartmentApi.options(k).then((os) => os.map((o) => ({ value: String(o.id), label: o.code, sublabel: o.name })))}
          onChange={(v) => onChange(audience, v)}
        />
      )}
      {audience === 'RESIDENT' && (
        <MultiSearchPicker
          label="Cư dân"
          selected={targets}
          onSearch={(k) =>
            residentApi.list({ keyword: k, size: 20, residenceStatus: 'LIVING' }).then((p) => p.content.map((r) => ({ value: String(r.id), label: r.fullName, sublabel: r.phone })))
          }
          onChange={(v) => onChange(audience, v)}
        />
      )}
      {(audience === 'ALL' || targets.length > 0) && (
        <View style={styles.preview}>
          <Icon name="account-group-outline" size={18} color={colors.primaryDark} />
          {loadingPreview ? (
            <Text style={styles.previewText}>Đang tính…</Text>
          ) : preview ? (
            <Text style={styles.previewText}>
              Dự kiến {preview.count} cư dân nhận ({preview.withEmail} có email, {preview.withPhone} có số điện thoại)
              {preview.sample.length ? `: ${preview.sample.slice(0, 5).join(', ')}` : ''}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: colors.textMuted },
  preview: { flexDirection: 'row', gap: 8, backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10 },
  previewText: { flex: 1, fontSize: 13, color: colors.primaryDark },
})

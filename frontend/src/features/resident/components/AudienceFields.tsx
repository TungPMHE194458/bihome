import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { AsyncMultiPicker, type PickItem } from '@/components/form/AsyncMultiPicker'
import { apartmentApi } from '@/features/apartment/api'
import { residentApi } from '@/features/resident/api'
import { getProblem } from '@/lib/apiError'
import { http } from '@/lib/http'
import { useBuildingStore } from '@/stores/buildingStore'

export type Audience = 'ALL' | 'FLOOR' | 'APARTMENT' | 'RESIDENT'

export const AUDIENCE_LABEL: Record<Audience, string> = {
  ALL: 'Toàn tòa',
  FLOOR: 'Theo tầng',
  APARTMENT: 'Theo căn hộ',
  RESIDENT: 'Cư dân cụ thể',
}

export interface RecipientPreview {
  count: number
  withEmail: number
  withPhone: number
  sample: string[]
}

interface Props<T extends FieldValues> {
  control: Control<T>
  audienceName: Path<T>
  /** Trường giữ PickItem[] (giá trị + nhãn) của tầng / căn hộ / cư dân. */
  targetsName: Path<T>
  audience: Audience
  targets: PickItem[]
  /** Khảo sát không chọn cư dân cụ thể. */
  allowResident?: boolean
  disabled?: boolean
  /** Hiện số cư dân dự kiến nhận (gọi API xem trước). */
  showPreview?: boolean
  /** Đổi loại đối tượng: form xoá các giá trị đã chọn. */
  onAudienceChange?: () => void
}

/** Chọn đối tượng nhận: toàn tòa, theo tầng, theo căn hộ hoặc cư dân cụ thể (cư dân đang ở của tòa đang chọn). */
export function AudienceFields<T extends FieldValues>({
  control,
  audienceName,
  targetsName,
  audience,
  targets,
  allowResident = true,
  disabled,
  showPreview = true,
  onAudienceChange,
}: Props<T>) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const { data: floors = [] } = useQuery({
    queryKey: ['audience-floors', buildingId],
    enabled: audience === 'FLOOR' && buildingId != null,
    queryFn: () => http.get<string[]>('/reminders/floors').then((r) => r.data),
  })
  const audiences = (Object.keys(AUDIENCE_LABEL) as Audience[]).filter((a) => allowResident || a !== 'RESIDENT')

  // Xem trước số người nhận sau khi ngừng chọn 400ms.
  const key = `${audience}:${targets.map((t) => t.value).join(',')}`
  const [debouncedKey, setDebouncedKey] = useState(key)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKey(key), 400)
    return () => clearTimeout(t)
  }, [key])
  const preview = useQuery({
    queryKey: ['audience-preview', buildingId, debouncedKey],
    enabled: showPreview && buildingId != null && (audience === 'ALL' || targets.length > 0),
    retry: false,
    queryFn: () =>
      http
        .post<RecipientPreview>('/reminders/preview-recipients', { audience, targets: targets.map((t) => t.value) })
        .then((r) => r.data),
  })

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' }, alignItems: 'start' }}>
      <Controller
        name={audienceName}
        control={control}
        render={({ field }) => (
          <TextField
            select
            label="Đối tượng"
            value={field.value}
            disabled={disabled}
            onChange={(e) => {
              field.onChange(e.target.value)
              onAudienceChange?.()
            }}
            fullWidth
          >
            {audiences.map((a) => (
              <MenuItem key={a} value={a}>
                {AUDIENCE_LABEL[a]}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <Controller
        name={targetsName}
        control={control}
        render={({ field, fieldState }) => {
          const error = fieldState.error?.message
          if (audience === 'ALL') {
            return (
              <Typography variant="body2" color="text.secondary" sx={{ pt: 2 }}>
                Mọi cư dân đang ở của tòa.
              </Typography>
            )
          }
          if (audience === 'FLOOR') {
            return (
              <FloorSelect
                floors={floors}
                value={(field.value as PickItem[]) ?? []}
                onChange={field.onChange}
                error={error}
                disabled={disabled}
              />
            )
          }
          return audience === 'APARTMENT' ? (
            <AsyncMultiPicker
              key="apartment"
              queryKey={['audience-apartments', buildingId]}
              search={async (keyword) =>
                (await apartmentApi.options(keyword, buildingId ?? undefined)).map((a) => ({ value: String(a.id), label: a.code }))
              }
              value={(field.value as PickItem[]) ?? []}
              onChange={field.onChange}
              label="Căn hộ"
              placeholder="Gõ mã căn hộ"
              error={error}
              disabled={disabled}
            />
          ) : (
            <AsyncMultiPicker
              key="resident"
              queryKey={['audience-residents', buildingId]}
              search={async (keyword) =>
                (await residentApi.list({ keyword, size: 20, residenceStatus: 'LIVING' })).content.map((r) => ({
                  value: String(r.id),
                  label: r.fullName,
                }))
              }
              value={(field.value as PickItem[]) ?? []}
              onChange={field.onChange}
              label="Cư dân"
              placeholder="Gõ tên hoặc số điện thoại"
              error={error}
              disabled={disabled}
            />
          )
        }}
      />
      {showPreview && (
        <Typography variant="caption" sx={{ gridColumn: '1 / -1' }} color={preview.error ? 'error.main' : 'text.secondary'}>
          {preview.error
            ? (getProblem(preview.error)?.errors?.[0]?.message ?? 'Không xem trước được người nhận.')
            : preview.data
              ? `Dự kiến ${preview.data.count} cư dân nhận (${preview.data.withEmail} có email, ${preview.data.withPhone} có số điện thoại)` +
                (preview.data.sample.length ? `: ${preview.data.sample.slice(0, 5).join(', ')}${preview.data.count > 5 ? '…' : ''}` : '')
              : audience !== 'ALL' && targets.length === 0
                ? 'Chọn đối tượng để xem số người nhận.'
                : ''}
        </Typography>
      )}
    </Box>
  )
}

function FloorSelect({
  floors,
  value,
  onChange,
  error,
  disabled,
}: {
  floors: string[]
  value: PickItem[]
  onChange: (v: PickItem[]) => void
  error?: string
  disabled?: boolean
}) {
  return (
    <TextField
      select
      label="Tầng"
      fullWidth
      disabled={disabled}
      value={value.map((v) => v.value)}
      onChange={(e) => {
        const values = e.target.value as unknown as string[]
        onChange(values.map((f) => ({ value: f, label: `Tầng ${f}` })))
      }}
      error={!!error}
      helperText={error}
      slotProps={{ select: { multiple: true, renderValue: (v) => (v as string[]).map((f) => `Tầng ${f}`).join(', ') } }}
    >
      {floors.map((f) => (
        <MenuItem key={f} value={f}>
          Tầng {f}
        </MenuItem>
      ))}
    </TextField>
  )
}

import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type Ref } from 'react'
import { residentApi } from '@/features/resident/api'

export interface ResidentOption {
  id: number
  fullName: string
  phone: string
}

interface ResidentPickerProps {
  value: ResidentOption | null
  onChange: (value: ResidentOption | null) => void
  /** Có căn hộ → chỉ chọn trong cư dân đang ở căn đó; không → tìm theo tên/SĐT trong tòa. */
  apartmentId?: number
  label?: string
  error?: string
  inputRef?: Ref<HTMLInputElement>
}

/** Ô chọn cư dân (không bắt buộc), dùng ở form của module khác (vd yêu cầu hỗ trợ). */
export function ResidentPicker({ value, onChange, apartmentId, label = 'Người gửi (cư dân)', error, inputRef }: ResidentPickerProps) {
  const [input, setInput] = useState('')
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(input.trim()), 300)
    return () => clearTimeout(timer)
  }, [input])

  const { data = [], isFetching } = useQuery({
    queryKey: ['resident-options', apartmentId ?? null, apartmentId ? '' : keyword],
    staleTime: 30_000,
    queryFn: async (): Promise<ResidentOption[]> => {
      if (apartmentId) {
        const members = await residentApi.byApartment(apartmentId)
        return members
          .filter((m) => m.residenceStatus !== 'MOVED_OUT')
          .map((m) => ({ id: m.residentId, fullName: m.fullName, phone: m.phone }))
      }
      const page = await residentApi.list({ keyword, size: 20, residenceStatus: 'LIVING' })
      return page.content.map((r) => ({ id: r.id, fullName: r.fullName, phone: r.phone }))
    },
  })

  return (
    <Autocomplete
      value={value}
      options={value && !data.some((o) => o.id === value.id) ? [value, ...data] : data}
      getOptionLabel={(o) => `${o.fullName} · ${o.phone}`}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={(options, state) =>
        apartmentId
          ? options.filter((o) => `${o.fullName} ${o.phone}`.toLowerCase().includes(state.inputValue.toLowerCase()))
          : options
      }
      loading={isFetching}
      onChange={(_, v) => onChange(v)}
      onInputChange={(_, v, reason) => reason === 'input' && setInput(v)}
      noOptionsText={apartmentId ? 'Căn hộ chưa có cư dân đang ở' : 'Gõ tên hoặc số điện thoại'}
      renderInput={(params) => (
        <TextField {...params} inputRef={inputRef} label={label} error={!!error} helperText={error} />
      )}
    />
  )
}

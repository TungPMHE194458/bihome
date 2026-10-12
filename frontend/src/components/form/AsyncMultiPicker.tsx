import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export interface PickItem {
  value: string
  label: string
}

interface Props {
  /** Khoá cache react-query (vd ['apartment-pick', buildingId]). */
  queryKey: readonly unknown[]
  search: (keyword: string) => Promise<PickItem[]>
  value: PickItem[]
  onChange: (items: PickItem[]) => void
  label: string
  placeholder?: string
  error?: string
  helperText?: string
  disabled?: boolean
}

/** Chọn nhiều giá trị, tìm trên server khi gõ (căn hộ, cư dân...). */
export function AsyncMultiPicker({ queryKey, search, value, onChange, label, placeholder, error, helperText, disabled }: Props) {
  const [input, setInput] = useState('')
  const [keyword, setKeyword] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setKeyword(input.trim()), 300)
    return () => clearTimeout(t)
  }, [input])
  const { data = [], isFetching } = useQuery({
    queryKey: [...queryKey, keyword],
    queryFn: () => search(keyword),
    staleTime: 30_000,
    enabled: !disabled,
  })
  return (
    <Autocomplete
      multiple
      disabled={disabled}
      options={data}
      value={value}
      filterOptions={(x) => x}
      filterSelectedOptions
      loading={isFetching}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      onChange={(_, v) => onChange(v)}
      onInputChange={(_, v, reason) => reason === 'input' && setInput(v)}
      noOptionsText="Không có kết quả"
      renderInput={(p) => (
        <TextField {...p} label={label} placeholder={value.length ? undefined : placeholder} error={!!error} helperText={error ?? helperText} />
      )}
    />
  )
}

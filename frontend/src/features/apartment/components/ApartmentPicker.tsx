import Autocomplete from '@mui/material/Autocomplete'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { Ref } from 'react'
import { apartmentApi } from '@/features/apartment/api'
import type { ApartmentOption } from '@/features/apartment/types'

interface ApartmentPickerProps {
  value: ApartmentOption | null
  onChange: (value: ApartmentOption | null) => void
  /** Giới hạn trong một tòa (vd khi sửa hạng mục chỉ được chuyển sang căn cùng tòa). */
  buildingId?: number
  showBuilding?: boolean
  label?: string
  error?: string
  inputRef?: Ref<HTMLInputElement>
  disabled?: boolean
  /** Không bắt buộc chọn (bỏ dấu *). */
  optional?: boolean
}

/** Ô tìm căn hộ theo mã/tên (gọi /apartments/options, có debounce). */
export function ApartmentPicker({
  value,
  onChange,
  buildingId,
  showBuilding = false,
  label = 'Căn hộ',
  error,
  inputRef,
  disabled = false,
  optional = false,
}: ApartmentPickerProps) {
  const [input, setInput] = useState('')
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(input.trim()), 300)
    return () => clearTimeout(timer)
  }, [input])

  const { data = [], isFetching } = useQuery({
    queryKey: ['apartment-options', keyword, buildingId ?? null],
    queryFn: () => apartmentApi.options(keyword, buildingId),
    staleTime: 30_000,
    enabled: !disabled,
  })

  const optionLabel = (o: ApartmentOption) => (showBuilding ? `${o.name} (${o.code}) · ${o.buildingName}` : `${o.name} (${o.code})`)

  return (
    <Autocomplete
      value={value}
      disabled={disabled}
      options={value && !data.some((o) => o.id === value.id) ? [value, ...data] : data}
      getOptionLabel={optionLabel}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={(x) => x}
      loading={isFetching}
      onChange={(_, v) => onChange(v)}
      onInputChange={(_, v, reason) => reason === 'input' && setInput(v)}
      noOptionsText={keyword ? 'Không tìm thấy căn hộ' : 'Gõ mã hoặc tên căn hộ'}
      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={inputRef}
          label={label}
          required={!optional}
          error={!!error}
          helperText={error}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {isFetching ? <CircularProgress size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  )
}

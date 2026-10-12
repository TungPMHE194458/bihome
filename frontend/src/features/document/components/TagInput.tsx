import Autocomplete from '@mui/material/Autocomplete'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import { useEffect, useState, type Ref } from 'react'
import { useTagSuggestions } from '@/features/document/hooks'
import { normalizeTags } from '@/features/document/schema'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  error?: string
  inputRef?: Ref<HTMLInputElement>
}

/** Nhập nhiều thẻ: gõ rồi Enter để thêm, có gợi ý thẻ đã dùng trong tòa. */
export function TagInput({ value, onChange, error, inputRef }: TagInputProps) {
  const [input, setInput] = useState('')
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(input.trim()), 300)
    return () => clearTimeout(timer)
  }, [input])

  const { data: suggestions = [] } = useTagSuggestions(keyword)
  const lower = new Set(value.map((t) => t.toLowerCase()))

  return (
    <Autocomplete
      multiple
      freeSolo
      options={suggestions.filter((s) => !lower.has(s.toLowerCase()))}
      value={value}
      inputValue={input}
      onInputChange={(_, v, reason) => reason !== 'reset' && setInput(v)}
      onChange={(_, v) => {
        onChange(normalizeTags(v as string[]))
        setInput('')
      }}
      filterOptions={(x) => x}
      renderValue={(tags, getItemProps) =>
        tags.map((tag, index) => {
          const { key, ...props } = getItemProps({ index })
          return <Chip key={key} size="small" label={tag} {...props} />
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={inputRef}
          label="Thẻ"
          placeholder={value.length ? '' : 'Gõ thẻ rồi nhấn Enter'}
          error={!!error}
          helperText={error ?? 'Tối đa 10 thẻ, mỗi thẻ tối đa 50 ký tự'}
        />
      )}
    />
  )
}

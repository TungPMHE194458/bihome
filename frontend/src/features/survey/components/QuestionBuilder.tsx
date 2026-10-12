import AddIcon from '@mui/icons-material/Add'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { QUESTION_TYPE, hasOptions } from '@/features/survey/constants'
import { move, newKey, newQuestion, type QuestionDraft } from '@/features/survey/schema'
import type { QuestionType } from '@/features/survey/types'

export interface QuestionErrors {
  content?: string
  options?: string
}

interface Props {
  value: QuestionDraft[]
  onChange: (questions: QuestionDraft[]) => void
  errors?: Record<number, QuestionErrors>
  /** Đã có phản hồi: chỉ xem. */
  locked?: boolean
}

/** Trình tạo câu hỏi: kéo thả (hoặc nút lên / xuống) để sắp xếp, đổi loại, thêm / xoá lựa chọn. */
export function QuestionBuilder({ value, onChange, errors = {}, locked }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const update = (i: number, patch: Partial<QuestionDraft>) => onChange(value.map((q, j) => (j === i ? { ...q, ...patch } : q)))
  const changeType = (i: number, type: QuestionType) => {
    const q = value[i]
    const options = hasOptions(type)
      ? q.options.length >= 2
        ? q.options
        : [...q.options, ...Array.from({ length: 2 - q.options.length }, () => ({ key: newKey(), label: '' }))]
      : []
    update(i, { type, options })
  }

  return (
    <Stack spacing={1.5}>
      {value.map((q, i) => (
        <Paper
          key={q.key}
          variant="outlined"
          role="group"
          aria-label={`Câu ${i + 1}`}
          onDragOver={(e) => {
            if (dragIndex == null) return
            e.preventDefault()
            setOverIndex(i)
          }}
          onDrop={(e) => {
            e.preventDefault()
            if (dragIndex != null) onChange(move(value, dragIndex, i))
            setDragIndex(null)
            setOverIndex(null)
          }}
          sx={{
            p: 1.5,
            borderRadius: 2,
            borderColor: overIndex === i && dragIndex !== i ? 'primary.main' : 'divider',
            borderStyle: overIndex === i && dragIndex !== i ? 'dashed' : 'solid',
            opacity: dragIndex === i ? 0.5 : 1,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Box
              draggable={!locked}
              onDragStart={(e) => {
                setDragIndex(i)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragEnd={() => {
                setDragIndex(null)
                setOverIndex(null)
              }}
              aria-label={`Kéo để sắp xếp câu ${i + 1}`}
              sx={{ cursor: locked ? 'default' : 'grab', color: 'text.disabled', pt: 1 }}
            >
              <DragIndicatorIcon />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  label={`Câu ${i + 1}`}
                  value={q.content}
                  onChange={(e) => update(i, { content: e.target.value })}
                  disabled={locked}
                  required
                  fullWidth
                  size="small"
                  error={!!errors[i]?.content}
                  helperText={errors[i]?.content}
                  slotProps={{ htmlInput: { maxLength: 500 } }}
                />
                <TextField
                  select
                  label="Loại"
                  size="small"
                  value={q.type}
                  onChange={(e) => changeType(i, e.target.value as QuestionType)}
                  disabled={locked}
                  sx={{ minWidth: 190 }}
                >
                  {(Object.keys(QUESTION_TYPE) as QuestionType[]).map((t) => (
                    <MenuItem key={t} value={t}>
                      {QUESTION_TYPE[t]}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              {hasOptions(q.type) && (
                <Stack spacing={0.75} sx={{ mt: 1, pl: 0.5 }}>
                  {q.options.map((o, k) => (
                    <Stack key={o.key} direction="row" spacing={1} alignItems="center">
                      {q.type === 'SINGLE' ? (
                        <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
                      ) : (
                        <CheckBoxOutlineBlankIcon fontSize="small" color="disabled" />
                      )}
                      <TextField
                        variant="standard"
                        placeholder={`Lựa chọn ${k + 1}`}
                        value={o.label}
                        disabled={locked}
                        onChange={(e) =>
                          update(i, { options: q.options.map((x, j) => (j === k ? { ...x, label: e.target.value } : x)) })
                        }
                        sx={{ flex: 1 }}
                        slotProps={{ htmlInput: { maxLength: 200, 'aria-label': `Câu ${i + 1} lựa chọn ${k + 1}` } }}
                      />
                      {!locked && (
                        <>
                          <IconButton
                            size="small"
                            aria-label={`Đưa lựa chọn ${k + 1} lên`}
                            disabled={k === 0}
                            onClick={() => update(i, { options: move(q.options, k, k - 1) })}
                          >
                            <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label={`Xoá lựa chọn ${k + 1}`}
                            disabled={q.options.length <= 2}
                            onClick={() => update(i, { options: q.options.filter((_, j) => j !== k) })}
                          >
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </>
                      )}
                    </Stack>
                  ))}
                  {errors[i]?.options && <FormHelperText error>{errors[i]?.options}</FormHelperText>}
                  {!locked && q.options.length < 20 && (
                    <Box>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => update(i, { options: [...q.options, { key: newKey(), label: '' }] })}
                      >
                        Thêm lựa chọn
                      </Button>
                    </Box>
                  )}
                </Stack>
              )}
              {q.type === 'RATING' && (
                <Stack direction="row" spacing={0.25} sx={{ mt: 1, color: 'warning.main' }} aria-hidden>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <StarBorderIcon key={s} fontSize="small" />
                  ))}
                </Stack>
              )}
              {q.type === 'TEXT' && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Người trả lời nhập câu trả lời ngắn.
                </Typography>
              )}

              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
                <FormControlLabel
                  control={<Switch size="small" checked={q.required} disabled={locked} onChange={(e) => update(i, { required: e.target.checked })} />}
                  label={<Typography variant="body2">Bắt buộc</Typography>}
                />
                <Box sx={{ flex: 1 }} />
                {!locked && (
                  <>
                    <Tooltip title="Lên">
                      <span>
                        <IconButton size="small" aria-label={`Đưa câu ${i + 1} lên`} disabled={i === 0} onClick={() => onChange(move(value, i, i - 1))}>
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Xuống">
                      <span>
                        <IconButton
                          size="small"
                          aria-label={`Đưa câu ${i + 1} xuống`}
                          disabled={i === value.length - 1}
                          onClick={() => onChange(move(value, i, i + 1))}
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Nhân bản">
                      <IconButton
                        size="small"
                        aria-label={`Nhân bản câu ${i + 1}`}
                        onClick={() => {
                          const copy = { ...q, key: newKey(), id: undefined, options: q.options.map((o) => ({ ...o, key: newKey(), id: undefined })) }
                          onChange([...value.slice(0, i + 1), copy, ...value.slice(i + 1)])
                        }}
                      >
                        <ContentCopyOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xoá câu hỏi">
                      <IconButton size="small" aria-label={`Xoá câu ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Stack>
            </Box>
          </Stack>
        </Paper>
      ))}
      {!locked && value.length < 50 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {(Object.keys(QUESTION_TYPE) as QuestionType[]).map((t) => (
            <Button key={t} size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => onChange([...value, newQuestion(t)])}>
              {QUESTION_TYPE[t]}
            </Button>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

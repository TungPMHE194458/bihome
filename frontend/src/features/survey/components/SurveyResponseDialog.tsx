import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import FormHelperText from '@mui/material/FormHelperText'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Rating from '@mui/material/Rating'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useEffect, useState, type FormEvent } from 'react'
import { FormDialog } from '@/components/FormDialog'
import { ApartmentPicker } from '@/features/apartment/components/ApartmentPicker'
import type { ApartmentOption } from '@/features/apartment/types'
import { ResidentPicker, type ResidentOption } from '@/features/resident/components/ResidentPicker'
import { useSubmitResponse } from '@/features/survey/hooks'
import type { AnswerRequest, Survey } from '@/features/survey/types'
import { getErrorMessage, getProblem } from '@/lib/apiError'

type Answer = { optionIds: number[]; text: string; rating: number | null }

/** BQL nhập hộ một phản hồi (phiếu giấy / gọi điện). */
export function SurveyResponseDialog({ survey, open, onClose }: { survey: Survey; open: boolean; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar()
  const submit = useSubmitResponse()
  const [apartment, setApartment] = useState<ApartmentOption | null>(null)
  const [resident, setResident] = useState<ResidentOption | null>(null)
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setApartment(null)
    setResident(null)
    setAnswers({})
    setErrors({})
  }, [open])

  const answer = (id: number): Answer => answers[id] ?? { optionIds: [], text: '', rating: null }
  const set = (id: number, patch: Partial<Answer>) => setAnswers((a) => ({ ...a, [id]: { ...answer(id), ...patch } }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const local: Record<string, string> = {}
    if (!survey.anonymous && !apartment) local.apartmentId = 'Chọn căn hộ trả lời'
    survey.questions.forEach((q, i) => {
      const a = answer(q.id)
      const empty = q.type === 'TEXT' ? !a.text.trim() : q.type === 'RATING' ? a.rating == null : a.optionIds.length === 0
      if (q.required && empty) local[`answers[${i}]`] = 'Câu bắt buộc'
    })
    setErrors(local)
    if (Object.keys(local).length) return
    const body: AnswerRequest[] = survey.questions.map((q) => {
      const a = answer(q.id)
      return q.type === 'TEXT'
        ? { questionId: q.id, text: a.text.trim() || undefined }
        : q.type === 'RATING'
          ? { questionId: q.id, rating: a.rating ?? undefined }
          : { questionId: q.id, optionIds: a.optionIds }
    })
    try {
      await submit.mutateAsync({ id: survey.id, body: { apartmentId: apartment?.id ?? null, residentId: resident?.id ?? null, answers: body } })
      enqueueSnackbar('Đã ghi nhận phản hồi.', { variant: 'success' })
      onClose()
    } catch (err) {
      const fields = getProblem(err)?.errors
      if (fields?.length) setErrors(Object.fromEntries(fields.map((f) => [f.field, f.message])))
      else enqueueSnackbar(getErrorMessage(err), { variant: 'error' })
    }
  }

  return (
    <FormDialog
      open={open}
      title={`Nhập phản hồi · ${survey.title}`}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={submit.isPending}
      dirty={Object.keys(answers).length > 0}
      submitLabel="Ghi nhận"
      maxWidth="sm"
    >
      <Stack spacing={2}>
        {survey.anonymous ? (
          <Alert severity="info">Khảo sát ẩn danh: không ghi nhận căn hộ / cư dân của người trả lời.</Alert>
        ) : (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <ApartmentPicker value={apartment} onChange={(v) => { setApartment(v); setResident(null) }} buildingId={survey.buildingId} error={errors.apartmentId} />
            <ResidentPicker value={resident} onChange={setResident} apartmentId={apartment?.id} label="Cư dân (không bắt buộc)" error={errors.residentId} />
          </Box>
        )}
        {errors.answers && <Alert severity="error">{errors.answers}</Alert>}
        {survey.questions.map((q, i) => {
          const a = answer(q.id)
          const error = errors[`answers[${i}]`]
          return (
            <Box key={q.id} role="group" aria-label={`Câu ${i + 1}`}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                {i + 1}. {q.content}
                {q.required && <Box component="span" sx={{ color: 'error.main' }}> *</Box>}
              </Typography>
              {q.type === 'SINGLE' && (
                <RadioGroup value={a.optionIds[0] ?? ''} onChange={(e) => set(q.id, { optionIds: [Number(e.target.value)] })}>
                  {q.options.map((o) => (
                    <FormControlLabel key={o.id} value={o.id} control={<Radio size="small" />} label={o.label} />
                  ))}
                </RadioGroup>
              )}
              {q.type === 'MULTIPLE' && (
                <FormGroup>
                  {q.options.map((o) => (
                    <FormControlLabel
                      key={o.id}
                      label={o.label}
                      control={
                        <Checkbox
                          size="small"
                          checked={a.optionIds.includes(o.id)}
                          onChange={(e) =>
                            set(q.id, { optionIds: e.target.checked ? [...a.optionIds, o.id] : a.optionIds.filter((x) => x !== o.id) })
                          }
                        />
                      }
                    />
                  ))}
                </FormGroup>
              )}
              {q.type === 'TEXT' && (
                <TextField
                  value={a.text}
                  onChange={(e) => set(q.id, { text: e.target.value })}
                  fullWidth
                  size="small"
                  multiline
                  minRows={2}
                  slotProps={{ htmlInput: { maxLength: 2000, 'aria-label': `Trả lời câu ${i + 1}` } }}
                />
              )}
              {q.type === 'RATING' && <Rating value={a.rating} onChange={(_, v) => set(q.id, { rating: v })} aria-label={`Đánh giá câu ${i + 1}`} />}
              {error && <FormHelperText error>{error}</FormHelperText>}
            </Box>
          )
        })}
      </Stack>
    </FormDialog>
  )
}

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormHelperText from '@mui/material/FormHelperText'
import Typography from '@mui/material/Typography'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormCheckbox } from '@/components/form/FormCheckbox'
import { FormTextField } from '@/components/form/FormTextField'
import { AudienceFields } from '@/features/resident/components/AudienceFields'
import { QuestionBuilder, type QuestionErrors } from '@/features/survey/components/QuestionBuilder'
import { useSaveSurvey, useSurvey } from '@/features/survey/hooks'
import { emptySurvey, surveySchema, surveyToForm, surveyToRequest, type SurveyFormValues } from '@/features/survey/schema'
import type { Survey } from '@/features/survey/types'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { useBuildingStore } from '@/stores/buildingStore'

interface Props {
  open: boolean
  surveyId?: number
  onClose: () => void
  onSaved?: (survey: Survey) => void
}

const full = { gridColumn: '1 / -1' } as const
const FIELDS = ['title', 'description', 'audience', 'targets', 'startAt', 'endAt', 'anonymous', 'questions']

/** Tạo / sửa khảo sát: thông tin chung, đối tượng, thời gian, ẩn danh và trình tạo câu hỏi. */
export function SurveyFormDialog({ open, surveyId, onClose, onSaved }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = surveyId != null
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const { data: detail, isLoading, error: loadError, refetch } = useSurvey(open ? surveyId : undefined)
  const save = useSaveSurvey()
  const { control, handleSubmit, reset, setValue, setError, formState } = useForm<SurveyFormValues>({
    resolver: zodResolver(surveySchema),
    defaultValues: emptySurvey(),
  })
  const [audience, targets] = useWatch({ control, name: ['audience', 'targets'] })
  const locked = !!detail?.questionsLocked

  useEffect(() => {
    if (open) reset(editing && detail ? surveyToForm(detail) : emptySurvey())
  }, [open, editing, detail, reset])

  const questionErrors: Record<number, QuestionErrors> = {}
  const raw = formState.errors.questions
  if (Array.isArray(raw)) {
    raw.forEach((e, i) => {
      if (e) questionErrors[i] = { content: e.content?.message, options: e.options?.message ?? e.options?.root?.message }
    })
  }

  const onSubmit = handleSubmit(async (values) => {
    if (values.questions.length === 0) {
      setError('questions', { message: 'Thêm ít nhất một câu hỏi' })
      return
    }
    try {
      const saved = await save.mutateAsync({ id: surveyId, body: surveyToRequest(values, detail?.version) })
      enqueueSnackbar(editing ? 'Đã cập nhật khảo sát.' : 'Đã tạo khảo sát (nháp).', { variant: 'success' })
      onSaved?.(saved)
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError, FIELDS)) enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  })

  return (
    <FormDialog
      open={open}
      loadError={loadError}
      onRetry={() => void refetch()}
      title={editing ? 'Chỉnh sửa khảo sát' : 'Tạo khảo sát'}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
      maxWidth="md"
    >
      {editing && isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : !editing && buildingId == null ? (
        <Alert severity="warning">Vui lòng chọn một tòa nhà ở thanh trên cùng trước khi tạo khảo sát.</Alert>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {locked && (
            <Alert severity="info" sx={full}>
              Khảo sát đã có <b>{detail?.responseCount}</b> phản hồi nên không sửa được câu hỏi và chế độ ẩn danh.
            </Alert>
          )}
          <Box sx={full}>
            <FormTextField name="title" control={control} label="Tiêu đề" required slotProps={{ htmlInput: { maxLength: 200 } }} />
          </Box>
          <Box sx={full}>
            <FormTextField name="description" control={control} label="Mô tả" multiline minRows={2} />
          </Box>
          <Box sx={full}>
            <AudienceFields
              control={control}
              audienceName="audience"
              targetsName="targets"
              audience={audience}
              targets={targets}
              allowResident={false}
              onAudienceChange={() => setValue('targets', [])}
            />
          </Box>
          <FormTextField name="startAt" control={control} label="Bắt đầu" type="datetime-local" required slotProps={{ inputLabel: { shrink: true } }} />
          <FormTextField name="endAt" control={control} label="Kết thúc" type="datetime-local" required slotProps={{ inputLabel: { shrink: true } }} />
          <Box sx={full}>
            {locked ? (
              <Typography variant="body2">{detail?.anonymous ? 'Khảo sát ẩn danh' : 'Khảo sát ghi nhận người trả lời'}</Typography>
            ) : (
              <FormCheckbox name="anonymous" control={control} label="Ẩn danh (không lưu căn hộ / cư dân của người trả lời)" />
            )}
          </Box>
          <Divider sx={full} />
          <Box sx={full}>
            <Typography fontWeight={700} sx={{ mb: 1 }}>
              Câu hỏi
            </Typography>
            <Controller
              name="questions"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <QuestionBuilder value={field.value} onChange={field.onChange} errors={questionErrors} locked={locked} />
                  {fieldState.error?.message && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
                </>
              )}
            />
          </Box>
        </Box>
      )}
    </FormDialog>
  )
}

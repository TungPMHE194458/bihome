import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PlaylistAddOutlinedIcon from '@mui/icons-material/PlaylistAddOutlined'
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined'
import StarIcon from '@mui/icons-material/Star'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { BarChart } from '@mui/x-charts/BarChart'
import { PieChart } from '@mui/x-charts/PieChart'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/types'
import { ErrorState } from '@/components/ErrorState'
import { PageBreadcrumb } from '@/components/ListPage/PageBreadcrumb'
import { StatusChip } from '@/components/StatusChip'
import { surveyApi } from '@/features/survey/api'
import { SurveyFormDialog } from '@/features/survey/components/SurveyFormDialog'
import { SurveyResponseDialog } from '@/features/survey/components/SurveyResponseDialog'
import { QUESTION_TYPE, SURVEY_PHASE } from '@/features/survey/constants'
import { useSurvey, useSurveyAction, useSurveyResponses, useSurveyResults } from '@/features/survey/hooks'
import type { QuestionResult, ResponseSummary, Survey } from '@/features/survey/types'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'

const COLORS = ['#1F9D55', '#2563EB', '#F59E0B', '#DC2626', '#7C3AED', '#0891B2', '#DB2777', '#65A30D']
type TabKey = 'results' | 'responses' | 'questions'

/** Chi tiết khảo sát: kết quả theo câu (biểu đồ), danh sách phản hồi, câu hỏi; phát hành / đóng / nhập phản hồi. */
export function SurveyDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as TabKey) || 'results'
  const { data: s, isLoading, error, refetch } = useSurvey(id)
  const action = useSurveyAction()
  const canWrite = usePermission('SURVEY_WRITE')
  const canDelete = usePermission('SURVEY_DELETE')
  const canExport = usePermission('SURVEY_EXPORT')
  const [editing, setEditing] = useState(false)
  const [entering, setEntering] = useState(false)
  const [pending, setPending] = useState<'publish' | 'close' | 'delete' | null>(null)

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (isLoading || !s) return <Skeleton variant="rounded" height={420} />

  const run = async () => {
    if (!pending) return
    try {
      await action.mutateAsync({ type: pending, id: s.id, version: s.version })
      enqueueSnackbar(pending === 'publish' ? 'Đã phát hành khảo sát.' : pending === 'close' ? 'Đã đóng khảo sát.' : 'Đã xoá khảo sát.', {
        variant: 'success',
      })
      setPending(null)
      if (pending === 'delete') navigate('/surveys')
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  return (
    <Stack spacing={2}>
      <PageBreadcrumb title={s.title} parents={[{ label: 'Khảo sát ý kiến', to: '/surveys' }]} />
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" fontWeight={800}>
                {s.title}
              </Typography>
              <StatusChip {...SURVEY_PHASE[s.phase]} />
              {s.anonymous && <StatusChip label="Ẩn danh" tone="info" />}
            </Stack>
            {s.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                {s.description}
              </Typography>
            )}
            <Typography variant="body2" sx={{ mt: 1 }}>
              {formatDateTime(s.startAt)} → {formatDateTime(s.endAt)} · {s.targetLabel} · <b>{s.responseCount}</b> phản hồi
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="flex-start">
            {canWrite && s.phase === 'ACTIVE' && (
              <Button variant="contained" startIcon={<PlaylistAddOutlinedIcon />} onClick={() => setEntering(true)}>
                Nhập phản hồi
              </Button>
            )}
            {canWrite && s.status === 'DRAFT' && (
              <Button variant="contained" startIcon={<PublishOutlinedIcon />} onClick={() => setPending('publish')}>
                Phát hành
              </Button>
            )}
            {canWrite && s.status !== 'CLOSED' && (
              <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => setEditing(true)}>
                Chỉnh sửa
              </Button>
            )}
            {canWrite && s.status === 'OPEN' && (
              <Button color="warning" startIcon={<LockOutlinedIcon />} onClick={() => setPending('close')}>
                Đóng khảo sát
              </Button>
            )}
            {canExport && s.responseCount > 0 && (
              <Button
                startIcon={<DownloadOutlinedIcon />}
                onClick={() => surveyApi.exportExcel(s.id).catch((e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }))}
              >
                Xuất Excel
              </Button>
            )}
            {canDelete && s.responseCount === 0 && (
              <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setPending('delete')}>
                Xoá
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v: TabKey) => setParams(v === 'results' ? {} : { tab: v }, { replace: true })} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="results" label="Kết quả" />
          <Tab value="responses" label={`Phản hồi (${s.responseCount})`} />
          <Tab value="questions" label={`Câu hỏi (${s.questions.length})`} />
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === 'results' ? <ResultsTab survey={s} /> : tab === 'responses' ? <ResponsesTab survey={s} /> : <QuestionsTab survey={s} />}
        </Box>
      </Paper>

      <SurveyFormDialog open={editing} surveyId={s.id} onClose={() => setEditing(false)} />
      <SurveyResponseDialog survey={s} open={entering} onClose={() => setEntering(false)} />
      <ConfirmDialog
        open={!!pending}
        title={pending === 'publish' ? 'Phát hành khảo sát?' : pending === 'close' ? 'Đóng khảo sát?' : 'Xoá khảo sát?'}
        message={
          pending === 'publish'
            ? 'Khảo sát bắt đầu nhận phản hồi trong thời gian đã đặt.'
            : pending === 'close'
              ? 'Khảo sát ngừng nhận phản hồi.'
              : 'Xoá vĩnh viễn khảo sát chưa có phản hồi.'
        }
        confirmLabel={pending === 'publish' ? 'Phát hành' : pending === 'close' ? 'Đóng' : 'Xoá'}
        variant={pending === 'publish' ? undefined : 'danger'}
        loading={action.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => void run()}
      />
    </Stack>
  )
}

function ResultsTab({ survey }: { survey: Survey }) {
  const { data, isLoading, error, refetch } = useSurveyResults(survey.id)
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (isLoading || !data) return <Skeleton variant="rounded" height={260} />
  if (data.responseCount === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        Chưa có phản hồi nào.
      </Typography>
    )
  }
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
      {data.questions.map((q, i) => (
        <QuestionResultCard key={q.questionId} index={i} result={q} total={data.responseCount} />
      ))}
    </Box>
  )
}

function QuestionResultCard({ index, result: q, total }: { index: number; result: QuestionResult; total: number }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 0 }} aria-label={`Kết quả câu ${index + 1}`}>
      <Typography fontWeight={700}>
        {index + 1}. {q.content}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {QUESTION_TYPE[q.type]} · {q.answered}/{total} người trả lời
      </Typography>
      {q.type === 'SINGLE' && q.options.length > 0 && (
        <PieChart
          height={220}
          series={[
            {
              data: q.options.map((o, k) => ({ id: o.optionId, value: o.count, label: `${o.label} (${o.percent}%)`, color: COLORS[k % COLORS.length] })),
              innerRadius: 40,
              paddingAngle: 2,
              cornerRadius: 4,
            },
          ]}
        />
      )}
      {q.type === 'MULTIPLE' && (
        <BarChart
          height={Math.max(160, q.options.length * 44)}
          layout="horizontal"
          yAxis={[{ scaleType: 'band', data: q.options.map((o) => o.label), width: 120 }]}
          xAxis={[{ tickMinStep: 1 }]}
          series={[{ data: q.options.map((o) => o.count), label: 'Số lượt chọn', color: '#2563EB' }]}
        />
      )}
      {q.type === 'RATING' && (
        <Box sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1} alignItems="baseline">
            <Typography variant="h4" fontWeight={800}>
              {q.averageRating?.toLocaleString('vi-VN') ?? '—'}
            </Typography>
            <StarIcon sx={{ color: 'warning.main' }} />
            <Typography variant="body2" color="text.secondary">
              điểm trung bình
            </Typography>
          </Stack>
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const n = q.ratings?.[star - 1] ?? 0
              return (
                <Stack key={star} direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ width: 36 }}>
                    {star} sao
                  </Typography>
                  <Box sx={{ flex: 1, height: 8, bgcolor: 'grey.100', borderRadius: 4, overflow: 'hidden' }}>
                    <Box sx={{ width: q.answered ? `${(n * 100) / q.answered}%` : 0, height: '100%', bgcolor: 'warning.main' }} />
                  </Box>
                  <Typography variant="caption" sx={{ width: 24, textAlign: 'right' }}>
                    {n}
                  </Typography>
                </Stack>
              )
            })}
          </Stack>
        </Box>
      )}
      {q.type === 'TEXT' && (
        <Stack spacing={1} sx={{ mt: 1, maxHeight: 240, overflowY: 'auto' }}>
          {q.texts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Chưa có câu trả lời.
            </Typography>
          ) : (
            q.texts.map((t, k) => (
              <Paper key={k} variant="outlined" sx={{ p: 1, bgcolor: 'grey.50' }}>
                <Typography variant="body2">{t}</Typography>
              </Paper>
            ))
          )}
        </Stack>
      )}
    </Paper>
  )
}

function ResponsesTab({ survey }: { survey: Survey }) {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const { data, isLoading, error, refetch } = useSurveyResponses(survey.id, { page, size })
  const columns: Column<ResponseSummary>[] = [
    { key: 'submittedAt', header: 'Thời gian', render: (r) => formatDateTime(r.submittedAt) },
    ...(survey.anonymous
      ? []
      : [
          { key: 'apartment', header: 'Căn hộ', render: (r: ResponseSummary) => r.apartmentCode ?? '' },
          { key: 'resident', header: 'Cư dân', render: (r: ResponseSummary) => r.residentName ?? '' },
        ]),
    ...survey.questions.map((q, i) => ({
      key: `q${q.id}`,
      header: `${i + 1}. ${q.content}`,
      minWidth: 160,
      render: (r: ResponseSummary) => r.answers[i] ?? '',
    })),
    { key: 'createdBy', header: 'Người nhập', render: (r) => r.createdBy ?? '' },
  ]
  return (
    <DataTable
      columns={columns}
      rows={data?.content ?? []}
      getRowId={(r) => r.id}
      loading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      emptyMessage="Chưa có phản hồi nào"
      page={page}
      size={size}
      total={data?.totalElements ?? 0}
      onPageChange={setPage}
      onSizeChange={(v) => {
        setSize(v)
        setPage(0)
      }}
    />
  )
}

function QuestionsTab({ survey }: { survey: Survey }) {
  return (
    <Stack spacing={1.5}>
      {survey.questions.map((q, i) => (
        <Box key={q.id}>
          <Typography variant="body2" fontWeight={600}>
            {i + 1}. {q.content}
            {q.required && <Box component="span" sx={{ color: 'error.main' }}> *</Box>}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {QUESTION_TYPE[q.type]}
            {q.options.length ? ` · ${q.options.map((o) => o.label).join(' / ')}` : ''}
          </Typography>
        </Box>
      ))}
    </Stack>
  )
}

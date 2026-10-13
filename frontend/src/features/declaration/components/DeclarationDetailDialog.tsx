import CloseIcon from '@mui/icons-material/Close'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { isAxiosError } from 'axios'
import { useSnackbar } from 'notistack'
import { useEffect, useState, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { AuthImage } from '@/components/AuthImage'
import { ErrorState } from '@/components/ErrorState'
import { ReasonDialog } from '@/components/ReasonDialog'
import { StatusChip } from '@/components/StatusChip'
import { useCategoryOptions } from '@/features/asset/hooks'
import { DECLARATION_STATUS, DECLARATION_TYPE } from '@/features/declaration/constants'
import { useDeclaration, useDeclarationAction } from '@/features/declaration/hooks'
import type { ApproveRequest, Declaration } from '@/features/declaration/types'
import {
  GENDER_LABEL,
  ID_TYPE,
  ID_TYPE_OPTIONS,
  RELATIONSHIP,
  RELATIONSHIP_OPTIONS,
  RESIDENT_ROLE,
  RESIDENT_ROLE_OPTIONS,
} from '@/features/resident/constants'
import { getErrorMessage } from '@/lib/apiError'
import dayjs from '@/lib/dayjs'
import { formatDate, formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'

interface Props {
  id?: number
  onClose: () => void
}

type Draft = Omit<ApproveRequest, 'version'>

function draftOf(d: Declaration): Draft {
  return {
    fullName: d.fullName ?? '',
    phone: d.phone ?? '',
    email: d.email ?? '',
    gender: d.gender ?? null,
    dateOfBirth: d.dateOfBirth ?? '',
    idType: d.idType ?? null,
    idNumber: d.idNumber ?? '',
    role: d.role ?? null,
    relationship: d.relationship ?? null,
    moveInDate: d.moveInDate ?? '',
    categoryId: d.categoryId ?? null,
    vehicleName: d.vehicleName ?? '',
    plateNumber: d.plateNumber ?? '',
    vehicleDescription: d.vehicleDescription ?? '',
  }
}

/** Lỗi theo trường từ backend (vd phone, apartment.moveInDate, plateNumber) → trường của form duyệt. */
function fieldErrors(e: unknown): Record<string, string> {
  if (!isAxiosError(e)) return {}
  const errors = (e.response?.data as { errors?: { field: string; message: string }[] } | undefined)?.errors ?? []
  return Object.fromEntries(errors.map((x) => [x.field.replace(/^apartment\./, ''), x.message]))
}

/**
 * Chi tiết phiếu kê khai. Chờ duyệt: BQL soát / sửa thông tin (thành viên bắt buộc có SĐT duy nhất trong tòa) rồi
 * Duyệt → tạo cư dân (hoặc gắn cư dân sẵn có cùng SĐT) / tạo hạng mục xe; Từ chối bắt buộc lý do.
 */
export function DeclarationDetailDialog({ id, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const { data: d, isLoading, error, refetch } = useDeclaration(id)
  const action = useDeclarationAction()
  const canWrite = usePermission(d?.type === 'VEHICLE' ? 'ASSET_WRITE' : 'RESIDENT_WRITE')
  const categories = useCategoryOptions(d?.type === 'VEHICLE' ? d.buildingId : null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [rejecting, setRejecting] = useState(false)

  useEffect(() => {
    setDraft(d && d.status === 'PENDING' ? draftOf(d) : null)
    setErrors({})
  }, [d])

  const pending = d?.status === 'PENDING' && canWrite && draft
  const set = (k: keyof Draft, v: unknown) => {
    setDraft((x) => (x ? { ...x, [k]: v === '' ? '' : v } : x))
    setErrors((e) => ({ ...e, [k]: '' }))
  }

  const approve = async () => {
    if (!d || !draft) return
    const body: ApproveRequest = { version: d.version }
    for (const [k, v] of Object.entries(draft)) {
      ;(body as unknown as Record<string, unknown>)[k] = v === '' ? null : v
    }
    try {
      await action.mutateAsync({ type: 'approve', id: d.id, body })
      enqueueSnackbar(d.type === 'MEMBER' ? `Đã duyệt, đã thêm ${draft.fullName} vào căn ${d.apartmentCode}.`
        : `Đã duyệt, đã thêm xe vào căn ${d.apartmentCode}.`, { variant: 'success' })
      onClose()
    } catch (e) {
      const fe = fieldErrors(e)
      setErrors(fe)
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const reject = async (reason: string) => {
    if (!d) return
    try {
      await action.mutateAsync({ type: 'reject', id: d.id, reason, version: d.version })
      enqueueSnackbar(`Đã từ chối ${d.code}.`, { variant: 'success' })
      setRejecting(false)
      onClose()
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const row = (label: string, value: ReactNode) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 1, py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {value || '—'}
      </Typography>
    </Box>
  )

  const field = (k: keyof Draft, label: string, props: Partial<React.ComponentProps<typeof TextField>> = {}) => (
    <TextField
      size="small"
      label={label}
      value={(draft?.[k] as string | number | null | undefined) ?? ''}
      onChange={(e) => set(k, e.target.value)}
      error={!!errors[k]}
      helperText={errors[k]}
      fullWidth
      {...props}
    />
  )
  const date = (k: 'dateOfBirth' | 'moveInDate', label: string, disableFuture = false) => (
    <DatePicker
      label={label}
      format="DD/MM/YYYY"
      disableFuture={disableFuture}
      value={draft?.[k] ? dayjs(draft[k] as string) : null}
      onChange={(v) => set(k, v && v.isValid() ? v.format('YYYY-MM-DD') : '')}
      slotProps={{ textField: { size: 'small', fullWidth: true, error: !!errors[k], helperText: errors[k] } }}
    />
  )
  const select = (k: keyof Draft, label: string, options: { value: string | number; label: string }[], required = false) =>
    field(k, label, {
      select: true,
      required,
      children: [
        ...(required ? [] : [<MenuItem key="" value=""><em>Không chọn</em></MenuItem>]),
        ...options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        )),
      ],
    })

  return (
    <Dialog open={id != null} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 7, fontWeight: 700 }}>
        Phiếu kê khai {d?.code ?? ''}
        <IconButton aria-label="Đóng" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isLoading || !d ? (
          <Skeleton variant="rounded" height={260} />
        ) : (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <StatusChip {...DECLARATION_TYPE[d.type]} />
              <StatusChip {...DECLARATION_STATUS[d.status]} />
            </Stack>
            <Box>
              {row('Căn hộ', d.apartmentCode)}
              {row('Người gửi', [d.submittedByName, d.submittedByPhone].filter(Boolean).join(' · '))}
              {row('Gửi lúc', formatDateTime(d.createdAt))}
              {d.note && row('Ghi chú', d.note)}
              {d.reviewedAt && row(d.status === 'APPROVED' ? 'Duyệt' : 'Xử lý', `${formatDateTime(d.reviewedAt)} bởi ${d.reviewedBy ?? ''}`)}
              {d.rejectReason && row('Lý do từ chối', d.rejectReason)}
              {d.resultResidentId && row('Cư dân', <RouterLink to={`/residents/${d.resultResidentId}`}>Xem hồ sơ cư dân</RouterLink>)}
              {d.resultAssetItemId && row('Hạng mục', <RouterLink to={`/assets?tab=items&keyword=${encodeURIComponent(d.plateNumber ?? d.vehicleName ?? '')}`}>Xem hạng mục xe</RouterLink>)}
            </Box>

            {pending ? (
              <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>
                  Soát lại thông tin trước khi duyệt
                </Typography>
                {d.type === 'MEMBER' ? (
                  <>
                    {!d.phone && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Cư dân không khai số điện thoại. Hệ thống bắt buộc mỗi cư dân có SĐT riêng trong tòa — nhập SĐT trước khi duyệt.
                      </Alert>
                    )}
                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                      {d.photoUrl && (
                        <Box sx={{ gridColumn: '1 / -1' }}>
                          <AuthImage url={d.photoUrl} alt="Ảnh thành viên" sx={{ width: 96, height: 96, borderRadius: '50%' }} />
                        </Box>
                      )}
                      {field('fullName', 'Họ và tên', { required: true })}
                      {field('phone', 'Số điện thoại', { required: true })}
                      {field('email', 'Email')}
                      {select('gender', 'Giới tính', Object.entries(GENDER_LABEL).map(([value, label]) => ({ value, label })))}
                      {date('dateOfBirth', 'Ngày sinh', true)}
                      {date('moveInDate', 'Ngày chuyển đến')}
                      {select('idType', 'Loại giấy tờ', ID_TYPE_OPTIONS)}
                      {field('idNumber', 'Số giấy tờ')}
                      {select('role', 'Vai trò tại căn hộ', RESIDENT_ROLE_OPTIONS.filter((o) => o.value !== 'OWNER'), true)}
                      {select('relationship', 'Quan hệ với chủ hộ', RELATIONSHIP_OPTIONS)}
                    </Box>
                    <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
                      Nếu SĐT đã thuộc một cư dân khác trong tòa, hệ thống gắn cư dân đó vào căn thay vì tạo hồ sơ mới.
                    </Typography>
                  </>
                ) : (
                  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                    {select('categoryId', 'Danh mục', (categories.data ?? []).map((c) => ({ value: c.id, label: c.name })), true)}
                    {field('vehicleName', 'Tên xe', { required: true })}
                    {field('plateNumber', 'Biển số')}
                    {field('vehicleDescription', 'Mô tả', { multiline: true })}
                  </Box>
                )}
              </Box>
            ) : d.type === 'MEMBER' ? (
              <Box>
                {d.photoUrl && <AuthImage url={d.photoUrl} alt="Ảnh thành viên" sx={{ width: 96, height: 96, borderRadius: '50%', mb: 1 }} />}
                {row('Họ và tên', d.fullName)}
                {row('Số điện thoại', d.phone)}
                {row('Email', d.email)}
                {row('Giới tính', d.gender ? GENDER_LABEL[d.gender] : '')}
                {row('Ngày sinh', d.dateOfBirth ? formatDate(d.dateOfBirth) : '')}
                {row('Giấy tờ', d.idType ? `${ID_TYPE[d.idType]} · ${d.idNumber ?? ''}` : d.idNumber)}
                {row('Vai trò', d.role ? RESIDENT_ROLE[d.role].label : '')}
                {row('Quan hệ', d.relationship ? RELATIONSHIP[d.relationship] : '')}
                {row('Ngày chuyển đến', d.moveInDate ? formatDate(d.moveInDate) : '')}
              </Box>
            ) : (
              <Box>
                {row('Danh mục', d.categoryName)}
                {row('Tên xe', d.vehicleName)}
                {row('Biển số', d.plateNumber)}
                {row('Mô tả', d.vehicleDescription)}
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      {pending && (
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button color="error" variant="outlined" disabled={action.isPending} onClick={() => setRejecting(true)}>
            Từ chối
          </Button>
          <Button variant="contained" disabled={action.isPending} onClick={() => void approve()}>
            Duyệt
          </Button>
        </DialogActions>
      )}
      <ReasonDialog
        open={rejecting}
        title="Từ chối phiếu kê khai"
        message="Lý do được gửi về app của cư dân."
        label="Lý do từ chối"
        confirmLabel="Từ chối"
        danger
        loading={action.isPending}
        onClose={() => setRejecting(false)}
        onConfirm={(reason) => void reject(reason)}
      />
    </Dialog>
  )
}

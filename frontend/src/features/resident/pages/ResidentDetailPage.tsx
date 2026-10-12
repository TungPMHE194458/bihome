import AddHomeOutlinedIcon from '@mui/icons-material/AddHomeOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { isAxiosError } from 'axios'
import { useState, type ReactNode } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { AuthAvatar } from '@/components/AuthImage'
import { Can } from '@/components/Can'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ErrorState } from '@/components/ErrorState'
import { PageBreadcrumb } from '@/components/ListPage/PageBreadcrumb'
import { StatusChip } from '@/components/StatusChip'
import { useResidentActions } from '@/features/resident/components/useResidentActions'
import {
  APP_ACCOUNT_STATUS,
  GENDER_LABEL,
  ID_TYPE,
  RELATIONSHIP,
  RESIDENCE_STATUS,
  RESIDENT_ROLE,
} from '@/features/resident/constants'
import { useResident } from '@/features/resident/hooks'
import type { ResidentDetail, ResidentLink } from '@/features/resident/types'
import { formatDate, formatDateTime } from '@/lib/format'
import { NotFoundPage } from '@/pages/ErrorPages'
import { usePermission } from '@/stores/authStore'

const LIST = [{ label: 'Danh sách cư dân', to: '/residents' }]

export function ResidentDetailPage() {
  const navigate = useNavigate()
  const id = Number(useParams().id)
  const { data: resident, isLoading, error, refetch } = useResident(Number.isFinite(id) ? id : undefined)
  const actions = useResidentActions({ onDeleted: () => navigate('/residents', { replace: true }) })
  const canWrite = usePermission('RESIDENT_WRITE')

  if (!Number.isFinite(id) || (isAxiosError(error) && error.response?.status === 404)) return <NotFoundPage />
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (isLoading || !resident) {
    return (
      <Stack spacing={2}>
        <Skeleton width={320} height={32} />
        <Skeleton variant="rounded" height={320} />
      </Stack>
    )
  }

  const living = resident.apartments.some((l) => l.residenceStatus !== 'MOVED_OUT')
  const linkActions = (l: ResidentLink): RowAction[] =>
    canWrite
      ? [
          { label: 'Sửa cư trú', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => actions.openEditResidence(resident, l) },
          ...(l.residenceStatus !== 'MOVED_OUT'
            ? [{ label: 'Chuyển đi khỏi căn này', icon: <LogoutOutlinedIcon fontSize="small" />, onClick: () => actions.requestMoveOut(resident, l.id) }]
            : []),
        ]
      : []

  const columns: Column<ResidentLink>[] = [
    {
      key: 'apartment',
      header: 'Căn hộ',
      render: (l) => (
        <Link component={RouterLink} to={`/apartments/${l.apartmentId}?tab=residents`} underline="hover" fontWeight={600}>
          {l.apartmentName} ({l.apartmentCode})
        </Link>
      ),
    },
    {
      key: 'role',
      header: 'Vai trò',
      render: (l) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <StatusChip {...RESIDENT_ROLE[l.role]} />
          {l.householdHead && (
            <Tooltip title="Chủ hộ chính">
              <StarRoundedIcon sx={{ fontSize: 18, color: 'warning.main' }} aria-label="Chủ hộ chính" />
            </Tooltip>
          )}
        </Stack>
      ),
    },
    { key: 'relationship', header: 'Quan hệ với chủ hộ', render: (l) => (l.relationship ? RELATIONSHIP[l.relationship] : '') },
    { key: 'moveInDate', header: 'Ngày chuyển đến', render: (l) => formatDate(l.moveInDate) },
    { key: 'moveOutDate', header: 'Ngày chuyển đi', render: (l) => formatDate(l.moveOutDate) },
    { key: 'residenceStatus', header: 'Tình trạng', render: (l) => <StatusChip {...RESIDENCE_STATUS[l.residenceStatus]} /> },
    { key: 'temp', header: 'Tạm trú', render: (l) => (l.tempResidenceRegistered ? 'Có' : 'Chưa') },
  ]

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <PageBreadcrumb title={resident.fullName} parents={LIST} />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Can permission="RESIDENT_WRITE">
            <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => actions.openEdit(resident.id)}>
              Chỉnh sửa
            </Button>
            <Button variant="outlined" startIcon={<AddHomeOutlinedIcon />} onClick={() => actions.openAssign(resident)}>
              Gán căn hộ
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<LogoutOutlinedIcon />}
              disabled={!living}
              onClick={() => actions.requestMoveOut(resident)}
            >
              Chuyển đi
            </Button>
          </Can>
          <Can permission="RESIDENT_DELETE">
            <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => actions.requestDelete(resident)}>
              Xoá
            </Button>
          </Can>
        </Stack>
      </Box>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <ProfileSection resident={resident} />
      </Paper>

      <Paper variant="outlined">
        <Typography variant="subtitle1" fontWeight={700} sx={{ px: 2.5, pt: 2 }}>
          Căn hộ & lịch sử cư trú
        </Typography>
        <DataTable
          columns={columns}
          rows={resident.apartments}
          getRowId={(l) => l.id}
          rowActions={canWrite ? linkActions : undefined}
          emptyMessage="Cư dân chưa gắn với căn hộ nào"
        />
      </Paper>
      {actions.dialogs}
    </Stack>
  )
}

function ProfileSection({ resident }: { resident: ResidentDetail }) {
  const [showId, setShowId] = useState(false)
  const idValue = resident.idNumber ? (
    <Stack direction="row" alignItems="center" spacing={0.5} component="span">
      <Box component="span" sx={{ fontFamily: 'monospace' }}>
        {resident.idType ? `${ID_TYPE[resident.idType]} · ` : ''}
        {showId ? resident.idNumber : resident.idNumberMasked}
      </Box>
      <Tooltip title={showId ? 'Ẩn số giấy tờ' : 'Hiện đầy đủ'}>
        <IconButton size="small" onClick={() => setShowId((v) => !v)} aria-label={showId ? 'Ẩn số giấy tờ' : 'Hiện số giấy tờ'}>
          {showId ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Stack>
  ) : (
    '—'
  )

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '140px 1fr' } }}>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <AuthAvatar url={resident.avatarUrl} name={resident.fullName} sx={{ width: 120, height: 120, fontSize: 44, bgcolor: 'primary.main' }} />
      </Box>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h6" fontWeight={700} sx={{ mr: 1 }}>
            {resident.fullName}
          </Typography>
          <StatusChip {...RESIDENCE_STATUS[resident.residenceStatus]} />
          <StatusChip {...APP_ACCOUNT_STATUS[resident.appAccountStatus]} />
        </Stack>
        <InfoGrid
          items={[
            ['Mã cư dân', resident.code],
            [
              'Tòa nhà',
              <Link key="b" component={RouterLink} to={`/buildings/${resident.buildingId}`} underline="hover">
                {resident.buildingName}
              </Link>,
            ],
            ['Số điện thoại', resident.phone],
            ['Email', resident.email ?? '—'],
            ['Giới tính', resident.gender ? GENDER_LABEL[resident.gender] : '—'],
            ['Ngày sinh', resident.dateOfBirth ? formatDate(resident.dateOfBirth) : '—'],
            ['Giấy tờ tuỳ thân', idValue],
            ['Ngày cấp', resident.idIssueDate ? formatDate(resident.idIssueDate) : '—'],
            ['Nơi cấp', resident.idIssuePlace ?? '—'],
            ['Quốc tịch', resident.nationality ?? '—'],
          ]}
        />
        <Box>
          <Typography variant="caption" color="text.secondary">
            Ghi chú
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-line' }} color={resident.note ? 'text.primary' : 'text.secondary'}>
            {resident.note ?? 'Không có ghi chú.'}
          </Typography>
        </Box>
        <InfoGrid
          items={[
            ['Ngày tạo', `${formatDateTime(resident.createdAt)}${resident.createdBy ? ` · ${resident.createdBy}` : ''}`],
            ['Cập nhật lần cuối', `${formatDateTime(resident.updatedAt)}${resident.updatedBy ? ` · ${resident.updatedBy}` : ''}`],
          ]}
        />
      </Stack>
    </Box>
  )
}

function InfoGrid({ items }: { items: [string, ReactNode][] }) {
  return (
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
      {items.map(([label, value]) => (
        <Box key={label}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography component="div">{value}</Typography>
        </Box>
      ))}
    </Box>
  )
}

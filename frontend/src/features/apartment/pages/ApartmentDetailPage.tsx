import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined'
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined'
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { isAxiosError } from 'axios'
import { useState, type ReactNode } from 'react'
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AuthImage } from '@/components/AuthImage'
import { Can } from '@/components/Can'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageBreadcrumb } from '@/components/ListPage/PageBreadcrumb'
import { StatusChip } from '@/components/StatusChip'
import { ApartmentCardsTab } from '@/features/accesscard/components/ApartmentCardsTab'
import { ApartmentAssetsTab } from '@/features/apartment/components/ApartmentAssetsTab'
import { ApartmentResidentsTab } from '@/features/resident/components/ApartmentResidentsTab'
import { ApartmentFeeNoticesTab } from '@/features/feenotice/components/ApartmentFeeNoticesTab'
import { ApartmentTicketsTab } from '@/features/ticket/components/ApartmentTicketsTab'
import { useApartmentActions } from '@/features/apartment/components/useApartmentActions'
import { APARTMENT_STATUS, APARTMENT_TYPE, OWNERSHIP_TYPE, USAGE_STATUS } from '@/features/apartment/constants'
import { useApartment } from '@/features/apartment/hooks'
import type { ApartmentDetail } from '@/features/apartment/types'
import { formatArea, formatDateTime } from '@/lib/format'
import { NotFoundPage } from '@/pages/ErrorPages'

const LIST = [{ label: 'Danh sách căn hộ', to: '/apartments' }]

/** Tab theo SPEC 4.2. */
const TABS = [
  { key: 'info', label: 'Thông tin' },
  { key: 'residents', label: 'Cư dân' },
  { key: 'assets', label: 'Hạng mục (xe)' },
  { key: 'cards', label: 'Thẻ từ' },
  { key: 'fees', label: 'Thông báo phí' },
  { key: 'tickets', label: 'Yêu cầu hỗ trợ' },
] as const
type TabKey = (typeof TABS)[number]['key']

export function ApartmentDetailPage() {
  const navigate = useNavigate()
  const id = Number(useParams().id)
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'info'
  const { data: apartment, isLoading, error, refetch } = useApartment(Number.isFinite(id) ? id : undefined)
  const actions = useApartmentActions({ onDeleted: () => navigate('/apartments', { replace: true }) })

  if (!Number.isFinite(id) || (isAxiosError(error) && error.response?.status === 404)) return <NotFoundPage />
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (isLoading || !apartment) {
    return (
      <Stack spacing={2}>
        <Skeleton width={320} height={32} />
        <Skeleton variant="rounded" height={320} />
      </Stack>
    )
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <PageBreadcrumb title={apartment.name} parents={LIST} />
        <Stack direction="row" spacing={1}>
          <Can permission="APARTMENT_WRITE">
            <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => actions.openEdit(apartment.id)}>
              Chỉnh sửa
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={apartment.status === 'ACTIVE' ? <ToggleOffOutlinedIcon /> : <ToggleOnOutlinedIcon />}
              onClick={() => actions.requestStatusChange(apartment)}
            >
              {apartment.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt'}
            </Button>
          </Can>
          <Can permission="APARTMENT_DELETE">
            <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => actions.requestDelete(apartment)}>
              Xoá
            </Button>
          </Can>
        </Stack>
      </Box>

      <Paper variant="outlined">
        <Tabs
          value={tab}
          onChange={(_, v: TabKey) => setSearchParams(v === 'info' ? {} : { tab: v }, { replace: true })}
          variant="scrollable"
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {TABS.map((t) => (
            <Tab key={t.key} value={t.key} label={t.label} />
          ))}
        </Tabs>
        {tab === 'assets' ? (
          <ApartmentAssetsTab apartmentId={apartment.id} buildingId={apartment.buildingId} />
        ) : tab === 'residents' ? (
          <ApartmentResidentsTab apartment={apartment} />
        ) : tab === 'cards' ? (
          <ApartmentCardsTab apartment={apartment} />
        ) : tab === 'tickets' ? (
          <ApartmentTicketsTab apartmentId={apartment.id} buildingId={apartment.buildingId} />
        ) : tab === 'fees' ? (
          <ApartmentFeeNoticesTab apartmentId={apartment.id} buildingId={apartment.buildingId} />
        ) : (
          <Box sx={{ p: 2.5 }}>
            {tab === 'info' ? <InfoTab apartment={apartment} /> : <EmptyState message="Chưa có dữ liệu" />}
          </Box>
        )}
      </Paper>
      {actions.dialogs}
    </Stack>
  )
}

function InfoTab({ apartment }: { apartment: ApartmentDetail }) {
  const coverIndex = Math.max(0, apartment.images.findIndex((img) => img.cover))
  const [selected, setSelected] = useState(coverIndex)
  const current = apartment.images[selected] ?? apartment.images[0]

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1.2fr)' } }}>
      <Box>
        <AuthImage
          url={current?.url}
          alt={`Ảnh ${apartment.name}`}
          placeholder={<HomeWorkOutlinedIcon sx={{ fontSize: 64 }} />}
          sx={{ width: '100%', aspectRatio: '16 / 9', borderRadius: 2 }}
        />
        {apartment.images.length > 1 && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1, overflowX: 'auto' }}>
            {apartment.images.map((img, i) => (
              <ButtonBase
                key={img.fileId}
                aria-label={`Xem ảnh ${i + 1}`}
                onClick={() => setSelected(i)}
                sx={{ borderRadius: 1.5, overflow: 'hidden', border: 2, borderColor: i === selected ? 'primary.main' : 'transparent', flexShrink: 0 }}
              >
                <AuthImage url={img.url} alt={`Ảnh ${i + 1}`} sx={{ width: 96, height: 54 }} />
              </ButtonBase>
            ))}
          </Box>
        )}
      </Box>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h6" fontWeight={700} sx={{ mr: 1 }}>
            {apartment.name}
          </Typography>
          <StatusChip {...APARTMENT_TYPE[apartment.type]} />
          <StatusChip {...USAGE_STATUS[apartment.usageStatus]} />
          <StatusChip {...APARTMENT_STATUS[apartment.status]} />
        </Stack>
        <Grid
          items={[
            ['Mã căn hộ', apartment.code],
            [
              'Tòa nhà',
              <Link key="b" component={RouterLink} to={`/buildings/${apartment.buildingId}`} underline="hover">
                {apartment.buildingName}
              </Link>,
            ],
            ['Tầng', apartment.floorNo],
            ['Diện tích', formatArea(apartment.area)],
            ['Số phòng ngủ', apartment.bedrooms ?? '—'],
            ['Số phòng', apartment.rooms ?? '—'],
            ['Hình thức', OWNERSHIP_TYPE[apartment.ownershipType].label],
            ['Chủ sở hữu', apartment.ownerName ?? '—'],
            ['Thành viên', apartment.memberCount],
          ]}
        />
        <Box>
          <Typography variant="caption" color="text.secondary">
            Mô tả
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-line' }} color={apartment.description ? 'text.primary' : 'text.secondary'}>
            {apartment.description ?? 'Chưa có mô tả.'}
          </Typography>
        </Box>
        <Grid
          items={[
            ['Ngày tạo', `${formatDateTime(apartment.createdAt)}${apartment.createdBy ? ` · ${apartment.createdBy}` : ''}`],
            ['Cập nhật lần cuối', `${formatDateTime(apartment.updatedAt)}${apartment.updatedBy ? ` · ${apartment.updatedBy}` : ''}`],
          ]}
        />
      </Stack>
    </Box>
  )
}

function Grid({ items }: { items: [string, ReactNode][] }) {
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

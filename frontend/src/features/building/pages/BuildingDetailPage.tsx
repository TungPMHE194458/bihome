import ApartmentIcon from '@mui/icons-material/Apartment'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined'
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { isAxiosError } from 'axios'
import { useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AuthImage } from '@/components/AuthImage'
import { Can } from '@/components/Can'
import { ErrorState } from '@/components/ErrorState'
import { PageBreadcrumb } from '@/components/ListPage/PageBreadcrumb'
import { StatusChip } from '@/components/StatusChip'
import { BuildingApartmentsTab } from '@/features/building/components/BuildingApartmentsTab'
import { useBuildingActions } from '@/features/building/components/useBuildingActions'
import { BUILDING_STATUS, BUILDING_TYPE } from '@/features/building/constants'
import { useBuilding } from '@/features/building/hooks'
import type { BuildingDetail } from '@/features/building/types'
import { formatDateTime } from '@/lib/format'
import { NotFoundPage } from '@/pages/ErrorPages'

const LIST = [{ label: 'Danh sách tòa nhà', to: '/buildings' }]
type TabKey = 'info' | 'apartments'

export function BuildingDetailPage() {
  const navigate = useNavigate()
  const id = Number(useParams().id)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: TabKey = searchParams.get('tab') === 'apartments' ? 'apartments' : 'info'
  const { data: building, isLoading, error, refetch } = useBuilding(Number.isFinite(id) ? id : undefined)
  const actions = useBuildingActions({ onDeleted: () => navigate('/buildings', { replace: true }) })

  if (!Number.isFinite(id) || (isAxiosError(error) && error.response?.status === 404)) return <NotFoundPage />
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (isLoading || !building) {
    return (
      <Stack spacing={2}>
        <Skeleton width={320} height={32} />
        <Skeleton variant="rounded" height={360} />
      </Stack>
    )
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <PageBreadcrumb title={building.name} parents={LIST} />
        <Stack direction="row" spacing={1}>
          <Can permission="BUILDING_WRITE">
            <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => actions.openEdit(building.id)}>
              Chỉnh sửa
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={building.status === 'ACTIVE' ? <ToggleOffOutlinedIcon /> : <ToggleOnOutlinedIcon />}
              onClick={() => actions.requestStatusChange(building)}
            >
              {building.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt'}
            </Button>
          </Can>
          <Can permission="BUILDING_DELETE">
            <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => actions.requestDelete(building)}>
              Xoá
            </Button>
          </Can>
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.2fr) minmax(0, 1fr)' } }}>
        <Gallery building={building} />
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6" fontWeight={700} sx={{ flex: 1, minWidth: 0 }} noWrap title={building.name}>
              {building.name}
            </Typography>
            <StatusChip {...BUILDING_TYPE[building.type]} />
            <StatusChip {...BUILDING_STATUS[building.status]} />
          </Stack>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {building.fullAddress}
          </Typography>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(3, 1fr)', mb: 2 }}>
            <Stat label="Số căn hộ" value={building.apartmentCount} />
            <Stat label="Số cư dân" value={building.residentCount} />
            <Stat
              label="Tỉ lệ có người ở"
              value={
                building.apartmentCount > 0
                  ? `${Math.round((building.occupiedApartmentCount / building.apartmentCount) * 100)}%`
                  : '—'
              }
            />
          </Box>
          <InfoGrid
            items={[
              ['Mã tòa nhà', building.code],
              ['Số tầng nổi', building.floorsAbove ?? '—'],
              ['Số tầng hầm', building.floorsBelow ?? '—'],
              ['Chủ đầu tư', building.investor ?? '—'],
              ['Hotline BQL', building.hotline ?? '—'],
              ['Email BQL', building.managementEmail ?? '—'],
            ]}
          />
        </Paper>
      </Box>

      <Paper variant="outlined">
        <Tabs
          value={tab}
          onChange={(_, v: TabKey) => setSearchParams(v === 'info' ? {} : { tab: v }, { replace: true })}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="info" label="Thông tin" />
          <Tab value="apartments" label={`Căn hộ (${building.apartmentCount})`} />
        </Tabs>
        <Box sx={{ p: tab === 'info' ? 2.5 : 0 }}>
          {tab === 'info' ? (
            <Stack spacing={2}>
              <Box>
                <Typography fontWeight={600} sx={{ mb: 0.5 }}>
                  Mô tả
                </Typography>
                <Typography color={building.description ? 'text.primary' : 'text.secondary'} sx={{ whiteSpace: 'pre-line' }}>
                  {building.description ?? 'Chưa có mô tả.'}
                </Typography>
              </Box>
              <InfoGrid
                items={[
                  ['Ngày tạo', `${formatDateTime(building.createdAt)}${building.createdBy ? ` · ${building.createdBy}` : ''}`],
                  ['Cập nhật lần cuối', `${formatDateTime(building.updatedAt)}${building.updatedBy ? ` · ${building.updatedBy}` : ''}`],
                ]}
              />
            </Stack>
          ) : (
            <BuildingApartmentsTab buildingId={building.id} />
          )}
        </Box>
      </Paper>
      {actions.dialogs}
    </Stack>
  )
}

function Gallery({ building }: { building: BuildingDetail }) {
  const coverIndex = Math.max(0, building.images.findIndex((img) => img.cover))
  const [selected, setSelected] = useState(coverIndex)
  const current = building.images[selected] ?? building.images[0]

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <AuthImage
        url={current?.url}
        alt={`Ảnh ${building.name}`}
        placeholder={<ApartmentIcon sx={{ fontSize: 64 }} />}
        sx={{ width: '100%', aspectRatio: '16 / 9', borderRadius: 2 }}
      />
      {building.images.length > 1 && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1, overflowX: 'auto' }}>
          {building.images.map((img, i) => (
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
    </Paper>
  )
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light' }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700} color="primary.dark">
        {value}
      </Typography>
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
          <Typography sx={{ wordBreak: 'break-word' }}>{value}</Typography>
        </Box>
      ))}
    </Box>
  )
}

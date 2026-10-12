import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { AuthAvatar } from '@/components/AuthImage'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/types'
import { StatusChip } from '@/components/StatusChip'
import type { ApartmentDetail } from '@/features/apartment/types'
import { useResidentActions } from '@/features/resident/components/useResidentActions'
import { RELATIONSHIP, RESIDENCE_STATUS, RESIDENT_ROLE } from '@/features/resident/constants'
import { useApartmentMembers } from '@/features/resident/hooks'
import type { ApartmentMember } from '@/features/resident/types'
import { formatDate } from '@/lib/format'
import { usePermission } from '@/stores/authStore'

const columns: Column<ApartmentMember>[] = [
  {
    key: 'avatar',
    header: '',
    width: 56,
    render: (m) => <AuthAvatar url={m.avatarUrl} name={m.fullName} sx={{ width: 32, height: 32, fontSize: 13 }} />,
  },
  {
    key: 'fullName',
    header: 'Họ và tên',
    render: (m) => (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Link component={RouterLink} to={`/residents/${m.residentId}`} fontWeight={600} underline="hover" sx={{ whiteSpace: 'nowrap' }}>
          {m.fullName}
        </Link>
        {m.householdHead && (
          <Tooltip title="Chủ hộ chính">
            <StarRoundedIcon sx={{ fontSize: 18, color: 'warning.main' }} aria-label="Chủ hộ chính" />
          </Tooltip>
        )}
      </Stack>
    ),
  },
  { key: 'code', header: 'Mã cư dân' },
  { key: 'phone', header: 'Số điện thoại' },
  { key: 'role', header: 'Vai trò', render: (m) => <StatusChip {...RESIDENT_ROLE[m.role]} /> },
  { key: 'relationship', header: 'Quan hệ với chủ hộ', render: (m) => (m.relationship ? RELATIONSHIP[m.relationship] : '') },
  { key: 'moveInDate', header: 'Ngày chuyển đến', render: (m) => formatDate(m.moveInDate) },
  { key: 'moveOutDate', header: 'Ngày chuyển đi', render: (m) => formatDate(m.moveOutDate) },
  { key: 'residenceStatus', header: 'Tình trạng', render: (m) => <StatusChip {...RESIDENCE_STATUS[m.residenceStatus]} /> },
]

/** Cư dân của một căn hộ: người đang ở trước, sau đó là lịch sử đã chuyển đi. */
export function ApartmentResidentsTab({ apartment }: { apartment: ApartmentDetail }) {
  const navigate = useNavigate()
  const canRead = usePermission('RESIDENT_READ')
  const canWrite = usePermission('RESIDENT_WRITE')
  const { data = [], isLoading, error, refetch } = useApartmentMembers(apartment.id, { enabled: canRead })
  const actions = useResidentActions({ onCreated: (r) => navigate(`/residents/${r.id}`) })

  return (
    <Box>
      {canWrite && apartment.status === 'ACTIVE' && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, pt: 2 }}>
          <Button
            variant="contained"
            startIcon={<PersonAddAlt1OutlinedIcon />}
            onClick={() =>
              actions.openCreate({
                id: apartment.id,
                code: apartment.code,
                name: apartment.name,
                buildingId: apartment.buildingId,
                buildingName: apartment.buildingName,
              })
            }
          >
            Thêm cư dân
          </Button>
        </Box>
      )}
      <DataTable
        columns={columns}
        rows={data}
        getRowId={(m) => m.linkId}
        loading={canRead && isLoading}
        error={error}
        onRetry={() => void refetch()}
        rowActions={(m) => [
          { label: 'Xem cư dân', icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => navigate(`/residents/${m.residentId}`) },
        ]}
        emptyMessage={canRead ? 'Căn hộ chưa có cư dân' : 'Bạn không có quyền xem cư dân'}
      />
      {actions.dialogs}
    </Box>
  )
}

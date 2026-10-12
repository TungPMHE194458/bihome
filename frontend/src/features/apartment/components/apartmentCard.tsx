import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined'
import type { CardGridProps } from '@/components/CardGrid/CardGrid'
import { StatusChip, TONES } from '@/components/StatusChip'
import { APARTMENT_TYPE, OWNERSHIP_TYPE, USAGE_STATUS } from '@/features/apartment/constants'
import type { ApartmentSummary } from '@/features/apartment/types'
import { formatArea } from '@/lib/format'

type ApartmentCardProps = Pick<
  CardGridProps<ApartmentSummary>,
  'getId' | 'getTitle' | 'getSubtitle' | 'getImageUrl' | 'placeholderIcon' | 'renderBadge' | 'getDetails' | 'renderStatus' | 'getAccentColor'
>

/** Cách hiển thị thẻ căn hộ ở chế độ lưới, dùng chung cho Danh sách căn hộ và tab Căn hộ của tòa nhà. */
export function apartmentCardProps(showBuilding: boolean): ApartmentCardProps {
  return {
    getId: (a) => a.id,
    getTitle: (a) => a.name,
    getSubtitle: (a) => (showBuilding ? `${a.code} · ${a.buildingName}` : a.code),
    getImageUrl: (a) => a.coverImageUrl,
    placeholderIcon: <HomeWorkOutlinedIcon />,
    renderBadge: (a) => <StatusChip {...APARTMENT_TYPE[a.type]} />,
    getDetails: (a) => [
      { label: 'Tầng', value: a.floorNo },
      { label: 'Chủ sở hữu', value: a.ownerName ?? '—' },
      { label: 'Hình thức', value: <StatusChip {...OWNERSHIP_TYPE[a.ownershipType]} sx={{ height: 22 }} /> },
      { label: 'Thành viên', value: `${a.memberCount} người` },
      { label: 'Diện tích', value: formatArea(a.area) },
    ],
    renderStatus: (a) => <StatusChip {...USAGE_STATUS[a.usageStatus]} />,
    getAccentColor: (a) => (a.status === 'INACTIVE' ? TONES.neutral.fg : TONES[USAGE_STATUS[a.usageStatus].tone].fg),
  }
}

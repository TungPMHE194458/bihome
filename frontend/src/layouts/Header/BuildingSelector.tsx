import ApartmentIcon from '@mui/icons-material/Apartment'
import CheckIcon from '@mui/icons-material/Check'
import DomainIcon from '@mui/icons-material/Domain'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Popover from '@mui/material/Popover'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthAvatar } from '@/components/AuthImage'
import { useBuildingOptions } from '@/features/building/hooks'
import type { BuildingOption } from '@/features/building/types'
import { normalizeSearch } from '@/lib/format'
import { useAuthStore } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

export function BuildingSelector() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const selectedId = useBuildingStore((s) => s.selectedBuildingId)
  const setSelectedId = useBuildingStore((s) => s.setSelectedBuildingId)
  const { data: buildings = [], isLoading, isError, isSuccess } = useBuildingOptions()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [keyword, setKeyword] = useState('')

  // "Tất cả" (bỏ lọc tòa nhà) chỉ dành cho người được xem nhiều tòa.
  const canSelectAll = !!user && (user.allBuildings || user.buildingIds.length > 1)
  const selected = buildings.find((b) => b.id === selectedId)

  useEffect(() => {
    if (!isSuccess) return
    const stillValid = selectedId == null || buildings.some((b) => b.id === selectedId)
    if (!stillValid) setSelectedId(canSelectAll ? null : (buildings[0]?.id ?? null))
    else if (selectedId == null && !canSelectAll && buildings.length > 0) setSelectedId(buildings[0].id)
  }, [isSuccess, buildings, selectedId, canSelectAll, setSelectedId])

  const filtered = useMemo(() => {
    const q = normalizeSearch(keyword)
    if (!q) return buildings
    return buildings.filter((b) => normalizeSearch(`${b.code} ${b.name} ${b.address ?? ''}`).includes(q))
  }, [buildings, keyword])

  const choose = (id: number | null) => {
    setAnchor(null)
    setKeyword('')
    if (id === selectedId) return
    setSelectedId(id)
    // Dữ liệu đang hiển thị thuộc tòa cũ → tải lại theo tòa mới.
    void queryClient.invalidateQueries()
  }

  const title = selected?.name ?? (canSelectAll ? 'Tất cả tòa nhà' : 'Chưa chọn tòa nhà')
  const subtitle = selected?.address ?? (isError ? 'Chưa có dữ liệu tòa nhà' : `${buildings.length} tòa nhà`)

  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label={`Tòa nhà đang chọn: ${title}. Bấm để đổi`}
        aria-haspopup="dialog"
        sx={{ gap: 1.25, px: 1, py: 0.5, borderRadius: 2, textAlign: 'left', maxWidth: 280, '&:hover': { bgcolor: 'action.hover' } }}
      >
        <AuthAvatar variant="rounded" url={selected?.coverImageUrl} sx={{ width: 40, height: 40, bgcolor: 'primary.light', color: 'primary.dark' }}>
          <ApartmentIcon />
        </AuthAvatar>
        <Box sx={{ minWidth: 0, display: { xs: 'none', md: 'block' } }}>
          <Typography fontWeight={700} fontSize={14} noWrap>
            {title}
          </Typography>
          <Typography fontSize={12} color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        </Box>
        <KeyboardArrowDownIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      </ButtonBase>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 340, mt: 1 } } }}
      >
        <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Tìm tòa nhà..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
              htmlInput: { 'aria-label': 'Tìm tòa nhà' },
            }}
          />
        </Box>
        <List dense sx={{ maxHeight: 360, overflowY: 'auto' }}>
          {canSelectAll && !keyword && (
            <BuildingItem label="Tất cả tòa nhà" sub="Không lọc theo tòa nhà" selected={selectedId == null} onClick={() => choose(null)} icon={<DomainIcon />} />
          )}
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          )}
          {isError && <Message text="Chưa tải được danh sách tòa nhà." />}
          {isSuccess && filtered.length === 0 && <Message text={keyword ? 'Không tìm thấy tòa nhà phù hợp.' : 'Chưa có tòa nhà nào.'} />}
          {filtered.map((b: BuildingOption) => (
            <BuildingItem
              key={b.id}
              label={b.status === 'INACTIVE' ? `${b.name} (Không hoạt động)` : b.name}
              sub={b.address ?? b.code}
              selected={b.id === selectedId}
              onClick={() => choose(b.id)}
              icon={<ApartmentIcon />}
            />
          ))}
        </List>
      </Popover>
    </>
  )
}

function BuildingItem({ label, sub, selected, onClick, icon }: { label: string; sub: string; selected: boolean; onClick: () => void; icon: ReactNode }) {
  return (
    <ListItemButton selected={selected} onClick={onClick}>
      <ListItemIcon sx={{ minWidth: 36, color: selected ? 'primary.main' : 'text.secondary' }}>{icon}</ListItemIcon>
      <ListItemText
        primary={label}
        secondary={sub}
        slotProps={{ primary: { fontWeight: 600, noWrap: true }, secondary: { noWrap: true } }}
      />
      {selected && <CheckIcon fontSize="small" color="primary" />}
    </ListItemButton>
  )
}

function Message({ text }: { text: string }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
      {text}
    </Typography>
  )
}

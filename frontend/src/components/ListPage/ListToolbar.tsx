import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import TuneIcon from '@mui/icons-material/Tune'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import type { ReactNode } from 'react'
import { brand } from '@/app/theme'
import { Can } from '@/components/Can'
import { DebouncedTextField } from '@/components/DebouncedTextField'
import { ViewToggle } from '@/components/ListPage/ViewToggle'
import type { SelectOption } from '@/components/DataTable/types'
import type { ViewMode } from '@/hooks/useListParams'

interface ListToolbarProps {
  /** Chỉ truyền khi module có chế độ lưới. */
  view?: ViewMode
  onViewChange?: (view: ViewMode) => void
  onAdvancedFilter?: () => void
  /** Các ToolbarSelect (vd "Đối tượng", "Loại", "Trạng thái"). */
  filters?: ReactNode
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  /** Nút phụ cạnh "Thêm Mới" (vd Nhập/Xuất Excel). */
  actions?: ReactNode
  onAdd?: () => void
  addLabel?: string
  addPermission?: string
}

export function ListToolbar({
  view,
  onViewChange,
  onAdvancedFilter,
  filters,
  search = '',
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  actions,
  onAdd,
  addLabel = 'Thêm Mới',
  addPermission,
}: ListToolbarProps) {
  return (
    <Box
      sx={{
        bgcolor: brand.toolbar,
        borderRadius: 2,
        p: 1,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      {view && onViewChange && <ViewToggle value={view} onChange={onViewChange} />}
      {onAdvancedFilter && (
        <Tooltip title="Bộ lọc nâng cao">
          <IconButton
            aria-label="Bộ lọc nâng cao"
            onClick={onAdvancedFilter}
            sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}
          >
            <TuneIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {filters}
      <Box sx={{ flex: 1 }} />
      {onSearchChange && (
        <DebouncedTextField
          size="small"
          placeholder={searchPlaceholder}
          value={search}
          onDebouncedChange={onSearchChange}
          sx={{ bgcolor: 'background.paper', width: { xs: '100%', sm: 260 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
            htmlInput: { 'aria-label': 'Tìm kiếm' },
          }}
        />
      )}
      {actions}
      {onAdd && (
        <Can permission={addPermission}>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={onAdd} sx={{ bgcolor: 'background.paper' }}>
            {addLabel}
          </Button>
        </Can>
      )}
    </Box>
  )
}

interface ToolbarSelectProps {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  minWidth?: number
}

/** Select viền có nhãn nổi trong toolbar; giá trị rỗng = "Tất cả". */
export function ToolbarSelect({ label, value, options, onChange, minWidth = 170 }: ToolbarSelectProps) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth, bgcolor: 'background.paper' }}
    >
      <MenuItem value="">Tất cả</MenuItem>
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  )
}

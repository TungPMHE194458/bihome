import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import type { ViewMode } from '@/hooks/useListParams'

/** Chuyển Danh sách / Lưới (thẻ có hình ảnh). */
export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (view: ViewMode) => void }) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, v: ViewMode | null) => v && onChange(v)}
      aria-label="Chế độ xem"
      sx={{
        bgcolor: 'background.paper',
        '& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover': {
          color: 'primary.main',
          bgcolor: 'primary.light',
        },
      }}
    >
      <Tooltip title="Dạng danh sách">
        <ToggleButton value="list" aria-label="Dạng danh sách">
          <ViewListOutlinedIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Dạng lưới (hình ảnh)">
        <ToggleButton value="grid" aria-label="Dạng lưới">
          <GridViewOutlinedIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  )
}

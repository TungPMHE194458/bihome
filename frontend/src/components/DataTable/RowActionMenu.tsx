import MoreVertIcon from '@mui/icons-material/MoreVert'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { useState } from 'react'
import type { RowAction } from '@/components/DataTable/types'

interface RowActionMenuProps {
  actions: RowAction[]
  label?: string
}

export function RowActionMenu({ actions, label = 'Tác vụ' }: RowActionMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  if (actions.length === 0) return null

  return (
    <>
      <IconButton
        size="small"
        aria-label={label}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation()
          setAnchor(e.currentTarget)
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {actions.map((action) => (
          <MenuItem
            key={action.label}
            disabled={action.disabled}
            onClick={() => {
              setAnchor(null)
              action.onClick()
            }}
            sx={action.danger ? { color: 'error.main' } : undefined}
          >
            {action.icon && (
              <ListItemIcon sx={action.danger ? { color: 'error.main' } : undefined}>{action.icon}</ListItemIcon>
            )}
            <ListItemText>{action.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

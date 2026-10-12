import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'
import { brand, layout } from '@/app/theme'
import { isPathActive, type MenuGroup, type MenuSection } from '@/layouts/Sidebar/menuConfig'
import { useUiStore } from '@/stores/uiStore'

interface MenuPanelProps {
  sections: MenuSection[]
  pathname: string
  onNavigate?: () => void
  onCollapse: () => void
}

export function MenuPanel({ sections, pathname, onNavigate, onCollapse }: MenuPanelProps) {
  return (
    <Box
      component="nav"
      aria-label="Menu chức năng"
      sx={{ width: layout.panelWidth, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, pt: 1 }}>
        <Tooltip title="Thu gọn menu">
          <IconButton size="small" aria-label="Thu gọn menu" onClick={onCollapse}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 2 }}>
        {sections.map((section) => (
          <Box key={section.key} id={`menu-section-${section.key}`} sx={{ mb: 2, scrollMarginTop: 8 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, px: 1, py: 1 }}>{section.label}</Typography>
            <List disablePadding>
              {section.groups.map((group) => (
                <MenuGroupItem key={group.key} group={group} pathname={pathname} onNavigate={onNavigate} />
              ))}
            </List>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function MenuGroupItem({
  group,
  pathname,
  onNavigate,
}: {
  group: MenuGroup
  pathname: string
  onNavigate?: () => void
}) {
  const open = useUiStore((s) => s.openGroups.includes(group.key))
  const toggleGroup = useUiStore((s) => s.toggleGroup)
  const Icon = group.icon
  const listId = `menu-group-${group.key}`

  return (
    <>
      <ListItemButton
        onClick={() => toggleGroup(group.key)}
        aria-expanded={open}
        aria-controls={listId}
        sx={{
          borderRadius: 2,
          mb: 0.5,
          py: 0.75,
          bgcolor: open ? brand.primaryLight : 'transparent',
          color: open ? brand.primaryDark : 'text.primary',
          '&:hover': { bgcolor: open ? brand.primaryLight : 'action.hover' },
        }}
      >
        <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}>
          <Icon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary={group.label} slotProps={{ primary: { fontSize: 14, fontWeight: open ? 600 : 500 } }} />
        {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List id={listId} disablePadding sx={{ ml: 2.75, mb: 1, borderLeft: 1, borderColor: 'divider' }}>
          {group.children.map((leaf) => {
            const active = isPathActive(leaf.path, pathname)
            return (
              <ListItemButton
                key={leaf.path}
                component={RouterLink}
                to={leaf.path}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                sx={{ py: 0.5, pl: 1.5, borderRadius: 1.5, '&:hover': { bgcolor: 'action.hover' } }}
              >
                <Box
                  component="span"
                  aria-hidden
                  sx={{ mr: 1, fontSize: 18, lineHeight: 1, color: active ? 'primary.main' : 'text.disabled' }}
                >
                  •
                </Box>
                <ListItemText
                  primary={leaf.label}
                  slotProps={{
                    primary: {
                      fontSize: 13.5,
                      fontWeight: active ? 600 : 400,
                      color: active ? brand.primaryDark : 'text.primary',
                    },
                  }}
                />
              </ListItemButton>
            )
          })}
        </List>
      </Collapse>
    </>
  )
}

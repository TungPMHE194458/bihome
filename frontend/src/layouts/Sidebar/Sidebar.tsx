import MenuIcon from '@mui/icons-material/Menu'
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined'
import type { SvgIconComponent } from '@mui/icons-material'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Drawer from '@mui/material/Drawer'
import Tooltip from '@mui/material/Tooltip'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { brand, layout } from '@/app/theme'
import { findActive, MENU, type MenuSection, type SectionKey } from '@/layouts/Sidebar/menuConfig'
import { MenuPanel } from '@/layouts/Sidebar/MenuPanel'
import { hasPermission, useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'

type RailKey = 'dashboard' | SectionKey

function useVisibleSections(): MenuSection[] {
  const user = useAuthStore((s) => s.user)
  return useMemo(
    () =>
      MENU.map((section) => ({
        ...section,
        groups: section.groups
          .map((g) => ({ ...g, children: g.children.filter((l) => hasPermission(user, l.permission)) }))
          .filter((g) => g.children.length > 0),
      })).filter((s) => s.groups.length > 0),
    [user],
  )
}

export function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isSmall = useMediaQuery('(max-width:1199.95px)')
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const openGroup = useUiStore((s) => s.openGroup)
  const [mobileOpen, setMobileOpen] = useState(false)
  // Chọn mục ở icon rail chỉ đổi nội dung panel, không điều hướng; reset khi sang trang khác.
  const [railOverride, setRailOverride] = useState<{ path: string; key: SectionKey } | null>(null)

  const sections = useVisibleSections()
  const active = findActive(pathname)
  const activeGroupKey = active.group?.key

  useEffect(() => {
    if (activeGroupKey) openGroup(activeGroupKey)
  }, [activeGroupKey, openGroup])

  // Trang ngoài menu (vd Hồ sơ cá nhân) không làm sáng mục nào trên rail.
  const railKey: RailKey | null =
    railOverride?.path === pathname ? railOverride.key : pathname === '/' ? 'dashboard' : (active.section?.key ?? null)
  const panelSections = sections.filter((s) =>
    railKey === 'settings' ? s.key === 'settings' : s.key !== 'settings',
  )
  const panelOpen = isSmall ? mobileOpen : !collapsed

  const openPanel = () => {
    if (isSmall) setMobileOpen(true)
    else if (collapsed) toggleSidebar()
  }

  const selectSection = (key: SectionKey) => {
    setRailOverride({ path: pathname, key })
    openPanel()
    requestAnimationFrame(() =>
      document.getElementById(`menu-section-${key}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }),
    )
  }

  const railItems: { key: RailKey; label: string; caption: string; icon: SvgIconComponent; onClick: () => void }[] = [
    {
      key: 'dashboard',
      label: 'Bảng điều khiển',
      caption: 'Tổng quan',
      icon: SpaceDashboardOutlinedIcon,
      onClick: () => navigate('/'),
    },
    ...sections.map((s) => ({
      key: s.key,
      label: s.railLabel,
      caption: s.railLabel,
      icon: s.railIcon,
      onClick: () => selectSection(s.key),
    })),
  ]

  const panel = (
    <MenuPanel
      sections={panelSections}
      pathname={pathname}
      onNavigate={isSmall ? () => setMobileOpen(false) : undefined}
      onCollapse={() => (isSmall ? setMobileOpen(false) : toggleSidebar())}
    />
  )

  return (
    <Box sx={{ display: 'flex', flexShrink: 0, height: '100%' }}>
      <Box
        component="nav"
        aria-label="Phân hệ"
        sx={{
          width: layout.railWidth,
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 1,
          gap: 0.5,
          bgcolor: 'background.paper',
        }}
      >
        {railItems.map((item) => {
          const Icon = item.icon
          const selected = item.key === railKey
          return (
            <Tooltip key={item.key} title={item.label} placement="right">
              <ButtonBase
                onClick={item.onClick}
                aria-label={item.label}
                aria-current={selected ? 'true' : undefined}
                sx={{
                  width: 52,
                  py: 0.75,
                  borderRadius: 2,
                  flexDirection: 'column',
                  gap: 0.25,
                  bgcolor: selected ? brand.primaryLight : 'transparent',
                  color: selected ? brand.primaryDark : 'text.secondary',
                  '&:hover': { bgcolor: selected ? brand.primaryLight : 'action.hover' },
                }}
              >
                <Icon fontSize="small" />
                <Box component="span" sx={{ fontSize: 10, lineHeight: 1.2, textAlign: 'center' }}>
                  {item.caption}
                </Box>
              </ButtonBase>
            </Tooltip>
          )
        })}
        <Box sx={{ flex: 1 }} />
        <Tooltip title={panelOpen ? 'Ẩn menu' : 'Hiện menu'} placement="right">
          <ButtonBase
            aria-label={panelOpen ? 'Ẩn menu' : 'Hiện menu'}
            onClick={() => (isSmall ? setMobileOpen((o) => !o) : toggleSidebar())}
            sx={{ width: 44, height: 44, borderRadius: 2, color: 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}
          >
            <MenuIcon />
          </ButtonBase>
        </Tooltip>
      </Box>
      {isSmall ? (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          slotProps={{
            paper: {
              sx: { left: layout.railWidth, top: layout.headerHeight, height: `calc(100% - ${layout.headerHeight}px)` },
            },
          }}
        >
          {panel}
        </Drawer>
      ) : (
        panelOpen && <Box sx={{ borderRight: 1, borderColor: 'divider', height: '100%' }}>{panel}</Box>
      )}
    </Box>
  )
}

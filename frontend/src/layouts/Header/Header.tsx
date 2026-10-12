import AppsIcon from '@mui/icons-material/Apps'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import { Link as RouterLink } from 'react-router-dom'
import { layout } from '@/app/theme'
import { BiHomeLogo } from '@/components/BiHomeLogo'
import { BuildingSelector } from '@/layouts/Header/BuildingSelector'
import { NotificationButton } from '@/features/notification/components/NotificationButton'
import { SosButton } from '@/features/sos/components/SosButton'
import { ActivityHistoryButton, QuickCreateMenu } from '@/layouts/Header/HeaderActions'
import { UserMenu } from '@/layouts/Header/UserMenu'

export function Header() {
  return (
    <Box
      component="header"
      sx={{
        height: layout.headerHeight,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.5, md: 1 },
        px: { xs: 1.5, md: 2.5 },
        bgcolor: 'background.paper',
        boxShadow: '0 1px 6px rgba(15, 23, 42, 0.08)',
        zIndex: (t) => t.zIndex.appBar,
        position: 'relative',
      }}
    >
      <Box component={RouterLink} to="/" aria-label="BiHome - Trang chủ" sx={{ textDecoration: 'none', color: 'inherit', mr: { xs: 0.5, md: 2 } }}>
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <BiHomeLogo />
        </Box>
        <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
          <BiHomeLogo showTagline={false} size={32} />
        </Box>
      </Box>
      <Button
        component={RouterLink}
        to="/"
        startIcon={<AppsIcon />}
        color="inherit"
        sx={{ display: { xs: 'none', lg: 'inline-flex' }, fontWeight: 600 }}
      >
        Bảng điều khiển
      </Button>
      <Box sx={{ flex: 1 }} />
      <QuickCreateMenu />
      <NotificationButton />
      <ActivityHistoryButton />
      <Box sx={{ mx: 0.5 }}>
        <SosButton />
      </Box>
      <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 2 }} />
      <BuildingSelector />
      <UserMenu />
    </Box>
  )
}

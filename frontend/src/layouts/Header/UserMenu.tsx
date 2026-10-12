import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Divider from '@mui/material/Divider'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthAvatar } from '@/components/AuthImage'
import { logout } from '@/features/auth/session'
import { useAuthStore } from '@/stores/authStore'

export function UserMenu() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  if (!user) return null

  const name = user.profile.fullName || user.username
  const roleName = user.roles[0]?.name ?? ''

  const go = (path: string) => {
    setAnchor(null)
    navigate(path)
  }

  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="Tài khoản"
        aria-haspopup="menu"
        sx={{ gap: 1, px: 1, py: 0.5, borderRadius: 2, textAlign: 'left', '&:hover': { bgcolor: 'action.hover' } }}
      >
        <AuthAvatar url={user.profile.avatarUrl} name={name} sx={{ width: 38, height: 38, bgcolor: 'primary.main' }} />
        <Box sx={{ display: { xs: 'none', md: 'block' }, maxWidth: 160 }}>
          <Typography fontWeight={700} fontSize={14} noWrap>
            {name}
          </Typography>
          <Typography fontSize={12} color="text.secondary" noWrap>
            {roleName}
          </Typography>
        </Box>
        <KeyboardArrowDownIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      </ButtonBase>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 220, mt: 1 } } }}
      >
        <MenuItem onClick={() => go('/profile')}>
          <ListItemIcon>
            <PersonOutlineIcon fontSize="small" />
          </ListItemIcon>
          Hồ sơ cá nhân
        </MenuItem>
        <MenuItem onClick={() => go('/change-password')}>
          <ListItemIcon>
            <LockResetOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Đổi mật khẩu
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={async () => {
            setAnchor(null)
            await logout()
            navigate('/login', { replace: true })
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}>
            <LogoutOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Đăng xuất
        </MenuItem>
      </Menu>
    </>
  )
}

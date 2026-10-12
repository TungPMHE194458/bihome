import HistoryIcon from '@mui/icons-material/History'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { AuditHistoryDrawer } from '@/features/audit/components/AuditHistoryDrawer'
import { findActive } from '@/layouts/Sidebar/menuConfig'
import { moduleOfPermission } from '@/lib/modules'
import { hasPermission, useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'

interface PageBreadcrumbProps {
  title: string
  /** Các cấp trung gian giữa "Trang chủ" và trang hiện tại (vd danh sách → chi tiết). */
  parents?: { label: string; to: string }[]
  /** Mở lịch sử thay đổi riêng; bỏ trống = lịch sử của module theo mục menu đang mở (nếu có quyền xem). */
  onHistoryClick?: () => void
  showActions?: boolean
}

const roundButton = { border: 1, borderColor: 'divider', width: 30, height: 30 } as const

export function PageBreadcrumb({ title, parents = [], onHistoryClick, showActions = true }: PageBreadcrumbProps) {
  const { pathname } = useLocation()
  const pinned = useUiStore((s) => s.pinnedPages.some((p) => p.path === pathname))
  const togglePin = useUiStore((s) => s.togglePin)
  const canSeeHistory = useAuthStore((s) => hasPermission(s.user, 'AUDIT_LOG_READ'))
  const module = moduleOfPermission(findActive(pathname).leaf?.permission)
  const [historyOpen, setHistoryOpen] = useState(false)
  const openHistory = onHistoryClick ?? (canSeeHistory && module ? () => setHistoryOpen(true) : undefined)

  return (
    <Box>
      <Breadcrumbs separator="›" aria-label="Đường dẫn">
        <Link component={RouterLink} to="/" underline="hover" color="primary" fontWeight={500}>
          Trang chủ
        </Link>
        {parents.map((p) => (
          <Link key={p.to} component={RouterLink} to={p.to} underline="hover" color="primary" fontWeight={500}>
            {p.label}
          </Link>
        ))}
        <Typography color="text.primary" fontWeight={600}>
          {title}
        </Typography>
      </Breadcrumbs>
      {showActions && (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Tooltip title={pinned ? 'Bỏ ghim khỏi Truy cập nhanh' : 'Ghim vào Truy cập nhanh'}>
            <IconButton
              size="small"
              aria-label={pinned ? 'Bỏ ghim trang' : 'Ghim trang'}
              aria-pressed={pinned}
              onClick={() => togglePin({ path: pathname, title })}
              sx={{ ...roundButton, color: pinned ? 'primary.main' : 'text.secondary' }}
            >
              {pinned ? <PushPinIcon sx={{ fontSize: 16 }} /> : <PushPinOutlinedIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Lịch sử thay đổi">
            <span>
              <IconButton
                size="small"
                aria-label="Lịch sử thay đổi"
                onClick={openHistory}
                disabled={!openHistory}
                sx={{ ...roundButton, color: 'text.secondary' }}
              >
                <HistoryIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      )}
      {!onHistoryClick && module && (
        <AuditHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} module={module} title={title} />
      )}
    </Box>
  )
}

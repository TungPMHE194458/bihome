import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined'
import HistoryIcon from '@mui/icons-material/History'
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Popover from '@mui/material/Popover'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuditLogs } from '@/features/audit/api'
import { AuditTimeline } from '@/features/audit/components/AuditTimeline'
import { hasPermission, useAuthStore } from '@/stores/authStore'

const QUICK_CREATE = [
  { label: 'Cư dân', path: '/residents?create=1', permission: 'RESIDENT_WRITE', icon: <PersonAddAltOutlinedIcon fontSize="small" /> },
  { label: 'Yêu cầu hỗ trợ', path: '/tickets?create=1', permission: 'TICKET_WRITE', icon: <AssignmentOutlinedIcon fontSize="small" /> },
  { label: 'Đăng ký tiện ích', path: '/amenity-bookings?create=1', permission: 'AMENITY_BOOKING_WRITE', icon: <EventAvailableOutlinedIcon fontSize="small" /> },
  { label: 'Thông báo phí', path: '/fee-notices?create=1', permission: 'FEE_NOTICE_WRITE', icon: <ReceiptLongOutlinedIcon fontSize="small" /> },
]

export function QuickCreateMenu() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const items = QUICK_CREATE.filter((i) => hasPermission(user, i.permission))
  if (items.length === 0) return null

  return (
    <>
      <Tooltip title="Tạo nhanh">
        <IconButton aria-label="Tạo nhanh" onClick={(e) => setAnchor(e.currentTarget)}>
          <AddCircleOutlineIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {items.map((item) => (
          <MenuItem
            key={item.path}
            onClick={() => {
              setAnchor(null)
              navigate(item.path)
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

/** Hoạt động mới nhất trong phạm vi tòa đang chọn; "Xem tất cả" mở Nhật ký hoạt động. */
export function ActivityHistoryButton() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const allowed = hasPermission(user, 'AUDIT_LOG_READ')
  const { data, isLoading } = useAuditLogs({ size: 10 }, allowed && !!anchor)
  if (!allowed) return null
  return (
    <>
      <Tooltip title="Lịch sử hoạt động">
        <IconButton aria-label="Lịch sử hoạt động" onClick={(e) => setAnchor(e.currentTarget)}>
          <HistoryIcon />
        </IconButton>
      </Tooltip>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 380, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography fontWeight={700}>Lịch sử hoạt động</Typography>
        </Box>
        <Box sx={{ p: 2, maxHeight: 420, overflowY: 'auto' }}>
          {isLoading ? (
            <Typography variant="body2" color="text.secondary">
              Đang tải...
            </Typography>
          ) : data?.content.length ? (
            <AuditTimeline logs={data.content} compact />
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              Chưa có hoạt động nào.
            </Typography>
          )}
        </Box>
        <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider' }}>
          <Button
            size="small"
            onClick={() => {
              setAnchor(null)
              navigate('/settings/audit-logs')
            }}
          >
            Xem tất cả
          </Button>
        </Box>
      </Popover>
    </>
  )
}

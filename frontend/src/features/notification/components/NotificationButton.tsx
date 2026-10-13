import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined'
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import CrisisAlertIcon from '@mui/icons-material/CrisisAlert'
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import SyncAltIcon from '@mui/icons-material/SyncAlt'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import Popover from '@mui/material/Popover'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import {
  useMarkAllRead,
  useMarkRead,
  useMyNotifications,
  useUnreadCount,
  type AppNotification,
  type NotificationType,
} from '@/features/notification/api'
import { getErrorMessage } from '@/lib/apiError'
import dayjs from '@/lib/dayjs'

const ICON: Record<NotificationType, ReactNode> = {
  TICKET_CREATED: <ReportProblemOutlinedIcon fontSize="small" />,
  TICKET_ASSIGNED: <AssignmentIndOutlinedIcon fontSize="small" />,
  TICKET_STATUS: <SyncAltIcon fontSize="small" />,
  TICKET_COMMENT: <ChatBubbleOutlineIcon fontSize="small" />,
  ANNOUNCEMENT: <CampaignOutlinedIcon fontSize="small" />,
  BOOKING_PENDING: <EventAvailableOutlinedIcon fontSize="small" />,
  PAYMENT_RECEIVED: <PaymentsOutlinedIcon fontSize="small" />,
  SOS_ALERT: <CrisisAlertIcon fontSize="small" color="error" />,
  DECLARATION: <AssignmentTurnedInOutlinedIcon fontSize="small" />,
  SYSTEM: <NotificationsNoneOutlinedIcon fontSize="small" />,
}

/** "5 phút trước" — dưới 1 ngày; còn lại hiện ngày giờ. */
function when(value: string) {
  const d = dayjs(value)
  return dayjs().diff(d, 'hour') < 24 ? d.fromNow() : d.format('DD/MM/YYYY HH:mm')
}

/** Chuông thông báo trên header: badge số chưa đọc (hỏi lại mỗi 30 giây), danh sách mới nhất, đánh dấu đã đọc. */
export function NotificationButton() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const { data: unread = 0 } = useUnreadCount()
  const { data, isLoading } = useMyNotifications({ size: 10, ...(unreadOnly ? { unreadOnly: 'true' } : {}) }, !!anchor)
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()

  const open = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id, { onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }) })
    setAnchor(null)
    if (n.link) navigate(n.link)
  }

  return (
    <>
      <Tooltip title="Thông báo">
        <IconButton aria-label={unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'} onClick={(e) => setAnchor(e.currentTarget)}>
          <Badge color="error" badgeContent={unread} max={99} invisible={unread === 0}>
            <NotificationsNoneOutlinedIcon />
          </Badge>
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
        <Stack direction="row" alignItems="center" sx={{ px: 2, pt: 1.5 }}>
          <Typography fontWeight={700} sx={{ flex: 1 }}>
            Thông báo
          </Typography>
          <Button size="small" startIcon={<DoneAllIcon />} disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate(undefined, { onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }) })}>
            Đánh dấu đã đọc
          </Button>
        </Stack>
        <Tabs value={unreadOnly ? 1 : 0} onChange={(_, v: number) => setUnreadOnly(v === 1)} sx={{ px: 1, minHeight: 36 }}>
          <Tab label="Tất cả" sx={{ minHeight: 36 }} />
          <Tab label={`Chưa đọc${unread ? ` (${unread})` : ''}`} sx={{ minHeight: 36 }} />
        </Tabs>
        <Box sx={{ maxHeight: 420, overflowY: 'auto', borderTop: 1, borderColor: 'divider' }}>
          {isLoading ? (
            <Box sx={{ p: 2 }}>
              <Skeleton height={44} />
              <Skeleton height={44} />
            </Box>
          ) : !data?.content.length ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 4, textAlign: 'center' }}>
              {unreadOnly ? 'Không có thông báo chưa đọc.' : 'Chưa có thông báo nào.'}
            </Typography>
          ) : (
            <List disablePadding aria-label="Danh sách thông báo">
              {data.content.map((n) => (
                <ListItemButton
                  key={n.id}
                  onClick={() => open(n)}
                  sx={{ alignItems: 'flex-start', gap: 1.5, py: 1.25, bgcolor: n.read ? undefined : 'rgba(22, 163, 74, 0.06)' }}
                >
                  <Box sx={{ color: n.read ? 'text.secondary' : 'primary.main', mt: 0.25 }}>{ICON[n.type]}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={n.read ? 400 : 700}>
                      {n.title}
                    </Typography>
                    {n.body && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {n.body}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.disabled" component="div">
                      {when(n.createdAt)}
                    </Typography>
                  </Box>
                  {!n.read && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.75 }} />}
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  )
}

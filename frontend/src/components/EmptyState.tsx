import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  message?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({
  message = 'Không có dữ liệu',
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <Box sx={{ py: 6, px: 2, textAlign: 'center', color: 'text.secondary' }}>
      <Box sx={{ fontSize: 48, lineHeight: 1, mb: 1, color: 'grey.400' }}>
        {icon ?? <InboxOutlinedIcon fontSize="inherit" />}
      </Box>
      <Typography fontWeight={600} color="text.primary">
        {message}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  )
}

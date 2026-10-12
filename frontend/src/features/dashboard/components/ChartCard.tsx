import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

/** Khung biểu đồ: tiêu đề + phụ đề + nội dung (hoặc trạng thái trống). */
export function ChartCard({
  title,
  subtitle,
  action,
  empty,
  children,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  /** Có nội dung = hiện thông báo trống thay cho biểu đồ. */
  empty?: string
  children?: ReactNode
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={700}>{title}</Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      {empty ? (
        <Box sx={{ height: 240, display: 'grid', placeItems: 'center', textAlign: 'center', px: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {empty}
          </Typography>
        </Box>
      ) : (
        children
      )}
    </Paper>
  )
}

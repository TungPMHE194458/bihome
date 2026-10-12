import Box from '@mui/material/Box'
import CardActionArea from '@mui/material/CardActionArea'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'

interface Props {
  icon: ReactNode
  /** Màu nền nhạt của ô biểu tượng. */
  color: string
  label: string
  /** null = module chưa có dữ liệu → "—". */
  value: ReactNode | null
  hint?: ReactNode
  to?: string
  loading?: boolean
}

/** Thẻ chỉ số trên bảng điều khiển; bấm để mở danh sách liên quan. */
export function KpiCard({ icon, color, label, value, hint, to, loading }: Props) {
  const content = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          bgcolor: `${color}1F`,
          color,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" component="div" noWrap>
          {label}
        </Typography>
        {loading ? (
          <Skeleton width={80} height={30} />
        ) : (
          <Typography variant="h6" fontWeight={800} lineHeight={1.3} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {value ?? '—'}
          </Typography>
        )}
        {hint && (
          <Typography variant="caption" color="text.secondary" component="div" noWrap>
            {hint}
          </Typography>
        )}
      </Box>
    </Box>
  )
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      {to ? (
        <CardActionArea component={RouterLink} to={to} aria-label={label}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Paper>
  )
}

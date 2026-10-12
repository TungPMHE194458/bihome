import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { AuditChange } from '@/features/audit/api'
import { fieldLabel, valueLabel } from '@/features/audit/constants'

/** Bảng nhỏ "Trường: cũ → mới" của một lần thay đổi. */
export function AuditChanges({ changes }: { changes: AuditChange[] }) {
  if (changes.length === 0) return null
  return (
    <Box
      component="dl"
      sx={{ m: 0, display: 'grid', gridTemplateColumns: 'minmax(90px, max-content) 1fr', columnGap: 1.5, rowGap: 0.5 }}
    >
      {changes.map((c) => (
        <Box key={c.field} sx={{ display: 'contents' }}>
          <Typography component="dt" variant="caption" color="text.secondary" sx={{ pt: '1px' }}>
            {fieldLabel(c.field)}
          </Typography>
          <Typography component="dd" variant="caption" sx={{ m: 0, wordBreak: 'break-word' }}>
            <Box component="span" sx={{ color: 'text.secondary', textDecoration: c.oldValue ? 'line-through' : undefined }}>
              {valueLabel(c.oldValue)}
            </Box>
            <ArrowRightAltIcon sx={{ fontSize: 14, mx: 0.5, verticalAlign: 'middle', color: 'text.disabled' }} />
            <Box component="span" sx={{ fontWeight: 600 }}>
              {valueLabel(c.newValue)}
            </Box>
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

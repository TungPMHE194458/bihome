import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { brand } from '@/app/theme'

interface BiHomeLogoProps {
  showTagline?: boolean
  size?: number
}

export function BiHomeMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="BiHome">
      <rect width="40" height="40" rx="10" fill={brand.primary} />
      <path d="M20 9 L31 18 V30 a1 1 0 0 1 -1 1 H10 a1 1 0 0 1 -1 -1 V18 Z" fill="#FFFFFF" />
      <rect x="16" y="21" width="8" height="10" rx="1.5" fill={brand.primary} />
      <circle cx="27" cy="13" r="2.4" fill="#BBF7D0" />
    </svg>
  )
}

export function BiHomeLogo({ showTagline = true, size = 40 }: BiHomeLogoProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <BiHomeMark size={size} />
      <Box sx={{ lineHeight: 1 }}>
        <Typography
          component="span"
          sx={{ display: 'block', fontWeight: 800, fontSize: size * 0.5, color: 'text.primary', lineHeight: 1.1 }}
        >
          Bi<Box component="span" sx={{ color: 'primary.main' }}>Home</Box>
        </Typography>
        {showTagline && (
          <Typography component="span" sx={{ display: 'block', fontSize: 11, color: 'text.secondary' }}>
            Facility Management System
          </Typography>
        )}
      </Box>
    </Box>
  )
}

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { BiHomeMark } from '@/components/BiHomeLogo'

export function FullScreenLoader() {
  return (
    <Box
      role="status"
      aria-label="Đang tải"
      sx={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}
    >
      <BiHomeMark size={56} />
      <CircularProgress size={28} />
    </Box>
  )
}

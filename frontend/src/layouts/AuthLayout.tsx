import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Outlet } from 'react-router-dom'
import { brand } from '@/app/theme'
import { BiHomeLogo } from '@/components/BiHomeLogo'

/** Minh hoạ tự vẽ: cụm tòa nhà, không dùng hình ảnh của sản phẩm khác. */
function BuildingsIllustration() {
  return (
    <svg viewBox="0 0 480 360" width="100%" role="img" aria-label="Minh hoạ khu đô thị">
      <circle cx="380" cy="70" r="36" fill="#FDE68A" />
      <rect x="40" y="120" width="110" height="200" rx="6" fill="#FFFFFF" opacity="0.95" />
      <rect x="170" y="60" width="130" height="260" rx="6" fill="#FFFFFF" />
      <rect x="320" y="150" width="110" height="170" rx="6" fill="#FFFFFF" opacity="0.9" />
      {Array.from({ length: 6 }, (_, row) =>
        Array.from({ length: 3 }, (_, col) => (
          <rect key={`a${row}${col}`} x={56 + col * 30} y={140 + row * 28} width="18" height="16" rx="2" fill={brand.primaryLight} />
        )),
      )}
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 4 }, (_, col) => (
          <rect key={`b${row}${col}`} x={186 + col * 28} y={80 + row * 28} width="16" height="16" rx="2" fill={row % 3 === 1 && col === 2 ? '#FDE68A' : brand.primaryLight} />
        )),
      )}
      {Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: 3 }, (_, col) => (
          <rect key={`c${row}${col}`} x={336 + col * 30} y={170 + row * 28} width="18" height="16" rx="2" fill={brand.primaryLight} />
        )),
      )}
      <rect x="215" y="280" width="40" height="40" rx="4" fill={brand.primary} />
      <rect x="0" y="318" width="480" height="42" fill="#14532D" opacity="0.35" />
      <circle cx="30" cy="300" r="22" fill="#4ADE80" />
      <circle cx="455" cy="296" r="26" fill="#4ADE80" />
    </svg>
  )
}

export function AuthLayout() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      <Box
        sx={{
          flex: 1.1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          px: 8,
          color: '#FFFFFF',
          background: `linear-gradient(160deg, ${brand.primary} 0%, ${brand.primaryDark} 100%)`,
        }}
      >
        <Box sx={{ maxWidth: 520, mx: 'auto', width: '100%' }}>
          <BuildingsIllustration />
          <Typography variant="h5" fontWeight={700} sx={{ mt: 4 }}>
            Quản lý vận hành tòa nhà tập trung
          </Typography>
          <Typography sx={{ mt: 1, opacity: 0.85 }}>
            Căn hộ, cư dân, tiện ích, yêu cầu hỗ trợ và thông báo phí trên cùng một nền tảng.
          </Typography>
        </Box>
      </Box>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          <Box sx={{ mb: 4 }}>
            <BiHomeLogo size={44} />
          </Box>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}

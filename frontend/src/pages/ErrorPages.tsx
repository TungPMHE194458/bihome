import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'

function ErrorScreen({ code, title, message }: { code: string; title: string; message: string }) {
  return (
    <Box sx={{ py: 10, textAlign: 'center' }}>
      <Typography sx={{ fontSize: 72, fontWeight: 800, color: 'primary.main', lineHeight: 1 }}>{code}</Typography>
      <Typography variant="h5" fontWeight={700} sx={{ mt: 2 }}>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        {message}
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Về trang chủ
      </Button>
    </Box>
  )
}

export function ForbiddenPage() {
  return (
    <ErrorScreen
      code="403"
      title="Không có quyền truy cập"
      message="Bạn không có quyền xem trang này. Vui lòng liên hệ quản trị viên nếu cần cấp quyền."
    />
  )
}

export function NotFoundPage() {
  return <ErrorScreen code="404" title="Không tìm thấy trang" message="Trang bạn tìm không tồn tại hoặc đã được di chuyển." />
}

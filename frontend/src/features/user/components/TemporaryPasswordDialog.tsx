import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'

interface Props {
  /** null = đóng. */
  value: { username: string; password: string; title: string } | null
  onClose: () => void
}

/** Mật khẩu tạm chỉ trả về một lần: hiện để người quản trị chuyển cho người dùng. */
export function TemporaryPasswordDialog({ value, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const copy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value.password)
      enqueueSnackbar('Đã sao chép mật khẩu tạm.', { variant: 'success' })
    } catch {
      enqueueSnackbar('Không sao chép được, hãy chọn và sao chép thủ công.', { variant: 'warning' })
    }
  }

  return (
    <Dialog open={!!value} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{value?.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Mật khẩu tạm của <b>{value?.username}</b>:
        </Typography>
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'grey.50' }}>
          <Typography
            data-testid="temporary-password"
            sx={{ flex: 1, fontFamily: 'monospace', fontSize: 18, fontWeight: 700, letterSpacing: 1, userSelect: 'all' }}
          >
            {value?.password}
          </Typography>
          <Tooltip title="Sao chép">
            <IconButton aria-label="Sao chép mật khẩu tạm" onClick={() => void copy()}>
              <ContentCopyOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>
        <Alert severity="info" sx={{ mt: 2 }}>
          Mật khẩu chỉ hiện một lần. Người dùng phải đổi mật khẩu ở lần đăng nhập đầu tiên.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          Đã ghi lại
        </Button>
      </DialogActions>
    </Dialog>
  )
}

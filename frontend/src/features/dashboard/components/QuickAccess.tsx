import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { useUiStore } from '@/stores/uiStore'

/** "Truy cập nhanh": các trang đã ghim (📌) ở breadcrumb. */
export function QuickAccess() {
  const pinned = useUiStore((s) => s.pinnedPages)
  const togglePin = useUiStore((s) => s.togglePin)
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography fontWeight={700} sx={{ mb: 1.5 }}>
        Truy cập nhanh
      </Typography>
      {pinned.length === 0 ? (
        <EmptyState
          icon={<PushPinOutlinedIcon fontSize="inherit" />}
          message="Chưa có trang nào được ghim"
          description="Bấm biểu tượng ghim dưới tiêu đề của trang danh sách để thêm vào đây."
        />
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
          {pinned.map((page) => (
            <Card key={page.path} variant="outlined" sx={{ display: 'flex', alignItems: 'center' }}>
              <CardActionArea component={RouterLink} to={page.path} sx={{ p: 2, flex: 1 }}>
                <Typography fontWeight={600}>{page.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {page.path}
                </Typography>
              </CardActionArea>
              <Tooltip title="Bỏ ghim">
                <IconButton aria-label={`Bỏ ghim ${page.title}`} onClick={() => togglePin(page)} sx={{ mr: 1 }}>
                  <PushPinOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Card>
          ))}
        </Box>
      )}
    </Paper>
  )
}

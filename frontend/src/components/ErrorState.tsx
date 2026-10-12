import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import Button from '@mui/material/Button'
import { EmptyState } from '@/components/EmptyState'
import { getErrorMessage } from '@/lib/apiError'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <EmptyState
      icon={<ErrorOutlineIcon fontSize="inherit" color="error" />}
      message="Không tải được dữ liệu"
      description={getErrorMessage(error)}
      action={
        onRetry && (
          <Button variant="outlined" onClick={onRetry}>
            Thử lại
          </Button>
        )
      }
    />
  )
}

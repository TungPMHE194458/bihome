import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import { useMatches } from 'react-router-dom'
import type { RouteHandle } from '@/app/routeHandle'
import { EmptyState } from '@/components/EmptyState'
import { PageBreadcrumb } from '@/components/ListPage/PageBreadcrumb'

export function UnderConstructionPage() {
  const matches = useMatches()
  const title = (matches[matches.length - 1]?.handle as RouteHandle | undefined)?.title ?? 'Chức năng'
  return (
    <Stack spacing={2}>
      <PageBreadcrumb title={title} />
      <Paper variant="outlined">
        <EmptyState
          icon={<ConstructionOutlinedIcon fontSize="inherit" />}
          message="Chức năng đang được phát triển"
          description={`Màn hình "${title}" sẽ sớm có mặt.`}
        />
      </Paper>
    </Stack>
  )
}

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { SurveyFormDialog } from '@/features/survey/components/SurveyFormDialog'
import { SURVEY_PHASE, SURVEY_STATUS_OPTIONS } from '@/features/survey/constants'
import { useSurveys } from '@/features/survey/hooks'
import type { Survey } from '@/features/survey/types'
import { useListParams } from '@/hooks/useListParams'
import { formatDateTime } from '@/lib/format'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = ['keyword', 'title', 'status', 'from', 'to'] as const

/** Khảo sát ý kiến cư dân. */
export function SurveyListPage() {
  const navigate = useNavigate()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useSurveys(list.apiParams)
  const allBuildings = useBuildingStore((s) => s.selectedBuildingId == null)
  const [creating, setCreating] = useState(false)

  const columns: Column<Survey>[] = [
    {
      key: 'title',
      header: 'Tiêu đề',
      sortable: true,
      filter: { type: 'text' },
      minWidth: 240,
      render: (s) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {s.title}
          </Typography>
          {s.anonymous && (
            <Typography variant="caption" color="text.secondary">
              Ẩn danh
            </Typography>
          )}
        </Box>
      ),
    },
    ...(allBuildings ? [{ key: 'buildingName', header: 'Tòa nhà', render: (s: Survey) => s.buildingName }] : []),
    { key: 'audience', header: 'Đối tượng', render: (s) => s.targetLabel },
    {
      key: 'startAt',
      header: 'Thời gian',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'from', toKey: 'to' },
      render: (s) => (
        <Box sx={{ whiteSpace: 'nowrap' }}>
          <Typography variant="body2">{formatDateTime(s.startAt)}</Typography>
          <Typography variant="caption" color="text.secondary">
            → {formatDateTime(s.endAt)}
          </Typography>
        </Box>
      ),
    },
    { key: 'questionCount', header: 'Câu hỏi', align: 'right', render: (s) => s.questionCount },
    { key: 'responseCount', header: 'Số phản hồi', align: 'right', sortable: true, render: (s) => <b>{s.responseCount}</b> },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: { type: 'select', options: SURVEY_STATUS_OPTIONS },
      render: (s) => <StatusChip {...SURVEY_PHASE[s.phase]} />,
    },
    { key: 'createdAt', header: 'Ngày tạo', sortable: true, render: (s) => formatDateTime(s.createdAt) },
  ]

  return (
    <>
      <ListPageLayout
        title="Khảo sát ý kiến"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={<ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={SURVEY_STATUS_OPTIONS} onChange={(v) => list.setFilter('status', v)} />}
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm tiêu đề, mô tả..."
            onAdd={() => setCreating(true)}
            addPermission="SURVEY_WRITE"
          />
        }
      >
        <DataTable
          columns={columns}
          rows={data?.content ?? []}
          getRowId={(s) => s.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sort={list.sort}
          onSortChange={list.setSort}
          onRowClick={(s) => navigate(`/surveys/${s.id}`)}
          emptyMessage={list.hasFilters ? 'Không có khảo sát phù hợp với bộ lọc' : 'Chưa có khảo sát nào'}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      <SurveyFormDialog open={creating} onClose={() => setCreating(false)} onSaved={(s) => navigate(`/surveys/${s.id}`)} />
    </>
  )
}

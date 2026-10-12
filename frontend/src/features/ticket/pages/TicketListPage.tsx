import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined'
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Rating from '@mui/material/Rating'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useMemo } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { TicketBoard } from '@/features/ticket/components/TicketBoard'
import { useTicketActions } from '@/features/ticket/components/useTicketActions'
import {
  CHANNEL_OPTIONS,
  NEXT_STATUSES,
  PRIORITY_OPTIONS,
  STATUS_ACTION,
  STATUS_OPTIONS,
  TICKET_CHANNEL,
  TICKET_PRIORITY,
  TICKET_STATUS,
  isFinal,
} from '@/features/ticket/constants'
import { useAssignees, useTicketBoard, useTicketCategoryOptions, useTickets } from '@/features/ticket/hooks'
import type { TicketSummary } from '@/features/ticket/types'
import { useListParams } from '@/hooks/useListParams'
import { formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = [
  'keyword',
  'code',
  'title',
  'categoryId',
  'apartment',
  'priority',
  'channel',
  'assigneeId',
  'status',
  'overdue',
  'createdFrom',
  'createdTo',
  'updatedFrom',
  'updatedTo',
] as const

export function TicketListPage() {
  const navigate = useNavigate()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const kanban = list.view === 'grid'
  const { data, isLoading, error, refetch } = useTickets(list.apiParams, !kanban)
  // Kanban: mỗi cột là một trạng thái nên bỏ lọc trạng thái và phân trang.
  const boardParams = useMemo(() => {
    const p: Record<string, string | number> = { ...list.apiParams }
    for (const k of ['status', 'page', 'size', 'sort']) delete p[k]
    return p
  }, [list.apiParams])
  const board = useTicketBoard(boardParams, kanban)
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const { data: categories = [] } = useTicketCategoryOptions()
  const { data: assignees = [] } = useAssignees(buildingId)
  const actions = useTicketActions({ onCreated: (t) => navigate(`/tickets/${t.ticket.id}`) })
  const canWrite = usePermission('TICKET_WRITE')
  const canDelete = usePermission('TICKET_DELETE')
  const allBuildings = buildingId == null

  const rowActions = (t: TicketSummary): RowAction[] => [
    { label: 'Xem chi tiết', icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => navigate(`/tickets/${t.id}`) },
    ...(canWrite && !isFinal(t.status)
      ? [
          { label: 'Chỉnh sửa', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => actions.openEdit(t.id) },
          { label: 'Phân công', icon: <PersonAddAltOutlinedIcon fontSize="small" />, onClick: () => actions.openAssign(t) },
          ...NEXT_STATUSES[t.status].map((to) => ({
            label: STATUS_ACTION[to],
            icon: <SwapHorizIcon fontSize="small" />,
            danger: to === 'CANCELLED',
            onClick: () => actions.openStatus(t, to),
          })),
        ]
      : []),
    ...(canDelete && (t.status === 'NEW' || t.status === 'CANCELLED')
      ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => actions.requestDelete(t) }]
      : []),
  ]

  const columns: Column<TicketSummary>[] = [
    {
      key: 'code',
      header: 'Mã yêu cầu',
      sortable: true,
      filter: { type: 'text' },
      render: (t) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Link component={RouterLink} to={`/tickets/${t.id}`} fontWeight={600} underline="hover" sx={{ whiteSpace: 'nowrap' }} color={t.overdue ? 'error.main' : 'primary.main'}>
            {t.code}
          </Link>
          {t.overdue && (
            <Tooltip title="Quá hạn SLA">
              <WarningAmberIcon sx={{ fontSize: 16, color: 'error.main' }} aria-label="Quá hạn SLA" />
            </Tooltip>
          )}
        </Stack>
      ),
    },
    { key: 'title', header: 'Tiêu đề', sortable: true, filter: { type: 'text' }, minWidth: 200, render: (t) => t.title },
    {
      key: 'categoryId',
      header: 'Danh mục',
      filter: { type: 'select', options: categories.map((c) => ({ value: c.id.toString(), label: c.name })) },
      render: (t) => t.categoryName,
    },
    ...(allBuildings ? [{ key: 'buildingName', header: 'Tòa nhà', minWidth: 140, render: (t: TicketSummary) => t.buildingName }] : []),
    { key: 'apartment', header: 'Căn hộ', filter: { type: 'text' }, render: (t) => t.apartmentCode ?? '' },
    {
      key: 'resident',
      header: 'Người gửi',
      minWidth: 140,
      render: (t) =>
        t.residentName ? (
          <Box>
            <Typography variant="body2">{t.residentName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t.residentPhone}
            </Typography>
          </Box>
        ) : (
          ''
        ),
    },
    { key: 'channel', header: 'Kênh', filter: { type: 'select', options: CHANNEL_OPTIONS }, render: (t) => TICKET_CHANNEL[t.channel] },
    {
      key: 'priority',
      header: 'Ưu tiên',
      sortable: true,
      filter: { type: 'select', options: PRIORITY_OPTIONS },
      render: (t) => <StatusChip {...TICKET_PRIORITY[t.priority]} />,
    },
    {
      key: 'assigneeId',
      header: 'Người xử lý',
      filter: { type: 'select', options: assignees.map((a) => ({ value: a.id.toString(), label: a.fullName })) },
      minWidth: 130,
      render: (t) => t.assigneeName ?? <Typography variant="body2" color="text.secondary">Chưa phân công</Typography>,
    },
    {
      key: 'resolutionDueAt',
      header: 'Hạn xử lý',
      sortable: true,
      render: (t) => (
        <Typography variant="body2" color={t.overdue ? 'error.main' : 'text.primary'} fontWeight={t.overdue ? 600 : 400} sx={{ whiteSpace: 'nowrap' }}>
          {formatDateTime(t.resolutionDueAt)}
        </Typography>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      sortable: true,
      filter: { type: 'select', options: STATUS_OPTIONS },
      render: (t) => <StatusChip {...TICKET_STATUS[t.status]} />,
    },
    {
      key: 'rating',
      header: 'Đánh giá',
      render: (t) => (t.rating ? <Rating value={t.rating} readOnly size="small" aria-label={`${t.rating} sao`} /> : ''),
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (t) => formatDateTime(t.createdAt),
    },
    {
      key: 'updatedAt',
      header: 'Ngày cập nhật',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'updatedFrom', toKey: 'updatedTo' },
      render: (t) => formatDateTime(t.updatedAt),
    },
  ]

  const overdueOnly = list.filters.overdue === 'true'

  return (
    <>
      <ListPageLayout
        title="Yêu cầu và hỗ trợ"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={
              <>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={kanban ? 'grid' : 'list'}
                  onChange={(_, v) => v && list.setView(v)}
                  sx={{ bgcolor: 'background.paper' }}
                >
                  <ToggleButton value="list" aria-label="Dạng danh sách">
                    <TableRowsOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} /> Danh sách
                  </ToggleButton>
                  <ToggleButton value="grid" aria-label="Dạng Kanban">
                    <ViewKanbanOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} /> Kanban
                  </ToggleButton>
                </ToggleButtonGroup>
                {!kanban && (
                  <ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={STATUS_OPTIONS} onChange={(v) => list.setFilter('status', v)} />
                )}
                <ToolbarSelect label="Ưu tiên" value={list.filters.priority ?? ''} options={PRIORITY_OPTIONS} onChange={(v) => list.setFilter('priority', v)} />
                <Chip
                  icon={<WarningAmberIcon />}
                  label="Quá hạn SLA"
                  color={overdueOnly ? 'error' : 'default'}
                  variant={overdueOnly ? 'filled' : 'outlined'}
                  onClick={() => list.setFilter('overdue', overdueOnly ? '' : 'true')}
                  aria-pressed={overdueOnly}
                  sx={{ bgcolor: overdueOnly ? undefined : 'background.paper', height: 36 }}
                />
              </>
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm mã, tiêu đề, mô tả..."
            onAdd={actions.openCreate}
            addLabel="Tạo yêu cầu"
            addPermission="TICKET_WRITE"
          />
        }
      >
        {kanban ? (
          <TicketBoard
            columns={board.data}
            loading={board.isLoading}
            error={board.error}
            onRetry={() => void board.refetch()}
            onMove={(t, to) => void actions.move(t, to)}
            onOpen={(t) => navigate(`/tickets/${t.id}`)}
            canWrite={canWrite}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={data?.content ?? []}
            getRowId={(t) => t.id}
            loading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            filters={list.filters}
            onFilterChange={list.setFilter}
            sort={list.sort}
            onSortChange={list.setSort}
            rowActions={rowActions}
            highlightRow={(t) => t.overdue}
            emptyMessage={list.hasFilters ? 'Không có yêu cầu phù hợp với bộ lọc' : 'Chưa có yêu cầu nào'}
            page={list.page}
            size={list.size}
            total={data?.totalElements ?? 0}
            onPageChange={list.setPage}
            onSizeChange={list.setSize}
          />
        )}
      </ListPageLayout>
      {actions.dialogs}
    </>
  )
}

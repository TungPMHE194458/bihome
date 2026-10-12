import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { ReminderDetailDialog } from '@/features/reminder/components/ReminderDetailDialog'
import { ReminderFormDialog } from '@/features/reminder/components/ReminderFormDialog'
import {
  AUDIENCE_OPTIONS,
  CHANNEL_LABEL,
  REMINDER_STATUS,
  REMINDER_STATUS_OPTIONS,
  SCHEDULE_OPTIONS,
  scheduleText,
} from '@/features/reminder/constants'
import { useReminderAction, useReminders } from '@/features/reminder/hooks'
import type { Reminder } from '@/features/reminder/types'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = ['keyword', 'title', 'audience', 'scheduleType', 'status', 'createdFrom', 'createdTo'] as const

type Pending = { type: 'send' | 'cancel' | 'delete'; reminder: Reminder }
const CONFIRM = {
  send: { title: 'Gửi nhắc nhở ngay?', label: 'Gửi', done: 'Đã gửi nhắc nhở.' },
  cancel: { title: 'Huỷ lịch gửi?', label: 'Huỷ lịch', done: 'Đã huỷ lịch gửi.' },
  delete: { title: 'Xoá nhắc nhở?', label: 'Xoá', done: 'Đã xoá nhắc nhở.' },
} as const

/** Nhắc nhở gửi cư dân (gửi ngay, hẹn giờ, lặp hằng tháng). */
export function ReminderListPage() {
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useReminders(list.apiParams)
  const allBuildings = useBuildingStore((s) => s.selectedBuildingId == null)
  const canWrite = usePermission('REMINDER_WRITE')
  const canDelete = usePermission('REMINDER_DELETE')
  const action = useReminderAction()
  const [form, setForm] = useState<{ open: boolean; id?: number }>({ open: false })
  const [viewId, setViewId] = useState<number>()
  const [pending, setPending] = useState<Pending | null>(null)

  const rowActions = (r: Reminder): RowAction[] => {
    const editable = r.status === 'DRAFT' || r.status === 'SCHEDULED'
    return [
      { label: 'Xem chi tiết', icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => setViewId(r.id) },
      ...(canWrite && editable
        ? [
            { label: 'Chỉnh sửa', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => setForm({ open: true, id: r.id }) },
            { label: 'Gửi ngay', icon: <SendOutlinedIcon fontSize="small" />, onClick: () => setPending({ type: 'send', reminder: r }) },
            { label: 'Huỷ lịch gửi', icon: <CancelOutlinedIcon fontSize="small" />, onClick: () => setPending({ type: 'cancel', reminder: r }) },
          ]
        : []),
      ...(canDelete && (r.status === 'DRAFT' || r.status === 'CANCELLED')
        ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => setPending({ type: 'delete', reminder: r }) }]
        : []),
    ]
  }

  const columns: Column<Reminder>[] = [
    { key: 'title', header: 'Tiêu đề', sortable: true, filter: { type: 'text' }, minWidth: 220, render: (r) => <b>{r.title}</b> },
    ...(allBuildings ? [{ key: 'buildingName', header: 'Tòa nhà', render: (r: Reminder) => r.buildingName ?? '' }] : []),
    {
      key: 'audience',
      header: 'Đối tượng',
      filter: { type: 'select', options: AUDIENCE_OPTIONS },
      render: (r) => (
        <Typography variant="body2" noWrap sx={{ maxWidth: 220 }} title={r.targetLabel}>
          {r.targetLabel}
        </Typography>
      ),
    },
    { key: 'channels', header: 'Kênh', render: (r) => r.channels.map((c) => CHANNEL_LABEL[c]).join(', ') },
    {
      key: 'scheduleType',
      header: 'Lịch gửi',
      filter: { type: 'select', options: SCHEDULE_OPTIONS },
      render: (r) => (
        <Box>
          <Typography variant="body2">{scheduleText(r)}</Typography>
          {r.nextRunAt && (
            <Typography variant="caption" color="text.secondary">
              Lần tới {formatDateTime(r.nextRunAt)}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      sortable: true,
      filter: { type: 'select', options: REMINDER_STATUS_OPTIONS },
      render: (r) => <StatusChip {...REMINDER_STATUS[r.status]} />,
    },
    { key: 'recipientCount', header: 'Số người nhận', align: 'right', render: (r) => (r.runCount ? r.recipientCount : '') },
    { key: 'lastSentAt', header: 'Ngày gửi', sortable: true, render: (r) => formatDateTime(r.lastSentAt) },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (r) => formatDateTime(r.createdAt),
    },
  ]

  const confirm = pending ? CONFIRM[pending.type] : null

  return (
    <>
      <ListPageLayout
        title="Nhắc nhở"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={<ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={REMINDER_STATUS_OPTIONS} onChange={(v) => list.setFilter('status', v)} />}
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm tiêu đề..."
            onAdd={() => setForm({ open: true })}
            addPermission="REMINDER_WRITE"
          />
        }
      >
        <DataTable
          columns={columns}
          rows={data?.content ?? []}
          getRowId={(r) => r.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sort={list.sort}
          onSortChange={list.setSort}
          onRowClick={(r) => setViewId(r.id)}
          rowActions={rowActions}
          emptyMessage={list.hasFilters ? 'Không có nhắc nhở phù hợp với bộ lọc' : 'Chưa có nhắc nhở nào'}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      <ReminderFormDialog open={form.open} reminderId={form.id} onClose={() => setForm({ open: false })} />
      <ReminderDetailDialog id={viewId} onClose={() => setViewId(undefined)} />
      <ConfirmDialog
        open={!!pending}
        title={confirm?.title ?? ''}
        message={<b>{pending?.reminder.title}</b>}
        confirmLabel={confirm?.label}
        variant={pending?.type === 'send' ? undefined : 'danger'}
        loading={action.isPending}
        onClose={() => setPending(null)}
        onConfirm={async () => {
          if (!pending || !confirm) return
          try {
            await action.mutateAsync({ type: pending.type, id: pending.reminder.id, version: pending.reminder.version })
            enqueueSnackbar(confirm.done, { variant: 'success' })
            setPending(null)
          } catch (e) {
            enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
          }
        }}
      />
    </>
  )
}

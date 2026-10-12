import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { useAnnouncements, useDeleteAnnouncement, useSendAnnouncement, type Announcement } from '@/features/notification/api'
import { AnnouncementFormDialog } from '@/features/notification/components/AnnouncementFormDialog'
import { AnnouncementViewDialog } from '@/features/notification/components/AnnouncementViewDialog'
import {
  ANNOUNCEMENT_AUDIENCE,
  ANNOUNCEMENT_CATEGORY,
  ANNOUNCEMENT_STATUS,
  AUDIENCE_OPTIONS,
  CATEGORY_OPTIONS,
  STATUS_OPTIONS,
} from '@/features/notification/constants'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = ['keyword', 'title', 'category', 'audience', 'status', 'createdFrom', 'createdTo'] as const

/** Thông báo Ban quản lý gửi nhân viên / cư dân của tòa. */
export function AnnouncementListPage() {
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  // ?view=<id> (từ chuông thông báo) mở xem chi tiết; giữ ở state để mở / đóng không làm mất trang đang xem.
  const location = useLocation()
  const [viewId, setViewId] = useState<number>()
  useEffect(() => {
    const id = Number(new URLSearchParams(location.search).get('view'))
    if (id) setViewId(id)
  }, [location.key, location.search])
  const { data, isLoading, error, refetch } = useAnnouncements(list.apiParams)
  const send = useSendAnnouncement()
  const remove = useDeleteAnnouncement()
  const allBuildings = useBuildingStore((s) => s.selectedBuildingId == null)
  const canWrite = usePermission('NOTIFICATION_WRITE')
  const canDelete = usePermission('NOTIFICATION_DELETE')
  const [form, setForm] = useState<{ open: boolean; id?: number }>({ open: false })
  const [sendTarget, setSendTarget] = useState<Announcement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)

  const rowActions = (a: Announcement): RowAction[] => [
    { label: 'Xem', icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => setViewId(a.id) },
    ...(canWrite && a.status !== 'SENT'
      ? [
          { label: 'Chỉnh sửa', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => setForm({ open: true, id: a.id }) },
          { label: 'Gửi ngay', icon: <SendOutlinedIcon fontSize="small" />, onClick: () => setSendTarget(a) },
        ]
      : []),
    ...(canDelete && a.status !== 'SENT'
      ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => setDeleteTarget(a) }]
      : []),
  ]

  const columns: Column<Announcement>[] = [
    {
      key: 'title',
      header: 'Tiêu đề',
      sortable: true,
      minWidth: 240,
      filter: { type: 'text' },
      render: (a) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {a.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 420 }} noWrap>
            {a.content}
          </Typography>
        </Box>
      ),
    },
    ...(allBuildings ? [{ key: 'buildingName', header: 'Tòa nhà', render: (a: Announcement) => a.buildingName }] : []),
    {
      key: 'category',
      header: 'Loại',
      filter: { type: 'select', options: CATEGORY_OPTIONS },
      render: (a) => <StatusChip {...ANNOUNCEMENT_CATEGORY[a.category]} />,
    },
    { key: 'audience', header: 'Gửi tới', filter: { type: 'select', options: AUDIENCE_OPTIONS }, render: (a) => ANNOUNCEMENT_AUDIENCE[a.audience] },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: { type: 'select', options: STATUS_OPTIONS },
      render: (a) => <StatusChip {...ANNOUNCEMENT_STATUS[a.status]} />,
    },
    {
      key: 'sentAt',
      header: 'Gửi lúc',
      sortable: true,
      render: (a) =>
        a.status === 'SENT' ? formatDateTime(a.sentAt) : a.status === 'SCHEDULED' ? <i>Hẹn {formatDateTime(a.scheduledAt)}</i> : '—',
    },
    {
      key: 'recipients',
      header: 'Người nhận',
      render: (a) =>
        a.status !== 'SENT'
          ? ''
          : [a.audience !== 'RESIDENT' && `${a.staffCount} nhân viên`, a.audience !== 'STAFF' && `${a.residentCount} cư dân`]
              .filter(Boolean)
              .join(' · '),
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (a) => formatDateTime(a.createdAt),
    },
  ]

  return (
    <>
      <ListPageLayout
        title="Thông báo"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={
              <ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={STATUS_OPTIONS} onChange={(v) => list.setFilter('status', v)} />
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm tiêu đề, nội dung..."
            onAdd={() => setForm({ open: true })}
            addPermission="NOTIFICATION_WRITE"
          />
        }
      >
        <DataTable
          columns={columns}
          rows={data?.content ?? []}
          getRowId={(a) => a.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sort={list.sort}
          onSortChange={list.setSort}
          onRowClick={(a) => setViewId(a.id)}
          rowActions={rowActions}
          emptyMessage={list.hasFilters ? 'Không có thông báo phù hợp với bộ lọc' : 'Chưa có thông báo nào'}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      <AnnouncementFormDialog open={form.open} announcementId={form.id} onClose={() => setForm({ open: false })} />
      <AnnouncementViewDialog id={viewId} onClose={() => setViewId(undefined)} />
      <ConfirmDialog
        open={!!sendTarget}
        title="Gửi thông báo ngay?"
        message={
          <>
            Gửi <b>{sendTarget?.title}</b> tới {sendTarget ? ANNOUNCEMENT_AUDIENCE[sendTarget.audience].toLowerCase() : ''}. Đã gửi thì
            không sửa / xoá được.
          </>
        }
        confirmLabel="Gửi"
        loading={send.isPending}
        onClose={() => setSendTarget(null)}
        onConfirm={async () => {
          if (!sendTarget) return
          try {
            const sent = await send.mutateAsync({ id: sendTarget.id, version: sendTarget.version })
            enqueueSnackbar(`Đã gửi thông báo${sent.audience !== 'RESIDENT' ? ` tới ${sent.staffCount} nhân viên` : ''}.`, {
              variant: 'success',
            })
            setSendTarget(null)
          } catch (e) {
            enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
          }
        }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xoá thông báo?"
        message={
          <>
            Xoá thông báo <b>{deleteTarget?.title}</b> cùng tệp đính kèm.
          </>
        }
        confirmLabel="Xoá"
        variant="danger"
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            await remove.mutateAsync(deleteTarget.id)
            enqueueSnackbar('Đã xoá thông báo.', { variant: 'success' })
            setDeleteTarget(null)
          } catch (e) {
            enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
          }
        }}
      />
    </>
  )
}

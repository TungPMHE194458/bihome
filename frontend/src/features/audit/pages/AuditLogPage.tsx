import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'
import { useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { useAuditLogs, useLoginHistory, type AuditLog, type LoginRecord } from '@/features/audit/api'
import { AuditChanges } from '@/features/audit/components/AuditChanges'
import {
  AUDIT_ACTION,
  AUDIT_ACTION_OPTIONS,
  describe,
  entityTypeLabel,
  fieldLabel,
  moduleLabel,
} from '@/features/audit/constants'
import { useListParams } from '@/hooks/useListParams'
import { formatDateTime } from '@/lib/format'
import { MODULE_OPTIONS } from '@/lib/modules'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

type TabKey = 'activity' | 'logins'

/** Nhật ký hoạt động: tab Hoạt động (mọi thao tác ghi) và Lịch sử đăng nhập (Admin hệ thống). */
export function AuditLogPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const canSeeLogins = usePermission('USER_READ')
  const tab: TabKey = canSeeLogins && searchParams.get('tab') === 'logins' ? 'logins' : 'activity'

  const tabs = (
    <Tabs value={tab} onChange={(_, v: TabKey) => navigate({ search: v === 'activity' ? '' : `?tab=${v}` }, { replace: true })}>
      <Tab value="activity" label="Hoạt động" />
      {canSeeLogins && <Tab value="logins" label="Lịch sử đăng nhập" />}
    </Tabs>
  )
  return tab === 'logins' ? <LoginTab key="logins" tabs={tabs} /> : <ActivityTab key="activity" tabs={tabs} />
}

const ACTIVITY_KEYS = ['keyword', 'actor', 'action', 'module', 'entityType', 'entityId', 'from', 'to'] as const

function ActivityTab({ tabs }: { tabs: ReactNode }) {
  const list = useListParams({ filterKeys: ACTIVITY_KEYS })
  const { data, isLoading, error, refetch } = useAuditLogs(list.apiParams)
  const allBuildings = useBuildingStore((s) => s.selectedBuildingId == null)
  const [detail, setDetail] = useState<AuditLog | null>(null)

  const columns: Column<AuditLog>[] = [
    {
      key: 'occurredAt',
      header: 'Thời gian',
      sortable: true,
      width: 150,
      filter: { type: 'dateRange', fromKey: 'from', toKey: 'to' },
      render: (l) => <Box sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(l.occurredAt)}</Box>,
    },
    {
      key: 'actor',
      header: 'Người thao tác',
      sortKey: 'actorUsername',
      sortable: true,
      filter: { type: 'text', placeholder: 'Tên đăng nhập' },
      render: (l) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {l.actorName ?? l.actorUsername}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {l.actorUsername}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'action',
      header: 'Thao tác',
      filter: { type: 'select', options: AUDIT_ACTION_OPTIONS },
      render: (l) => <StatusChip {...AUDIT_ACTION[l.action]} />,
    },
    {
      key: 'module',
      header: 'Chức năng',
      filter: { type: 'select', options: MODULE_OPTIONS },
      render: (l) => moduleLabel(l.module),
    },
    {
      key: 'keyword',
      header: 'Đối tượng',
      minWidth: 200,
      filter: { type: 'text', placeholder: 'Mã, tên đối tượng' },
      render: (l) => (
        <Box>
          <Typography variant="caption" color="text.secondary">
            {entityTypeLabel(l.entityType)}
          </Typography>
          <Typography variant="body2" fontWeight={500} sx={{ wordBreak: 'break-word' }}>
            {l.entityLabel}
          </Typography>
        </Box>
      ),
    },
    ...(allBuildings ? [{ key: 'building', header: 'Tòa nhà', render: (l: AuditLog) => l.buildingName ?? 'Dùng chung' }] : []),
    {
      key: 'changes',
      header: 'Nội dung thay đổi',
      minWidth: 220,
      render: (l) =>
        l.changes.length ? (
          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 280 }} title={l.changes.map((c) => fieldLabel(c.field)).join(', ')}>
            {l.changes.map((c) => fieldLabel(c.field)).join(', ')}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ),
    },
    { key: 'ip', header: 'IP', render: (l) => l.ipAddress ?? '' },
  ]

  return (
    <>
      <ListPageLayout
        title="Nhật ký hoạt động"
        tabs={tabs}
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={
              <>
                <ToolbarSelect label="Chức năng" value={list.filters.module ?? ''} options={MODULE_OPTIONS} onChange={(v) => list.setFilter('module', v)} />
                <ToolbarSelect label="Thao tác" value={list.filters.action ?? ''} options={AUDIT_ACTION_OPTIONS} onChange={(v) => list.setFilter('action', v)} />
              </>
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm đối tượng, người thao tác..."
          />
        }
      >
        <DataTable
          columns={columns}
          rows={data?.content ?? []}
          getRowId={(l) => l.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sort={list.sort}
          onSortChange={list.setSort}
          onRowClick={setDetail}
          emptyMessage={list.hasFilters ? 'Không có hoạt động phù hợp với bộ lọc' : 'Chưa có hoạt động nào'}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          Chi tiết hoạt động
          <IconButton aria-label="Đóng" onClick={() => setDetail(null)} sx={{ position: 'absolute', right: 12, top: 12 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        {detail && (
          <DialogContent>
            <Stack spacing={1.5}>
              <Typography fontWeight={600}>{describe(detail)}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '130px 1fr', rowGap: 0.75, columnGap: 1 }}>
                <Typography variant="body2" color="text.secondary">Thời gian</Typography>
                <Typography variant="body2">{formatDateTime(detail.occurredAt)}</Typography>
                <Typography variant="body2" color="text.secondary">Người thao tác</Typography>
                <Typography variant="body2">
                  {detail.actorName ?? detail.actorUsername} ({detail.actorUsername})
                </Typography>
                <Typography variant="body2" color="text.secondary">Chức năng</Typography>
                <Typography variant="body2">{moduleLabel(detail.module)}</Typography>
                <Typography variant="body2" color="text.secondary">Đối tượng</Typography>
                <Typography variant="body2">
                  {entityTypeLabel(detail.entityType)} {detail.entityLabel} (#{detail.entityId})
                </Typography>
                <Typography variant="body2" color="text.secondary">Tòa nhà</Typography>
                <Typography variant="body2">{detail.buildingName ?? 'Dữ liệu dùng chung'}</Typography>
                <Typography variant="body2" color="text.secondary">Địa chỉ IP</Typography>
                <Typography variant="body2">{detail.ipAddress ?? '—'}</Typography>
              </Box>
              {detail.changes.length > 0 ? (
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'grey.50', border: 1, borderColor: 'divider' }}>
                  <AuditChanges changes={detail.changes} />
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {detail.action === 'CREATE' ? 'Tạo mới đối tượng.' : detail.action === 'DELETE' ? 'Xoá đối tượng.' : 'Không có chi tiết.'}
                </Typography>
              )}
            </Stack>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

const LOGIN_KEYS = ['keyword', 'success', 'from', 'to'] as const
const LOGIN_RESULT_OPTIONS = [
  { value: 'true', label: 'Thành công' },
  { value: 'false', label: 'Thất bại' },
]
const FAILURE_REASON: Record<string, string> = {
  USER_NOT_FOUND: 'Không có tài khoản',
  BAD_PASSWORD: 'Sai mật khẩu',
  LOCKED_AFTER_FAILURES: 'Sai mật khẩu, tạm khoá',
  TEMPORARILY_LOCKED: 'Đang tạm khoá',
  LOCKED: 'Tài khoản bị khoá',
  INACTIVE: 'Tài khoản ngừng hoạt động',
}

function LoginTab({ tabs }: { tabs: ReactNode }) {
  const list = useListParams({ filterKeys: LOGIN_KEYS })
  const { data, isLoading, error, refetch } = useLoginHistory(list.apiParams)

  const columns: Column<LoginRecord>[] = [
    {
      key: 'createdAt',
      header: 'Thời gian',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'from', toKey: 'to' },
      render: (r) => formatDateTime(r.createdAt),
    },
    {
      key: 'keyword',
      header: 'Tên đăng nhập',
      filter: { type: 'text' },
      render: (r) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {r.loginName}
          </Typography>
          {r.fullName && (
            <Typography variant="caption" color="text.secondary">
              {r.fullName}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'success',
      header: 'Kết quả',
      filter: { type: 'select', options: LOGIN_RESULT_OPTIONS },
      render: (r) =>
        r.success ? (
          <StatusChip label="Thành công" tone="success" />
        ) : (
          <StatusChip label={FAILURE_REASON[r.failureReason ?? ''] ?? r.failureReason ?? 'Thất bại'} tone="danger" />
        ),
    },
    { key: 'ip', header: 'IP', render: (r) => r.ipAddress ?? '' },
    {
      key: 'userAgent',
      header: 'Thiết bị',
      minWidth: 240,
      render: (r) => (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 360 }} noWrap title={r.userAgent}>
          {r.userAgent}
        </Typography>
      ),
    },
  ]

  return (
    <ListPageLayout
      title="Nhật ký hoạt động"
      tabs={tabs}
      onClearFilters={list.clearFilters}
      hasFilters={list.hasFilters}
      toolbar={
        <ListToolbar
          filters={<ToolbarSelect label="Kết quả" value={list.filters.success ?? ''} options={LOGIN_RESULT_OPTIONS} onChange={(v) => list.setFilter('success', v)} />}
          search={list.filters.keyword ?? ''}
          onSearchChange={(v) => list.setFilter('keyword', v)}
          searchPlaceholder="Tìm tên đăng nhập, IP..."
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
        emptyMessage="Chưa có lượt đăng nhập nào"
        page={list.page}
        size={list.size}
        total={data?.totalElements ?? 0}
        onPageChange={list.setPage}
        onSizeChange={list.setSize}
      />
    </ListPageLayout>
  )
}

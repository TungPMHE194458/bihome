import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PasswordOutlinedIcon from '@mui/icons-material/PasswordOutlined'
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined'
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useMemo, useState } from 'react'
import { AuthAvatar } from '@/components/AuthImage'
import { DataTable } from '@/components/DataTable/DataTable'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import type { UserStatus } from '@/features/auth/types'
import { useBuildingOptions } from '@/features/building/hooks'
import { TemporaryPasswordDialog } from '@/features/user/components/TemporaryPasswordDialog'
import { UserFormDialog } from '@/features/user/components/UserFormDialog'
import { USER_STATUS, USER_STATUS_OPTIONS } from '@/features/user/constants'
import {
  useChangeUserStatus,
  useResetPassword,
  useRoleOptions,
  useUserList,
} from '@/features/user/hooks'
import type { UserSummary } from '@/features/user/types'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'
import { useAuthStore, usePermission } from '@/stores/authStore'

const FILTER_KEYS = ['keyword', 'username', 'fullName', 'email', 'role', 'status'] as const

type StatusAction = { user: UserSummary; status: UserStatus }
const STATUS_ACTION: Record<
  UserStatus,
  { title: string; confirm: string; message: string; done: string }
> = {
  LOCKED: {
    title: 'Khoá tài khoản?',
    confirm: 'Khoá',
    message: 'không đăng nhập được và bị đăng xuất khỏi mọi thiết bị cho tới khi được mở khoá.',
    done: 'Đã khoá tài khoản.',
  },
  INACTIVE: {
    title: 'Ngừng hoạt động tài khoản?',
    confirm: 'Ngừng hoạt động',
    message: 'không đăng nhập được và không còn được chọn làm người xử lý.',
    done: 'Đã ngừng hoạt động tài khoản.',
  },
  ACTIVE: {
    title: 'Kích hoạt tài khoản?',
    confirm: 'Kích hoạt',
    message: 'đăng nhập lại được.',
    done: 'Đã kích hoạt tài khoản.',
  },
}

export function UserListPage() {
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useUserList(list.apiParams)
  const { data: roles = [] } = useRoleOptions()
  const roleOptions = useMemo(() => roles.map((r) => ({ value: r.code, label: r.name })), [roles])
  const { data: buildings = [] } = useBuildingOptions()
  const buildingName = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings])
  const { enqueueSnackbar } = useSnackbar()
  const me = useAuthStore((s) => s.user?.id)
  const canWrite = usePermission('USER_WRITE')
  const changeStatus = useChangeUserStatus()
  const resetPassword = useResetPassword()
  const [form, setForm] = useState<{ open: boolean; id?: number }>({ open: false })
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null)
  const [resetTarget, setResetTarget] = useState<UserSummary | null>(null)
  const [password, setPassword] = useState<{
    username: string
    password: string
    title: string
  } | null>(null)
  const action = statusAction ? STATUS_ACTION[statusAction.status] : null

  const rowActions = (u: UserSummary): RowAction[] => {
    const actions: RowAction[] = [
      {
        label: 'Chỉnh sửa',
        icon: <EditOutlinedIcon fontSize="small" />,
        onClick: () => setForm({ open: true, id: u.id }),
      },
    ]
    // Không tự khoá / đặt lại mật khẩu cho chính mình (dùng Đổi mật khẩu).
    if (u.id === me) return actions
    actions.push({
      label: 'Đặt lại mật khẩu',
      icon: <PasswordOutlinedIcon fontSize="small" />,
      onClick: () => setResetTarget(u),
    })
    if (u.status === 'ACTIVE') {
      actions.push(
        {
          label: 'Khoá tài khoản',
          icon: <LockOutlinedIcon fontSize="small" />,
          onClick: () => setStatusAction({ user: u, status: 'LOCKED' }),
        },
        {
          label: 'Ngừng hoạt động',
          icon: <ToggleOffOutlinedIcon fontSize="small" />,
          onClick: () => setStatusAction({ user: u, status: 'INACTIVE' }),
        },
      )
    } else {
      actions.push({
        label: u.status === 'LOCKED' ? 'Mở khoá' : 'Kích hoạt',
        icon:
          u.status === 'LOCKED' ? (
            <LockOpenOutlinedIcon fontSize="small" />
          ) : (
            <ToggleOnOutlinedIcon fontSize="small" />
          ),
        onClick: () => setStatusAction({ user: u, status: 'ACTIVE' }),
      })
    }
    return actions
  }

  const submitStatus = async () => {
    if (!statusAction || !action) return
    try {
      await changeStatus.mutateAsync({ id: statusAction.user.id, status: statusAction.status })
      enqueueSnackbar(action.done, { variant: 'success' })
      setStatusAction(null)
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const submitReset = async () => {
    if (!resetTarget) return
    try {
      const res = await resetPassword.mutateAsync(resetTarget.id)
      setPassword({
        username: resetTarget.username,
        password: res.temporaryPassword,
        title: 'Đã đặt lại mật khẩu',
      })
      setResetTarget(null)
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const columns: Column<UserSummary>[] = [
    {
      key: 'avatar',
      header: 'Ảnh',
      width: 56,
      render: (u) => (
        <AuthAvatar
          url={u.avatarUrl}
          name={u.fullName}
          sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}
        />
      ),
    },
    {
      key: 'username',
      header: 'Tên đăng nhập',
      sortable: true,
      filter: { type: 'text' },
      render: (u) => (
        <Typography fontSize={14} fontWeight={600} color="primary.dark">
          {u.username}
        </Typography>
      ),
    },
    { key: 'fullName', header: 'Họ tên', sortable: true, filter: { type: 'text' }, minWidth: 160 },
    { key: 'email', header: 'Email', sortable: true, filter: { type: 'text' }, minWidth: 180 },
    { key: 'phone', header: 'Số điện thoại', render: (u) => u.phone ?? '' },
    {
      key: 'role',
      header: 'Vai trò',
      filter: { type: 'select', options: roleOptions },
      minWidth: 150,
      render: (u) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {u.roles.map((r) => (
            <Chip key={r.code} size="small" variant="outlined" label={r.name} />
          ))}
        </Stack>
      ),
    },
    {
      key: 'buildings',
      header: 'Tòa nhà phụ trách',
      minWidth: 160,
      render: (u) =>
        u.roles.some((r) => r.code === 'SUPER_ADMIN')
          ? 'Tất cả'
          : u.buildingIds.length
            ? u.buildingIds.map((id) => buildingName.get(id) ?? `#${id}`).join(', ')
            : '—',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      sortable: true,
      filter: { type: 'select', options: USER_STATUS_OPTIONS },
      render: (u) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <StatusChip {...USER_STATUS[u.status]} />
          {u.temporarilyLocked && <StatusChip label="Tạm khoá" tone="warning" />}
        </Box>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Đăng nhập gần nhất',
      sortable: true,
      render: (u) => formatDateTime(u.lastLoginAt),
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      render: (u) => formatDateTime(u.createdAt),
    },
  ]

  return (
    <>
      <ListPageLayout
        title="Danh sách người dùng hệ thống"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={
              <ToolbarSelect
                label="Trạng thái"
                value={list.filters.status ?? ''}
                options={USER_STATUS_OPTIONS}
                onChange={(v) => list.setFilter('status', v)}
              />
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm tên, email, SĐT..."
            onAdd={() => setForm({ open: true })}
            addPermission="USER_WRITE"
          />
        }
      >
        <DataTable
          columns={columns}
          rows={data?.content ?? []}
          getRowId={(u) => u.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sort={list.sort}
          onSortChange={list.setSort}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
          rowActions={canWrite ? rowActions : undefined}
          emptyMessage={
            list.hasFilters ? 'Không có người dùng phù hợp với bộ lọc' : 'Chưa có người dùng'
          }
        />
      </ListPageLayout>
      <UserFormDialog
        open={form.open}
        userId={form.id}
        onClose={() => setForm({ open: false })}
        onCreated={(username, temporaryPassword) =>
          setPassword({ username, password: temporaryPassword, title: 'Đã tạo người dùng' })
        }
      />
      <ConfirmDialog
        open={!!statusAction}
        title={action?.title ?? ''}
        message={
          <>
            Tài khoản <b>{statusAction?.user.username}</b> sẽ {action?.message}
          </>
        }
        confirmLabel={action?.confirm}
        variant={statusAction?.status === 'ACTIVE' ? undefined : 'danger'}
        loading={changeStatus.isPending}
        onClose={() => setStatusAction(null)}
        onConfirm={() => void submitStatus()}
      />
      <ConfirmDialog
        open={!!resetTarget}
        title="Đặt lại mật khẩu?"
        message={
          <>
            Sinh mật khẩu tạm mới cho <b>{resetTarget?.username}</b> và đăng xuất người dùng khỏi
            mọi thiết bị.
          </>
        }
        confirmLabel="Đặt lại"
        loading={resetPassword.isPending}
        onClose={() => setResetTarget(null)}
        onConfirm={() => void submitReset()}
      />
      <TemporaryPasswordDialog value={password} onClose={() => setPassword(null)} />
    </>
  )
}

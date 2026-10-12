import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import { PageBreadcrumb } from '@/components/ListPage/PageBreadcrumb'
import type { RoleDetail } from '@/features/role/api'
import { useDeleteRole, usePermissionCatalog, useRoleOverview, useSaveRole } from '@/features/role/hooks'
import { getErrorMessage, getProblem } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'
import { MODULE_GROUPS, PERMISSION_ACTIONS } from '@/lib/modules'
import { usePermission } from '@/stores/authStore'

interface Draft {
  id?: number
  code: string
  name: string
  description: string
  permissions: Set<string>
  version?: number
}

const NEW = 'new'
const toDraft = (r: RoleDetail): Draft => ({
  id: r.id,
  code: r.code,
  name: r.name,
  description: r.description ?? '',
  permissions: new Set(r.permissions),
  version: r.version,
})
const emptyDraft = (): Draft => ({ code: '', name: '', description: '', permissions: new Set() })
const sameDraft = (a: Draft, b: Draft) =>
  a.code === b.code &&
  a.name === b.name &&
  a.description === b.description &&
  a.permissions.size === b.permissions.size &&
  [...a.permissions].every((p) => b.permissions.has(p))

/** Vai trò & phân quyền: danh sách vai trò bên trái, ma trận module × thao tác bên phải. */
export function RolePage() {
  const { enqueueSnackbar } = useSnackbar()
  const [params, setParams] = useSearchParams()
  const { data: roles = [], isLoading, error, refetch } = useRoleOverview()
  const { data: catalog = [] } = usePermissionCatalog()
  const save = useSaveRole()
  const remove = useDeleteRole()
  const canWrite = usePermission('ROLE_WRITE')
  const canDelete = usePermission('ROLE_DELETE')
  const selectedKey = params.get('role') ?? (roles[0] ? String(roles[0].id) : null)
  const selected = roles.find((r) => String(r.id) === selectedKey)
  const creating = selectedKey === NEW
  const [draft, setDraft] = useState<Draft | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  const base = useMemo(() => (creating ? emptyDraft() : selected ? toDraft(selected) : null), [creating, selected])
  useEffect(() => {
    setDraft(base)
    setFieldErrors({})
  }, [base])

  const existing = useMemo(() => new Set(catalog.map((p) => p.code)), [catalog])
  const locked = !canWrite || !!selected?.allPermissions
  const dirty = !!draft && !!base && !sameDraft(draft, base)

  const has = (code: string) => !!selected?.allPermissions || !!draft?.permissions.has(code)
  const setPerms = (codes: string[], on: boolean) => {
    if (!draft) return
    const next = new Set(draft.permissions)
    for (const code of codes.filter((c) => existing.has(c))) {
      if (on) next.add(code)
      else next.delete(code)
    }
    setDraft({ ...draft, permissions: next })
  }
  /** Bật thêm/sửa/xoá/xuất thì tự bật Xem; tắt Xem thì tắt hết. */
  const toggle = (module: string, action: string) => {
    const code = `${module}_${action}`
    if (has(code)) {
      setPerms(action === 'READ' ? PERMISSION_ACTIONS.map((a) => `${module}_${a.code}`) : [code], false)
    } else {
      setPerms(action === 'READ' ? [code] : [code, `${module}_READ`], true)
    }
  }
  const moduleCodes = (module: string) => PERMISSION_ACTIONS.map((a) => `${module}_${a.code}`).filter((c) => existing.has(c))
  const allModules = MODULE_GROUPS.flatMap((g) => g.modules)
  const columnCodes = (action: string) => allModules.map((m) => `${m.code}_${action}`).filter((c) => existing.has(c))

  const select = (key: string) => setParams({ role: key }, { replace: true })

  const submit = async () => {
    if (!draft) return
    setFieldErrors({})
    try {
      const saved = await save.mutateAsync({
        id: draft.id,
        body: {
          code: creating ? draft.code.trim().toUpperCase() : undefined,
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          permissions: [...draft.permissions],
          version: draft.version,
        },
      })
      enqueueSnackbar(creating ? `Đã tạo vai trò ${saved.name}.` : 'Đã lưu phân quyền — có hiệu lực ngay.', { variant: 'success' })
      select(String(saved.id))
    } catch (e) {
      const errors = getProblem(e)?.errors
      if (errors?.length) setFieldErrors(Object.fromEntries(errors.map((x) => [x.field, x.message])))
      else enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const doDelete = async () => {
    if (!selected) return
    try {
      await remove.mutateAsync(selected.id)
      enqueueSnackbar('Đã xoá vai trò.', { variant: 'success' })
      setConfirmDelete(false)
      setParams({}, { replace: true })
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
      setConfirmDelete(false)
    }
  }

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />

  return (
    <Stack spacing={2} sx={{ pb: 10 }}>
      <PageBreadcrumb title="Vai trò & phân quyền" />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, alignItems: 'start' }}>
        <Paper variant="outlined">
          <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography fontWeight={700} sx={{ flex: 1 }}>
              Vai trò
            </Typography>
            {canWrite && (
              <Button size="small" startIcon={<AddIcon />} onClick={() => select(NEW)}>
                Thêm
              </Button>
            )}
          </Stack>
          {isLoading ? (
            <Box sx={{ p: 2 }}>
              <Skeleton height={48} />
              <Skeleton height={48} />
              <Skeleton height={48} />
            </Box>
          ) : (
            <List dense disablePadding aria-label="Danh sách vai trò">
              {roles.map((r) => (
                <ListItemButton key={r.id} selected={String(r.id) === selectedKey} onClick={() => select(String(r.id))}>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight={600} fontSize={14}>
                          {r.name}
                        </Typography>
                        {r.system && <Chip size="small" label="Hệ thống" sx={{ height: 20, fontSize: 11 }} />}
                      </Stack>
                    }
                    secondary={`${r.code} · ${r.allPermissions ? 'Toàn quyền' : `${r.permissions.length} quyền`}`}
                  />
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary' }} title="Số người dùng">
                    <GroupOutlinedIcon sx={{ fontSize: 16 }} />
                    <Typography variant="caption">{r.userCount}</Typography>
                  </Stack>
                </ListItemButton>
              ))}
              {creating && (
                <ListItemButton selected>
                  <ListItemText primary={<i>Vai trò mới</i>} />
                </ListItemButton>
              )}
            </List>
          )}
        </Paper>

        {!draft ? (
          <Skeleton variant="rounded" height={480} />
        ) : (
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' }, mb: 2 }}>
              <TextField
                label="Mã vai trò"
                value={draft.code}
                required
                disabled={!creating}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                error={!!fieldErrors.code}
                helperText={fieldErrors.code ?? (creating ? 'Chữ in hoa, số và _ (vd BAO_VE)' : undefined)}
              />
              <TextField
                label="Tên vai trò"
                value={draft.name}
                required
                disabled={locked}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                error={!!fieldErrors.name}
                helperText={fieldErrors.name}
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
              <TextField
                label="Mô tả"
                value={draft.description}
                disabled={locked}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                sx={{ gridColumn: '1 / -1' }}
                slotProps={{ htmlInput: { maxLength: 500 } }}
              />
            </Box>

            {selected?.allPermissions && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Admin hệ thống luôn có toàn bộ quyền và làm việc ở mọi tòa nhà; không chỉnh sửa được.
              </Alert>
            )}
            {fieldErrors.permissions && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {fieldErrors.permissions}
              </Alert>
            )}

            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" aria-label="Ma trận phân quyền" sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Chức năng</TableCell>
                    {PERMISSION_ACTIONS.map((a) => {
                      const codes = columnCodes(a.code)
                      const on = codes.filter(has).length
                      return (
                        <TableCell key={a.code} align="center" sx={{ fontWeight: 700, width: 110 }}>
                          <Stack alignItems="center">
                            {a.label}
                            <Checkbox
                              size="small"
                              disabled={locked}
                              checked={on === codes.length && codes.length > 0}
                              indeterminate={on > 0 && on < codes.length}
                              onChange={(e) => {
                                const reads = a.code === 'READ' ? [] : columnCodes('READ')
                                if (e.target.checked) setPerms([...codes, ...reads], true)
                                else setPerms(a.code === 'READ' ? allModules.flatMap((m) => moduleCodes(m.code)) : codes, false)
                              }}
                              slotProps={{ input: { 'aria-label': `Chọn tất cả cột ${a.label}` } }}
                            />
                          </Stack>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {MODULE_GROUPS.map((group) => [
                    <TableRow key={group.label}>
                      <TableCell colSpan={5} sx={{ bgcolor: 'grey.50', fontWeight: 700, color: 'primary.dark', py: 0.75 }}>
                        {group.label}
                      </TableCell>
                    </TableRow>,
                    ...group.modules.map((m) => {
                      const codes = moduleCodes(m.code)
                      const on = codes.filter(has).length
                      return (
                        <TableRow key={m.code} hover>
                          <TableCell>
                            <Stack direction="row" alignItems="center">
                              <Checkbox
                                size="small"
                                disabled={locked}
                                checked={on === codes.length && codes.length > 0}
                                indeterminate={on > 0 && on < codes.length}
                                onChange={(e) => setPerms(codes, e.target.checked)}
                                slotProps={{ input: { 'aria-label': `Toàn quyền ${m.label}` } }}
                              />
                              {m.label}
                            </Stack>
                          </TableCell>
                          {PERMISSION_ACTIONS.map((a) => {
                            const code = `${m.code}_${a.code}`
                            return (
                              <TableCell key={a.code} align="center">
                                {existing.has(code) && (
                                  <Checkbox
                                    size="small"
                                    disabled={locked}
                                    checked={has(code)}
                                    onChange={() => toggle(m.code, a.code)}
                                    slotProps={{ input: { 'aria-label': `${a.label} ${m.label}` } }}
                                  />
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      )
                    }),
                  ])}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        )}
      </Box>

      {draft && canWrite && !selected?.allPermissions && (
        <Paper elevation={6} sx={{ position: 'sticky', bottom: 16, p: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', zIndex: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 220 }}>
            {creating
              ? `Vai trò mới · ${draft.permissions.size} quyền`
              : dirty
                ? `Có thay đổi chưa lưu · ${draft.permissions.size} quyền`
                : `${selected?.userCount ?? 0} người dùng · cập nhật ${formatDateTime(selected?.updatedAt)}${selected?.updatedBy ? ` bởi ${selected.updatedBy}` : ''}`}
          </Typography>
          {selected && !selected.system && canDelete && (
            <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setConfirmDelete(true)} disabled={save.isPending}>
              Xoá vai trò
            </Button>
          )}
          <Button color="inherit" disabled={(!dirty && !creating) || save.isPending} onClick={() => (creating ? setParams({}, { replace: true }) : setDraft(base))}>
            Huỷ
          </Button>
          <Button variant="contained" disabled={(!dirty && !creating) || !draft.name.trim() || save.isPending} onClick={() => void submit()}>
            {creating ? 'Tạo vai trò' : 'Lưu phân quyền'}
          </Button>
        </Paper>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Xoá vai trò?"
        message={
          <>
            Xoá vĩnh viễn vai trò <b>{selected?.name}</b>. Vai trò đang được gán cho người dùng thì không xoá được.
          </>
        }
        confirmLabel="Xoá"
        variant="danger"
        loading={remove.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void doDelete()}
      />
    </Stack>
  )
}

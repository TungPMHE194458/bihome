import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormDatePicker } from '@/components/form/FormDatePicker'
import { FormMultiSelect } from '@/components/form/FormMultiSelect'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { useBuildingOptions } from '@/features/building/hooks'
import { GENDER_OPTIONS } from '@/features/profile/constants'
import { useCreateUser, useRoleOptions, useUpdateUser, useUser } from '@/features/user/hooks'
import {
  SUPER_ADMIN,
  assignmentChanges,
  emptyUser,
  userSchema,
  userToCreateRequest,
  userToForm,
  userToUpdateRequest,
  type UserFormValues,
} from '@/features/user/schema'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'

interface Props {
  open: boolean
  userId?: number
  onClose: () => void
  /** Tạo xong: trả mật khẩu tạm để hiện cho người quản trị. */
  onCreated: (username: string, temporaryPassword: string) => void
}

const full = { gridColumn: '1 / -1' } as const
const FORM_FIELDS = Object.keys(emptyUser())

export function UserFormDialog({ open, userId, onClose, onCreated }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = userId != null
  const { data: detail, isLoading, error: loadError, refetch } = useUser(open ? userId : undefined)
  const { data: roles = [] } = useRoleOptions()
  const { data: buildings = [] } = useBuildingOptions()
  const create = useCreateUser()
  const update = useUpdateUser()
  const { control, handleSubmit, reset, setError, formState } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: emptyUser(),
  })
  const roleCodes = useWatch({ control, name: 'roleCodes' })
  const isSuperAdmin = roleCodes.includes(SUPER_ADMIN)

  const roleOptions = useMemo(() => roles.map((r) => ({ value: r.code, label: r.name })), [roles])
  const buildingOptions = useMemo(
    () => buildings.map((b) => ({ value: b.id, label: b.name, hint: b.status === 'INACTIVE' ? `${b.code} · ngừng hoạt động` : b.code })),
    [buildings],
  )

  useEffect(() => {
    if (!open) return
    reset(editing && detail ? userToForm(detail) : emptyUser())
  }, [open, editing, detail, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (editing && detail) {
        await update.mutateAsync({ id: detail.id, body: userToUpdateRequest(values, detail), ...assignmentChanges(values, detail) })
        enqueueSnackbar('Đã cập nhật người dùng.', { variant: 'success' })
      } else {
        const created = await create.mutateAsync(userToCreateRequest(values))
        enqueueSnackbar(`Đã tạo người dùng ${created.user.username}.`, { variant: 'success' })
        onCreated(created.user.username, created.temporaryPassword)
      }
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError, FORM_FIELDS)) enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  })

  return (
    <FormDialog
      open={open}
      loadError={loadError}
      onRetry={() => void refetch()}
      title={editing ? `Chỉnh sửa người dùng ${detail?.username ?? ''}` : 'Thêm người dùng hệ thống'}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
      maxWidth="md"
    >
      {editing && isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <FormTextField
            name="username"
            control={control}
            label="Tên đăng nhập"
            required
            disabled={editing}
            helperText={editing ? 'Không đổi được tên đăng nhập' : 'Chữ không dấu, chữ số và . _ -'}
          />
          <FormTextField name="fullName" control={control} label="Họ tên" required />
          <FormTextField name="email" control={control} label="Email" required />
          <FormTextField name="phone" control={control} label="Số điện thoại" />
          <FormSelect name="gender" control={control} label="Giới tính" options={GENDER_OPTIONS} emptyLabel="Không chọn" />
          <FormDatePicker name="dateOfBirth" control={control} label="Ngày sinh" disableFuture />
          <FormTextField name="jobTitle" control={control} label="Chức vụ" />
          <FormTextField name="department" control={control} label="Phòng ban" />
          <Box sx={full}>
            <FormTextField name="address" control={control} label="Địa chỉ" />
          </Box>

          <Divider sx={full} />
          <Typography variant="subtitle2" fontWeight={700} sx={full}>
            Phân quyền
          </Typography>
          <Box sx={full}>
            <FormMultiSelect name="roleCodes" control={control} label="Vai trò" options={roleOptions} required />
          </Box>
          <Box sx={full}>
            {isSuperAdmin ? (
              <Alert severity="info">Admin hệ thống làm việc ở mọi tòa nhà và có toàn bộ quyền.</Alert>
            ) : (
              <FormMultiSelect
                name="buildingIds"
                control={control}
                label="Tòa nhà phụ trách"
                options={buildingOptions}
                placeholder="Chọn tòa nhà"
                helperText="Người dùng chỉ thấy và thao tác dữ liệu của các tòa này"
              />
            )}
          </Box>
          {!editing && (
            <Alert severity="info" sx={full}>
              Hệ thống sinh mật khẩu tạm sau khi tạo; người dùng phải đổi mật khẩu ở lần đăng nhập đầu tiên.
            </Alert>
          )}
        </Box>
      )}
    </FormDialog>
  )
}

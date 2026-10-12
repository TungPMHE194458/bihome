import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RoleSummary, UserStatus } from '@/features/auth/types'
import type { UserCreated, UserCreateRequest, UserDetail, UserSummary, UserUpdateRequest } from '@/features/user/types'
import type { PageResponse } from '@/lib/api-types'
import { http } from '@/lib/http'

type ListParams = Record<string, string | number>

export const userKeys = {
  all: ['users'] as const,
  list: (params: ListParams) => [...userKeys.all, 'list', params] as const,
  detail: (id: number) => [...userKeys.all, 'detail', id] as const,
}

export const roleKeys = {
  all: ['roles'] as const,
}

/** Người dùng hệ thống không thuộc tòa nào nên gọi không kèm X-Building-Id. */
const opts = { skipBuildingContext: true }

export const userApi = {
  list: (params: ListParams) => http.get<PageResponse<UserSummary>>('/users', { params, ...opts }).then((r) => r.data),
  get: (id: number) => http.get<UserDetail>(`/users/${id}`, opts).then((r) => r.data),
  create: (body: UserCreateRequest) => http.post<UserCreated>('/users', body, opts).then((r) => r.data),
  update: (id: number, body: UserUpdateRequest) => http.put<UserDetail>(`/users/${id}`, body, opts).then((r) => r.data),
  assignRoles: (id: number, roleCodes: string[]) =>
    http.put<UserDetail>(`/users/${id}/roles`, { roleCodes }, opts).then((r) => r.data),
  assignBuildings: (id: number, buildingIds: number[]) =>
    http.put<UserDetail>(`/users/${id}/buildings`, { buildingIds }, opts).then((r) => r.data),
  changeStatus: (id: number, status: UserStatus) =>
    http.patch<UserDetail>(`/users/${id}/status`, { status }, opts).then((r) => r.data),
  resetPassword: (id: number) =>
    http.post<{ temporaryPassword: string }>(`/users/${id}/reset-password`, undefined, opts).then((r) => r.data),
}

export function useUserList(params: ListParams) {
  return useQuery({ queryKey: userKeys.list(params), queryFn: () => userApi.list(params), placeholderData: keepPreviousData })
}

export function useUser(id: number | undefined) {
  return useQuery({ queryKey: userKeys.detail(id ?? 0), enabled: id != null, queryFn: () => userApi.get(id!) })
}

export function useRoleOptions() {
  return useQuery({
    queryKey: roleKeys.all,
    staleTime: 10 * 60_000,
    queryFn: () => http.get<RoleSummary[]>('/roles', opts).then((r) => r.data),
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: userKeys.all })
}

export function useCreateUser() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: userApi.create, onSuccess: invalidate })
}

/** Sửa thông tin rồi gán lại vai trò / tòa nếu có thay đổi. */
export function useUpdateUser() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, body, roleCodes, buildingIds }: {
      id: number
      body: UserUpdateRequest
      roleCodes?: string[]
      buildingIds?: number[]
    }) => {
      let user = await userApi.update(id, body)
      if (roleCodes) user = await userApi.assignRoles(id, roleCodes)
      if (buildingIds) user = await userApi.assignBuildings(id, buildingIds)
      return user
    },
    onSettled: invalidate,
  })
}

export function useChangeUserStatus() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: UserStatus }) => userApi.changeStatus(id, status),
    onSuccess: invalidate,
  })
}

export function useResetPassword() {
  return useMutation({ mutationFn: (id: number) => userApi.resetPassword(id) })
}

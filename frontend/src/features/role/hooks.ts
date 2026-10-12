import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { roleApi, type RoleRequest } from '@/features/role/api'

export const roleManageKeys = {
  all: ['roles'] as const,
  overview: () => ['roles', 'overview'] as const,
  permissions: () => ['roles', 'permissions'] as const,
}

export function useRoleOverview() {
  return useQuery({ queryKey: roleManageKeys.overview(), queryFn: roleApi.overview })
}

export function usePermissionCatalog() {
  return useQuery({ queryKey: roleManageKeys.permissions(), queryFn: roleApi.permissions, staleTime: Infinity })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  // Gồm cả danh sách vai trò cho dropdown (['roles']) và người dùng hiện tại (quyền có thể đã đổi).
  return () => {
    void queryClient.invalidateQueries({ queryKey: roleManageKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['users'] })
  }
}

export function useSaveRole() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: RoleRequest }) => roleApi.save(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteRole() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: number) => roleApi.remove(id), onSuccess: invalidate })
}

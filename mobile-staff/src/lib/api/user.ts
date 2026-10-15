import { clean, data, http, noBuilding, type Params } from '@/lib/api/shared'
import type {
  Permission,
  PageResponse,
  RoleDetail,
  RoleSummary,
  UserCreateRequest,
  UserCreatedResult,
  UserDetail,
  UserStatus,
  UserSummary,
  UserUpdateRequest,
} from '@/lib/types'

/** Người dùng hệ thống không thuộc tòa nào → gọi không kèm X-Building-Id. */
export const userApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<UserSummary>>('/users', { params: clean({ size: 20, sort: 'fullName,asc', ...p }), ...noBuilding })),
  get: (id: number) => data(http.get<UserDetail>(`/users/${id}`, noBuilding)),
  create: (body: UserCreateRequest) => data(http.post<UserCreatedResult>('/users', body, noBuilding)),
  update: (id: number, body: UserUpdateRequest) => data(http.put<UserDetail>(`/users/${id}`, body, noBuilding)),
  assignRoles: (id: number, roleCodes: string[]) => data(http.put<UserDetail>(`/users/${id}/roles`, { roleCodes }, noBuilding)),
  assignBuildings: (id: number, buildingIds: number[]) =>
    data(http.put<UserDetail>(`/users/${id}/buildings`, { buildingIds }, noBuilding)),
  changeStatus: (id: number, status: UserStatus) => data(http.patch<UserDetail>(`/users/${id}/status`, { status }, noBuilding)),
  resetPassword: (id: number) => data(http.post<{ temporaryPassword: string }>(`/users/${id}/reset-password`, null, noBuilding)),
}

/** Vai trò & phân quyền: chỉ xem trên app (sửa ma trận quyền dùng web). */
export const roleApi = {
  list: () => data(http.get<RoleSummary[]>('/roles', noBuilding)),
  overview: () => data(http.get<RoleDetail[]>('/roles/overview', noBuilding)),
  get: (id: number) => data(http.get<RoleDetail>(`/roles/${id}`, noBuilding)),
  permissions: () => data(http.get<Permission[]>('/permissions', noBuilding)),
}

import { http } from '@/lib/http'

export interface RoleDetail {
  id: number
  code: string
  name: string
  description?: string
  system: boolean
  /** Admin hệ thống: luôn có mọi quyền, không sửa được. */
  allPermissions: boolean
  userCount: number
  permissions: string[]
  updatedAt: string
  updatedBy?: string
  version: number
}

export interface PermissionItem {
  code: string
  module: string
  action: string
  name: string
}

export interface RoleRequest {
  code?: string
  name: string
  description: string | null
  permissions: string[]
  version?: number
}

const opts = { skipBuildingContext: true }

export const roleApi = {
  overview: () => http.get<RoleDetail[]>('/roles/overview', opts).then((r) => r.data),
  permissions: () => http.get<PermissionItem[]>('/permissions', opts).then((r) => r.data),
  save: (id: number | undefined, body: RoleRequest) =>
    (id == null ? http.post<RoleDetail>('/roles', body, opts) : http.put<RoleDetail>(`/roles/${id}`, body, opts)).then(
      (r) => r.data,
    ),
  remove: (id: number) => http.delete<void>(`/roles/${id}`, opts),
}

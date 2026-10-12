import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http'

export interface SystemSettings {
  companyName?: string | null
  taxCode?: string | null
  address?: string | null
  hotline?: string | null
  email?: string | null
  website?: string | null
  documentFooter?: string | null
  maxFailedLogins: number
  lockMinutes: number
  feeNoticeEmail: boolean
  updatedAt?: string | null
  updatedBy?: string | null
  version: number
}

export type SettingsRequest = Omit<SystemSettings, 'updatedAt' | 'updatedBy'>

export const settingApi = {
  get: () => http.get<SystemSettings>('/settings', { skipBuildingContext: true }).then((r) => r.data),
  save: (body: SettingsRequest) => http.put<SystemSettings>('/settings', body, { skipBuildingContext: true }).then((r) => r.data),
}

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: settingApi.get })
}

export function useSaveSettings() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: settingApi.save, onSuccess: (data) => queryClient.setQueryData(['settings'], data) })
}

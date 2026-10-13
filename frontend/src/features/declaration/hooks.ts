import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assetKeys } from '@/features/asset/hooks'
import { declarationApi, type ListParams } from '@/features/declaration/api'
import type { ApproveRequest } from '@/features/declaration/types'
import { residentKeys } from '@/features/resident/hooks'
import { useBuildingStore } from '@/stores/buildingStore'

export const declarationKeys = {
  all: ['declarations'] as const,
  list: (params: ListParams, buildingId: number | null) => [...declarationKeys.all, 'list', buildingId, params] as const,
  detail: (id: number) => [...declarationKeys.all, 'detail', id] as const,
}

export function useDeclarations(params: ListParams) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: declarationKeys.list(params, buildingId),
    queryFn: () => declarationApi.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useDeclaration(id: number | undefined) {
  return useQuery({ queryKey: declarationKeys.detail(id ?? 0), enabled: id != null, queryFn: () => declarationApi.get(id!) })
}

export type DeclarationAction =
  | { type: 'approve'; id: number; body: ApproveRequest }
  | { type: 'reject'; id: number; reason: string; version: number }

/** Duyệt tạo cư dân / hạng mục xe nên làm mới cả danh sách cư dân và hạng mục. */
export function useDeclarationAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (a: DeclarationAction) =>
      a.type === 'approve' ? declarationApi.approve(a.id, a.body) : declarationApi.reject(a.id, a.reason, a.version),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: declarationKeys.all })
      void qc.invalidateQueries({ queryKey: residentKeys.all })
      void qc.invalidateQueries({ queryKey: assetKeys.all })
    },
  })
}

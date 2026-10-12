import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { surveyApi, type ListParams } from '@/features/survey/api'
import type { ResponseRequest, SurveyRequest } from '@/features/survey/types'
import { useBuildingStore } from '@/stores/buildingStore'

export const surveyKeys = {
  all: ['surveys'] as const,
  list: (params: ListParams, buildingId: number | null) => [...surveyKeys.all, 'list', buildingId, params] as const,
  detail: (id: number) => [...surveyKeys.all, 'detail', id] as const,
  results: (id: number) => [...surveyKeys.all, 'results', id] as const,
  responses: (id: number, params: ListParams) => [...surveyKeys.all, 'responses', id, params] as const,
}

export function useSurveys(params: ListParams) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({ queryKey: surveyKeys.list(params, buildingId), queryFn: () => surveyApi.list(params), placeholderData: keepPreviousData })
}

export function useSurvey(id: number | undefined) {
  return useQuery({ queryKey: surveyKeys.detail(id ?? 0), enabled: id != null, queryFn: () => surveyApi.get(id!) })
}

export function useSurveyResults(id: number | undefined) {
  return useQuery({ queryKey: surveyKeys.results(id ?? 0), enabled: id != null, queryFn: () => surveyApi.results(id!) })
}

export function useSurveyResponses(id: number | undefined, params: ListParams) {
  return useQuery({
    queryKey: surveyKeys.responses(id ?? 0, params),
    enabled: id != null,
    queryFn: () => surveyApi.responses(id!, params),
    placeholderData: keepPreviousData,
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: surveyKeys.all })
}

export function useSaveSurvey() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: SurveyRequest }) => surveyApi.save(id, body),
    onSuccess: invalidate,
  })
}

export function useSurveyAction() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ type, id, version }: { type: 'publish' | 'close' | 'delete'; id: number; version: number }): Promise<void> => {
      if (type === 'publish') await surveyApi.publish(id, version)
      else if (type === 'close') await surveyApi.close(id, version)
      else await surveyApi.remove(id)
    },
    onSuccess: invalidate,
  })
}

export function useSubmitResponse() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ResponseRequest }) => surveyApi.submit(id, body),
    onSuccess: invalidate,
  })
}

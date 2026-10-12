import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bookingApi, type ListParams } from '@/features/booking/api'
import type { BookingRequest } from '@/features/booking/types'
import type { PaymentMethod } from '@/features/transaction/types'
import { useBuildingStore } from '@/stores/buildingStore'

export const bookingKeys = {
  all: ['amenity-bookings'] as const,
  list: (params: ListParams, buildingId: number | null) => [...bookingKeys.all, 'list', buildingId, params] as const,
  detail: (id: number) => [...bookingKeys.all, 'detail', id] as const,
  availability: (amenityId: number, from: string, days: number) => [...bookingKeys.all, 'availability', amenityId, from, days] as const,
  calendar: (amenityId: number, from: string, days: number) => [...bookingKeys.all, 'calendar', amenityId, from, days] as const,
}

export function useBookings(params: ListParams, enabled = true) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: bookingKeys.list(params, buildingId),
    queryFn: () => bookingApi.list(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useBooking(id: number | undefined) {
  return useQuery({ queryKey: bookingKeys.detail(id ?? 0), enabled: id != null, queryFn: () => bookingApi.get(id!) })
}

export function useAvailability(amenityId: number | undefined, from: string | undefined, days = 1) {
  return useQuery({
    queryKey: bookingKeys.availability(amenityId ?? 0, from ?? '', days),
    enabled: amenityId != null && !!from,
    queryFn: () => bookingApi.availability(amenityId!, from!, days),
  })
}

export function useBookingCalendar(amenityId: number | undefined, from: string, days = 7) {
  return useQuery({
    queryKey: bookingKeys.calendar(amenityId ?? 0, from, days),
    enabled: amenityId != null,
    queryFn: () => bookingApi.calendar(amenityId!, from, days),
    placeholderData: keepPreviousData,
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['transactions'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

export function useCreateBooking() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (body: BookingRequest) => bookingApi.create(body), onSuccess: invalidate })
}

type Action =
  | { type: 'approve'; id: number; version: number }
  | { type: 'complete'; id: number; version: number }
  | { type: 'reject' | 'cancel'; id: number; version: number; reason: string }
  | { type: 'pay'; id: number; method: PaymentMethod }

/** Duyệt / từ chối / huỷ / hoàn thành / thu phí. */
export function useBookingAction() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (a: Action) => {
      switch (a.type) {
        case 'approve':
          return bookingApi.approve(a.id, a.version)
        case 'complete':
          return bookingApi.complete(a.id, a.version)
        case 'reject':
          return bookingApi.reject(a.id, a.reason, a.version)
        case 'cancel':
          return bookingApi.cancel(a.id, a.reason, a.version)
        case 'pay':
          return bookingApi.pay(a.id, a.method)
      }
    },
    onSuccess: invalidate,
  })
}

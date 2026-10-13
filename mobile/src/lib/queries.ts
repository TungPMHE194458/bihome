import { useQuery } from '@tanstack/react-query'
import { useApartment } from '@/lib/auth'
import { api } from '@/lib/resident'

/** Khoá query có 'apt' + id căn: đổi căn thì AuthProvider xoá các query này. */
export function useHome() {
  const apt = useApartment()
  return useQuery({ queryKey: ['apt', apt.id, 'home'], queryFn: () => api.home(apt.id) })
}

export function useFeeNotices() {
  const apt = useApartment()
  return useQuery({ queryKey: ['apt', apt.id, 'fees'], queryFn: () => api.feeNotices(apt.id) })
}

export function useTickets() {
  const apt = useApartment()
  return useQuery({ queryKey: ['apt', apt.id, 'tickets'], queryFn: () => api.tickets(apt.id) })
}

export function useAmenities() {
  const apt = useApartment()
  return useQuery({ queryKey: ['apt', apt.id, 'amenities'], queryFn: () => api.amenities(apt.id) })
}

export function useBookings() {
  const apt = useApartment()
  return useQuery({ queryKey: ['apt', apt.id, 'bookings'], queryFn: () => api.bookings(apt.id) })
}

export function useInbox() {
  return useQuery({ queryKey: ['inbox'], queryFn: () => api.inbox() })
}

export function useUnreadCount() {
  return useQuery({ queryKey: ['inbox', 'unread'], queryFn: () => api.unreadCount(), refetchInterval: 60_000 })
}

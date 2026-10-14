import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorView, Loading, SectionTitle } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { BOOKING_STATUS, DECLARATION_STATUS, ORDER_STATUS, RELATIONSHIP } from '@/lib/constants'
import { formatDate, formatDateTime, money, timeAgo } from '@/lib/format'
import { usePendingCounts } from '@/lib/queries'
import { bookingApi, declarationApi, serviceApi } from '@/lib/staff'
import { colors } from '@/theme'

type Kind = 'bookings' | 'declarations' | 'orders'

export default function ApprovalsScreen() {
  const pending = usePendingCounts()
  const tabs = [
    pending.canBooking && { value: 'bookings' as Kind, label: 'Tiện ích', count: pending.bookings },
    pending.canDeclaration && { value: 'declarations' as Kind, label: 'Kê khai', count: pending.declarations },
    pending.canOrder && { value: 'orders' as Kind, label: 'Dịch vụ', count: pending.orders },
  ].filter((t): t is { value: Kind; label: string; count: number } => !!t)
  const [kind, setKind] = useState<Kind>(tabs[0]?.value ?? 'bookings')

  return (
    <Screen>
      <BuildingBar />
      <FilterChips items={tabs} value={kind} onChange={setKind} />
      {kind === 'bookings' && <Bookings />}
      {kind === 'declarations' && <Declarations />}
      {kind === 'orders' && <Orders />}
    </Screen>
  )
}

function Bookings() {
  const { buildingId } = useAuth()
  const q = useQuery({ queryKey: ['bookings', 'pending', buildingId], queryFn: () => bookingApi.list({ status: 'PENDING', sort: 'bookingDate,asc' }) })
  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorView message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
  const items = q.data?.content ?? []
  if (!items.length) return <EmptyState icon="calendar-check" message="Không có đăng ký tiện ích nào chờ duyệt." />
  return (
    <View style={{ gap: 10 }}>
      {items.map((b) => (
        <ListRow
          key={b.id}
          icon="calendar-clock"
          iconColor={colors.warning}
          title={`${b.amenityName} · ${b.startTime}–${b.endTime} ${formatDate(b.bookingDate)}`}
          subtitle={`Căn ${b.apartmentCode}${b.residentName ? ` · ${b.residentName}` : ''} · ${b.peopleCount} người`}
          meta={`${b.code} · ${b.total ? money(b.total) : 'Miễn phí'} · gửi ${timeAgo(b.createdAt)}`}
          chip={BOOKING_STATUS[b.status]}
          onPress={() => router.push(`/bookings/${b.id}`)}
        />
      ))}
    </View>
  )
}

function Declarations() {
  const { buildingId } = useAuth()
  const q = useQuery({ queryKey: ['declarations', 'pending', buildingId], queryFn: () => declarationApi.list({ status: 'PENDING' }) })
  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorView message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
  const items = q.data?.content ?? []
  if (!items.length) return <EmptyState icon="clipboard-check-outline" message="Không có phiếu kê khai nào chờ duyệt." />
  return (
    <View style={{ gap: 10 }}>
      {items.map((d) => (
        <ListRow
          key={d.id}
          icon={d.type === 'MEMBER' ? 'account-plus-outline' : 'car-info'}
          title={
            d.type === 'MEMBER'
              ? `Thành viên: ${d.fullName ?? ''}${d.relationship ? ` (${RELATIONSHIP[d.relationship]})` : ''}`
              : `Xe: ${d.vehicleName ?? ''}${d.plateNumber ? ` · ${d.plateNumber}` : ''}`
          }
          subtitle={`Căn ${d.apartmentCode} · gửi bởi ${d.submittedByName ?? 'cư dân'}`}
          meta={`${d.code} · ${timeAgo(d.createdAt)}`}
          chip={DECLARATION_STATUS[d.status]}
          onPress={() => router.push(`/declarations/${d.id}`)}
        />
      ))}
    </View>
  )
}

function Orders() {
  const { buildingId } = useAuth()
  const pendingQ = useQuery({ queryKey: ['orders', 'PENDING', buildingId], queryFn: () => serviceApi.orders({ status: 'PENDING' }) })
  const confirmedQ = useQuery({ queryKey: ['orders', 'CONFIRMED', buildingId], queryFn: () => serviceApi.orders({ status: 'CONFIRMED' }) })
  if (pendingQ.isLoading) return <Loading />
  if (pendingQ.error) return <ErrorView message={errorMessage(pendingQ.error)} onRetry={() => void pendingQ.refetch()} />
  const sections = [
    { title: 'Chờ xác nhận', items: pendingQ.data?.content ?? [] },
    { title: 'Đã xác nhận – chờ hoàn thành', items: confirmedQ.data?.content ?? [] },
  ]
  if (!sections.some((s) => s.items.length)) return <EmptyState icon="room-service-outline" message="Không có đơn dịch vụ nào cần xử lý." />
  return (
    <View style={{ gap: 10 }}>
      {sections
        .filter((s) => s.items.length)
        .map((s) => (
          <View key={s.title} style={{ gap: 10 }}>
            <SectionTitle title={s.title} />
            {s.items.map((o) => (
              <ListRow
                key={o.id}
                icon="room-service-outline"
                title={`${o.serviceName} × ${o.quantity} ${o.unit}`}
                subtitle={`Căn ${o.apartmentCode}${o.residentName ? ` · ${o.residentName}` : ''}${o.scheduledAt ? ` · hẹn ${formatDateTime(o.scheduledAt)}` : ''}`}
                meta={`${o.code} · ${money(o.total)}`}
                chip={ORDER_STATUS[o.status]}
                onPress={() => router.push(`/orders/${o.id}`)}
              />
            ))}
          </View>
        ))}
    </View>
  )
}

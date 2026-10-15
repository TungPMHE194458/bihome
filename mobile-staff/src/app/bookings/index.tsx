import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { Button, EmptyState, ErrorView, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { BOOKING_STATUS } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { bookingApi } from '@/lib/staff'
import type { BookingStatus } from '@/lib/types'
import { colors } from '@/theme'

type StatusFilter = 'any' | BookingStatus

export default function BookingsScreen() {
  const { can, buildingId } = useAuth()
  const [status, setStatus] = useState<StatusFilter>('any')

  const query = useInfiniteQuery({
    queryKey: ['bookings', buildingId, status],
    queryFn: ({ pageParam }) => bookingApi.list({ page: pageParam, status: status === 'any' ? undefined : status, sort: 'bookingDate,desc' }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
  const items = query.data?.pages.flatMap((p) => p.content) ?? []

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(b) => String(b.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <BuildingBar />
            <FilterChips
              items={[
                { value: 'any', label: 'Tất cả' },
                { value: 'PENDING', label: BOOKING_STATUS.PENDING.label },
                { value: 'APPROVED', label: BOOKING_STATUS.APPROVED.label },
                { value: 'COMPLETED', label: BOOKING_STATUS.COMPLETED.label },
                { value: 'REJECTED', label: BOOKING_STATUS.REJECTED.label },
                { value: 'CANCELLED', label: BOOKING_STATUS.CANCELLED.label },
              ]}
              value={status}
              onChange={setStatus}
            />
            {can('AMENITY_BOOKING_WRITE') && <Button title="Tạo lượt đặt" icon="plus" onPress={() => router.push('/bookings/new')} />}
          </View>
        }
        renderItem={({ item: b }) => (
          <ListRow
            icon="calendar-check-outline"
            title={`${b.code} · ${b.amenityName}`}
            subtitle={`Căn ${b.apartmentCode} · ${b.startTime}–${b.endTime} · ${formatDate(b.bookingDate)}`}
            meta={`${b.peopleCount} người`}
            chip={BOOKING_STATUS[b.status]}
            onPress={() => router.push(`/bookings/${b.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="calendar-check-outline" message="Chưa có lượt đặt nào." />
          )
        }
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && void query.fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} tintColor={colors.primary} />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({ list: { padding: 16, gap: 10, paddingBottom: 32 } })

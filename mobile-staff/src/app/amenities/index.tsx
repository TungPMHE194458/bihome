import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { AMENITY_STATUS } from '@/lib/constants'
import { amenityApi } from '@/lib/staff'
import type { ActiveStatus } from '@/lib/types'
import { colors } from '@/theme'

type StatusFilter = 'any' | ActiveStatus

export default function AmenitiesScreen() {
  const { can, buildingId } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('any')

  const query = useInfiniteQuery({
    queryKey: ['amenities', buildingId, status, search],
    queryFn: ({ pageParam }) => amenityApi.list({ page: pageParam, keyword: search, status: status === 'any' ? undefined : status }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
  const items = query.data?.pages.flatMap((p) => p.content) ?? []

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <BuildingBar />
            <TextField
              label="Tìm theo mã, tên"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={() => setSearch(keyword.trim())}
              onBlur={() => setSearch(keyword.trim())}
              returnKeyType="search"
            />
            <FilterChips
              items={[
                { value: 'any', label: 'Tất cả' },
                { value: 'ACTIVE', label: AMENITY_STATUS.ACTIVE.label },
                { value: 'INACTIVE', label: AMENITY_STATUS.INACTIVE.label },
              ]}
              value={status}
              onChange={setStatus}
            />
            {can('AMENITY_WRITE') && <Button title="Thêm tiện ích" icon="plus" onPress={() => router.push('/amenities/new')} />}
          </View>
        }
        renderItem={({ item: a }) => (
          <ListRow
            icon="pool"
            title={`${a.code} · ${a.name}`}
            subtitle={`${a.location ? `${a.location} · ` : ''}Sức chứa ${a.capacity} · ${a.openTime}–${a.closeTime}`}
            meta={a.slotCount === 0 ? 'Chưa cấu hình khung giờ' : `${a.slotCount} khung giờ`}
            chip={AMENITY_STATUS[a.status]}
            onPress={() => router.push(`/amenities/${a.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="pool" message="Chưa có tiện ích nào." />
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

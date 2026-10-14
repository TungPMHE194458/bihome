import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { FilterChips, ListRow } from '@/components/common'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { BUILDING_STATUS, BUILDING_TYPE } from '@/lib/constants'
import { buildingApi } from '@/lib/staff'
import { colors } from '@/theme'

type StatusFilter = 'any' | 'ACTIVE' | 'INACTIVE'

export default function BuildingsScreen() {
  const { can } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('any')

  const query = useInfiniteQuery({
    queryKey: ['buildings', status, search],
    queryFn: ({ pageParam }) =>
      buildingApi.list({ page: pageParam, keyword: search, status: status === 'any' ? undefined : status }),
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
            <TextField
              label="Tìm theo mã, tên, địa chỉ"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={() => setSearch(keyword.trim())}
              onBlur={() => setSearch(keyword.trim())}
              returnKeyType="search"
            />
            <FilterChips
              items={[
                { value: 'any', label: 'Tất cả' },
                { value: 'ACTIVE', label: BUILDING_STATUS.ACTIVE.label },
                { value: 'INACTIVE', label: BUILDING_STATUS.INACTIVE.label },
              ]}
              value={status}
              onChange={setStatus}
            />
            {can('BUILDING_WRITE') && <Button title="Thêm tòa nhà" icon="plus" onPress={() => router.push('/buildings/new')} />}
          </View>
        }
        renderItem={({ item: b }) => (
          <ListRow
            icon="office-building-outline"
            title={`${b.code} · ${b.name}`}
            subtitle={b.fullAddress}
            meta={`${BUILDING_TYPE[b.type].label} · ${b.apartmentCount} căn hộ`}
            chip={BUILDING_STATUS[b.status]}
            onPress={() => router.push(`/buildings/${b.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="office-building-outline" message="Chưa có tòa nhà nào." />
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

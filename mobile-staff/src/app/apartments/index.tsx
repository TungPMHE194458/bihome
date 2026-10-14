import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { APARTMENT_STATUS, USAGE_STATUS } from '@/lib/constants'
import { apartmentApi } from '@/lib/staff'
import type { UsageStatus } from '@/lib/types'
import { colors } from '@/theme'

type UsageFilter = 'any' | UsageStatus

export default function ApartmentsScreen() {
  const { can, buildingId } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [usage, setUsage] = useState<UsageFilter>('any')

  const query = useInfiniteQuery({
    queryKey: ['apartments', buildingId, usage, search],
    queryFn: ({ pageParam }) =>
      apartmentApi.list({ page: pageParam, keyword: search, usageStatus: usage === 'any' ? undefined : usage }),
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
              label="Tìm theo mã, tên căn"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={() => setSearch(keyword.trim())}
              onBlur={() => setSearch(keyword.trim())}
              returnKeyType="search"
            />
            <FilterChips
              items={[{ value: 'any' as const, label: 'Tất cả' }, ...(Object.keys(USAGE_STATUS) as UsageStatus[]).map((v) => ({ value: v, label: USAGE_STATUS[v].label }))]}
              value={usage}
              onChange={setUsage}
            />
            {can('APARTMENT_WRITE') && <Button title="Thêm căn hộ" icon="plus" onPress={() => router.push('/apartments/new')} />}
          </View>
        }
        renderItem={({ item: a }) => (
          <ListRow
            icon="home-outline"
            title={`${a.code} · ${a.name}`}
            subtitle={`${buildingId == null ? `${a.buildingName} · ` : ''}Tầng ${a.floorNo} · ${a.area} m² · ${a.memberCount} người ở`}
            meta={a.ownerName ? `Chủ sở hữu: ${a.ownerName}` : 'Chưa có chủ sở hữu'}
            chip={a.status === 'INACTIVE' ? APARTMENT_STATUS.INACTIVE : USAGE_STATUS[a.usageStatus]}
            onPress={() => router.push(`/apartments/${a.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="home-outline" message="Chưa có căn hộ nào." />
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

import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { CARD_STATUS } from '@/lib/constants'
import { accessCardApi } from '@/lib/staff'
import type { CardStatus } from '@/lib/types'
import { colors } from '@/theme'

type StatusFilter = 'any' | CardStatus

export default function AccessCardsScreen() {
  const { can, buildingId } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('any')

  const query = useInfiniteQuery({
    queryKey: ['access-cards', buildingId, status, search],
    queryFn: ({ pageParam }) => accessCardApi.list({ page: pageParam, keyword: search, status: status === 'any' ? undefined : status }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
  const items = query.data?.pages.flatMap((p) => p.content) ?? []

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <BuildingBar />
            <TextField
              label="Tìm theo mã thẻ"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={() => setSearch(keyword.trim())}
              onBlur={() => setSearch(keyword.trim())}
              returnKeyType="search"
            />
            <FilterChips
              items={[
                { value: 'any', label: 'Tất cả' },
                { value: 'IN_STOCK', label: CARD_STATUS.IN_STOCK.label },
                { value: 'IN_USE', label: CARD_STATUS.IN_USE.label },
                { value: 'LOCKED', label: CARD_STATUS.LOCKED.label },
                { value: 'LOST', label: CARD_STATUS.LOST.label },
                { value: 'REVOKED', label: CARD_STATUS.REVOKED.label },
              ]}
              value={status}
              onChange={setStatus}
            />
            {can('ACCESS_CARD_WRITE') && <Button title="Thêm thẻ từ" icon="plus" onPress={() => router.push('/access-cards/new')} />}
          </View>
        }
        renderItem={({ item: c }) => (
          <ListRow
            icon="card-account-details-outline"
            title={c.cardNo}
            subtitle={c.apartmentCode ? `Căn ${c.apartmentCode}${c.residentName ? ` · ${c.residentName}` : ''}` : 'Chưa gán căn hộ'}
            meta={c.expired ? 'Đã hết hạn' : undefined}
            chip={CARD_STATUS[c.status]}
            highlight={c.expired}
            onPress={() => router.push(`/access-cards/${c.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="card-account-details-outline" message="Chưa có thẻ từ nào." />
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

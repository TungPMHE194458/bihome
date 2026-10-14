import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { VALIDITY, VOUCHER_STATUS } from '@/lib/constants'
import { money } from '@/lib/format'
import { voucherApi } from '@/lib/staff'
import type { Validity } from '@/lib/types'
import { colors } from '@/theme'

type ValidityFilter = 'any' | Validity

export default function VouchersScreen() {
  const { can, buildingId } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [validity, setValidity] = useState<ValidityFilter>('any')

  const query = useInfiniteQuery({
    queryKey: ['vouchers', buildingId, validity, search],
    queryFn: ({ pageParam }) => voucherApi.list({ page: pageParam, keyword: search, validity: validity === 'any' ? undefined : validity }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
  const items = query.data?.pages.flatMap((p) => p.content) ?? []

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(v) => String(v.id)}
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
                { value: 'VALID', label: VALIDITY.VALID.label },
                { value: 'UPCOMING', label: VALIDITY.UPCOMING.label },
                { value: 'EXPIRED', label: VALIDITY.EXPIRED.label },
              ]}
              value={validity}
              onChange={setValidity}
            />
            {can('VOUCHER_WRITE') && <Button title="Thêm voucher" icon="plus" onPress={() => router.push('/vouchers/new')} />}
          </View>
        }
        renderItem={({ item: v }) => (
          <ListRow
            icon="ticket-percent-outline"
            title={`${v.code} · ${v.name}`}
            subtitle={v.discountType === 'PERCENT' ? `Giảm ${v.discountValue}%${v.maxDiscount ? ` (tối đa ${money(v.maxDiscount)})` : ''}` : `Giảm ${money(v.discountValue)}`}
            meta={`Đã dùng ${v.usedCount}${v.totalQuantity ? `/${v.totalQuantity}` : ''}${v.soldOut ? ' · Hết lượt' : ''}`}
            chip={v.status === 'INACTIVE' ? VOUCHER_STATUS.INACTIVE : VALIDITY[v.validity]}
            onPress={() => router.push(`/vouchers/${v.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="ticket-percent-outline" message="Chưa có voucher nào." />
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

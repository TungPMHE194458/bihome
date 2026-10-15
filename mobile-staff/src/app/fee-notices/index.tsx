import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { FEE_NOTICE_STATUS } from '@/lib/constants'
import { feeNoticeApi } from '@/lib/staff'
import { formatDate, money, periodLabel } from '@/lib/format'
import type { FeeNoticeStatus } from '@/lib/types'
import { colors } from '@/theme'

type StatusFilter = 'any' | 'unpaid' | FeeNoticeStatus

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'any', label: 'Tất cả' },
  { value: 'unpaid', label: 'Còn nợ' },
  { value: 'DRAFT', label: FEE_NOTICE_STATUS.DRAFT.label },
  { value: 'ISSUED', label: FEE_NOTICE_STATUS.ISSUED.label },
  { value: 'PARTIAL', label: FEE_NOTICE_STATUS.PARTIAL.label },
  { value: 'PAID', label: FEE_NOTICE_STATUS.PAID.label },
  { value: 'OVERDUE', label: FEE_NOTICE_STATUS.OVERDUE.label },
  { value: 'CANCELLED', label: FEE_NOTICE_STATUS.CANCELLED.label },
]

export default function FeeNoticesScreen() {
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('unpaid')

  const query = useInfiniteQuery({
    queryKey: ['fee-notices', status, search],
    queryFn: ({ pageParam }) =>
      feeNoticeApi.list({
        page: pageParam,
        keyword: search,
        status: status === 'any' || status === 'unpaid' ? undefined : status,
        unpaid: status === 'unpaid' ? true : undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
  const items = query.data?.pages.flatMap((p) => p.content) ?? []

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <BuildingBar />
            <TextField
              label="Tìm theo mã, căn hộ"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={() => setSearch(keyword.trim())}
              onBlur={() => setSearch(keyword.trim())}
              returnKeyType="search"
            />
            <FilterChips items={FILTERS} value={status} onChange={setStatus} />
          </View>
        }
        renderItem={({ item: n }) => (
          <ListRow
            icon="file-chart-outline"
            title={`${n.code} · Căn ${n.apartmentCode}`}
            subtitle={`${periodLabel(n.period)}${n.holderName ? ` · ${n.holderName}` : ''} · Hạn ${formatDate(n.dueDate)}`}
            meta={n.outstanding > 0 ? `Còn nợ ${money(n.outstanding)}` : `Tổng ${money(n.totalAmount)}`}
            chip={FEE_NOTICE_STATUS[n.status]}
            highlight={n.status === 'OVERDUE'}
            onPress={() => router.push(`/fee-notices/${n.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="file-chart-outline" message="Không có thông báo phí nào." />
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

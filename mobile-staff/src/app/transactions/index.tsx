import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { transactionApi } from '@/lib/api/transaction'
import { useAuth } from '@/lib/auth'
import { PAYMENT_METHOD, TRANSACTION_SOURCE, TRANSACTION_STATUS } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { timeAgo } from '@/lib/format'
import type { TransactionStatus } from '@/lib/types'
import { colors } from '@/theme'

type StatusFilter = 'any' | TransactionStatus

export default function TransactionsScreen() {
  const { can, buildingId } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('any')
  const [exporting, setExporting] = useState(false)

  const query = useInfiniteQuery({
    queryKey: ['transactions', buildingId, status, search],
    queryFn: ({ pageParam }) => transactionApi.list({ page: pageParam, keyword: search, status: status === 'any' ? undefined : status, sort: 'createdAt,desc' }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
  const items = query.data?.pages.flatMap((p) => p.content) ?? []

  const exportExcel = async () => {
    setExporting(true)
    try {
      await transactionApi.export({ keyword: search, status: status === 'any' ? undefined : status })
    } catch (e) {
      notify('Không xuất được', errorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <BuildingBar />
            <TextField
              label="Tìm theo mã"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={() => setSearch(keyword.trim())}
              onBlur={() => setSearch(keyword.trim())}
              returnKeyType="search"
            />
            <FilterChips
              items={[
                { value: 'any', label: 'Tất cả' },
                { value: 'PENDING', label: TRANSACTION_STATUS.PENDING.label },
                { value: 'PAID', label: TRANSACTION_STATUS.PAID.label },
                { value: 'CANCELLED', label: TRANSACTION_STATUS.CANCELLED.label },
                { value: 'REFUNDED', label: TRANSACTION_STATUS.REFUNDED.label },
              ]}
              value={status}
              onChange={setStatus}
            />
            {can('TRANSACTION_EXPORT') && <Button title="Xuất Excel" icon="file-excel-outline" variant="outline" onPress={() => void exportExcel()} loading={exporting} />}
          </View>
        }
        renderItem={({ item: t }) => (
          <ListRow
            icon="cash-multiple"
            title={`${t.code} · ${t.amount.toLocaleString('vi-VN')} đ`}
            subtitle={`${TRANSACTION_SOURCE[t.sourceType]} · ${t.sourceCode}${t.apartmentCode ? ` · Căn ${t.apartmentCode}` : ''}`}
            meta={`${t.method ? `${PAYMENT_METHOD[t.method]} · ` : ''}${timeAgo(t.createdAt)}`}
            chip={TRANSACTION_STATUS[t.status]}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="cash-multiple" message="Chưa có giao dịch nào." />
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

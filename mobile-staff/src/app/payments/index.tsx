import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { PAYMENT_METHOD, RECONCILE_STATUS } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { timeAgo } from '@/lib/format'
import { paymentApi } from '@/lib/staff'
import type { PaymentRecordStatus } from '@/lib/types'
import { colors } from '@/theme'

type StatusFilter = 'any' | PaymentRecordStatus | 'PENDING_RECONCILE'

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'any', label: 'Tất cả' },
  { value: 'VALID', label: 'Hợp lệ' },
  { value: 'PENDING_RECONCILE', label: 'Chờ khớp' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
]

export default function PaymentsScreen() {
  const { can } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('any')
  const [exporting, setExporting] = useState(false)

  const query = useInfiniteQuery({
    queryKey: ['payments', status, search],
    queryFn: ({ pageParam }) =>
      paymentApi.list({
        page: pageParam,
        keyword: search,
        status: status === 'VALID' || status === 'CANCELLED' ? status : undefined,
        reconcileStatus: status === 'PENDING_RECONCILE' ? 'PENDING' : undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
  const items = query.data?.pages.flatMap((p) => p.content) ?? []

  const exportExcel = async () => {
    setExporting(true)
    try {
      await paymentApi.export({
        keyword: search,
        status: status === 'VALID' || status === 'CANCELLED' ? status : undefined,
        reconcileStatus: status === 'PENDING_RECONCILE' ? 'PENDING' : undefined,
      })
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
        keyExtractor={(p) => String(p.id)}
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
            {can('PAYMENT_EXPORT') && <Button title="Xuất Excel" icon="file-excel-outline" variant="outline" onPress={() => void exportExcel()} loading={exporting} />}
          </View>
        }
        renderItem={({ item: p }) => (
          <ListRow
            icon="receipt-text-outline"
            title={`${p.code} · ${p.amount.toLocaleString('vi-VN')} đ`}
            subtitle={`${p.feeNoticeCode} · Căn ${p.apartmentCode} · ${PAYMENT_METHOD[p.method]}`}
            meta={`${p.collectorName} · ${timeAgo(p.paidAt)}${p.status === 'CANCELLED' ? ' · Đã huỷ' : ''}`}
            chip={RECONCILE_STATUS[p.reconcileStatus]}
            onPress={() => router.push(`/payments/${p.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="receipt-text-outline" message="Chưa có phiếu thu nào." />
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

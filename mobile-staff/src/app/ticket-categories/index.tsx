import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { FilterChips, ListRow } from '@/components/common'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { TICKET_CATEGORY_STATUS, formatHours } from '@/lib/constants'
import { ticketApi } from '@/lib/staff'
import type { ActiveStatus } from '@/lib/types'
import { colors } from '@/theme'

type StatusFilter = 'any' | ActiveStatus

export default function TicketCategoriesScreen() {
  const { can } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('any')

  const query = useInfiniteQuery({
    queryKey: ['ticket-categories', status, search],
    queryFn: ({ pageParam }) => ticketApi.categories({ page: pageParam, keyword: search, status: status === 'any' ? undefined : status }),
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
            <TextField
              label="Tìm theo tên"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={() => setSearch(keyword.trim())}
              onBlur={() => setSearch(keyword.trim())}
              returnKeyType="search"
            />
            <FilterChips
              items={[
                { value: 'any', label: 'Tất cả' },
                { value: 'ACTIVE', label: TICKET_CATEGORY_STATUS.ACTIVE.label },
                { value: 'INACTIVE', label: TICKET_CATEGORY_STATUS.INACTIVE.label },
              ]}
              value={status}
              onChange={setStatus}
            />
            {can('TICKET_WRITE') && <Button title="Thêm danh mục" icon="plus" onPress={() => router.push('/ticket-categories/new')} />}
          </View>
        }
        renderItem={({ item: c }) => (
          <ListRow
            icon="format-list-bulleted"
            title={c.name}
            subtitle={`Phản hồi ${formatHours(c.responseSlaHours)} · Xử lý ${formatHours(c.resolutionSlaHours)}`}
            meta={`${c.ticketCount} yêu cầu`}
            chip={TICKET_CATEGORY_STATUS[c.status]}
            onPress={() => router.push(`/ticket-categories/${c.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="format-list-bulleted" message="Chưa có danh mục yêu cầu nào." />
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

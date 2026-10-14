import { useInfiniteQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { TICKET_PRIORITY, TICKET_STATUS } from '@/lib/constants'
import { timeAgo } from '@/lib/format'
import { api } from '@/lib/staff'
import type { TicketStatus } from '@/lib/types'
import { colors } from '@/theme'

type Scope = 'mine' | 'unassigned' | 'overdue' | 'all'
type StatusFilter = 'any' | TicketStatus

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'mine', label: 'Của tôi' },
  { value: 'unassigned', label: 'Chưa giao' },
  { value: 'overdue', label: 'Quá hạn' },
  { value: 'all', label: 'Tất cả' },
]

const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: 'any', label: 'Mọi trạng thái' },
  ...(['NEW', 'RECEIVED', 'IN_PROGRESS', 'WAITING', 'DONE'] as TicketStatus[]).map((s) => ({
    value: s,
    label: TICKET_STATUS[s].label,
  })),
]

export default function TicketsScreen() {
  const { me, buildingId } = useAuth()
  const params = useLocalSearchParams<{ filter?: Scope }>()
  const [scope, setScope] = useState<Scope>(params.filter ?? 'mine')
  const [status, setStatus] = useState<StatusFilter>('any')
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')

  // Mở từ Tổng quan với ?filter=… thì đổi bộ lọc theo (cập nhật ngay khi render, không qua effect).
  const [lastFilter, setLastFilter] = useState(params.filter)
  if (params.filter !== lastFilter) {
    setLastFilter(params.filter)
    if (params.filter) setScope(params.filter)
  }

  const query = useInfiniteQuery({
    queryKey: ['tickets', 'list', buildingId, scope, status, search],
    queryFn: ({ pageParam }) =>
      api.tickets({
        page: pageParam,
        keyword: search,
        status: status === 'any' ? undefined : status,
        assigneeId: scope === 'mine' ? me?.id : undefined,
        unassigned: scope === 'unassigned' ? true : undefined,
        overdue: scope === 'overdue' ? true : undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
  const items = query.data?.pages.flatMap((p) => p.content) ?? []

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
              label="Tìm theo mã, tiêu đề, căn hộ"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={() => setSearch(keyword.trim())}
              onBlur={() => setSearch(keyword.trim())}
              returnKeyType="search"
              placeholder="VD: YC-261013, thang máy, A0101"
            />
            <FilterChips items={SCOPES} value={scope} onChange={setScope} />
            <FilterChips items={STATUSES} value={status} onChange={setStatus} />
          </View>
        }
        renderItem={({ item: t }) => (
          <ListRow
            title={t.title}
            subtitle={[
              t.code,
              t.apartmentCode ? `căn ${t.apartmentCode}` : null,
              t.assigneeName ? `giao: ${t.assigneeName}` : 'chưa giao',
              buildingId == null ? t.buildingName : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            meta={`${TICKET_PRIORITY[t.priority].label} · ${t.categoryName} · ${timeAgo(t.createdAt)}${t.overdue ? ' · QUÁ HẠN' : ''}`}
            chip={TICKET_STATUS[t.status]}
            highlight={t.overdue}
            onPress={() => router.push(`/tickets/${t.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="message-check-outline" message="Không có yêu cầu nào." />
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

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, paddingBottom: 32 },
})

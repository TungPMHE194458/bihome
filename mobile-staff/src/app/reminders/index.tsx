import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { AUDIENCE, REMINDER_STATUS, scheduleText } from '@/lib/constants'
import { reminderApi } from '@/lib/staff'
import type { ReminderStatus } from '@/lib/types'
import { colors } from '@/theme'

type StatusFilter = 'any' | ReminderStatus

export default function RemindersScreen() {
  const { can, buildingId } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('any')

  const query = useInfiniteQuery({
    queryKey: ['reminders', buildingId, status, search],
    queryFn: ({ pageParam }) => reminderApi.list({ page: pageParam, keyword: search, status: status === 'any' ? undefined : status }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
  const items = query.data?.pages.flatMap((p) => p.content) ?? []

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <BuildingBar />
            <TextField
              label="Tìm theo tiêu đề"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={() => setSearch(keyword.trim())}
              onBlur={() => setSearch(keyword.trim())}
              returnKeyType="search"
            />
            <FilterChips
              items={[
                { value: 'any', label: 'Tất cả' },
                { value: 'DRAFT', label: REMINDER_STATUS.DRAFT.label },
                { value: 'SCHEDULED', label: REMINDER_STATUS.SCHEDULED.label },
                { value: 'SENT', label: REMINDER_STATUS.SENT.label },
                { value: 'CANCELLED', label: REMINDER_STATUS.CANCELLED.label },
              ]}
              value={status}
              onChange={setStatus}
            />
            {can('REMINDER_WRITE') && <Button title="Thêm nhắc nhở" icon="plus" onPress={() => router.push('/reminders/new')} />}
          </View>
        }
        renderItem={({ item: r }) => (
          <ListRow
            icon="bell-ring-outline"
            title={r.title}
            subtitle={`${AUDIENCE[r.audience]}${r.audience !== 'ALL' ? ` · ${r.targetLabel}` : ''}`}
            meta={`${scheduleText(r)}${r.status === 'SENT' ? ` · ${r.recipientCount} người nhận` : ''}`}
            chip={REMINDER_STATUS[r.status]}
            onPress={() => router.push(`/reminders/${r.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="bell-outline" message="Chưa có nhắc nhở nào." />
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

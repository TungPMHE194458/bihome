import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { ANNOUNCEMENT_AUDIENCE, ANNOUNCEMENT_STATUS } from '@/lib/constants'
import { timeAgo } from '@/lib/format'
import { announcementApi } from '@/lib/staff'
import type { AnnouncementStatus } from '@/lib/types'
import { colors } from '@/theme'

type StatusFilter = 'any' | AnnouncementStatus

export default function AnnouncementsScreen() {
  const { can } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('any')

  const query = useInfiniteQuery({
    queryKey: ['announcements', status, search],
    queryFn: ({ pageParam }) => announcementApi.list({ page: pageParam, keyword: search, status: status === 'any' ? undefined : status }),
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
                { value: 'DRAFT', label: ANNOUNCEMENT_STATUS.DRAFT.label },
                { value: 'SCHEDULED', label: ANNOUNCEMENT_STATUS.SCHEDULED.label },
                { value: 'SENT', label: ANNOUNCEMENT_STATUS.SENT.label },
              ]}
              value={status}
              onChange={setStatus}
            />
            {can('NOTIFICATION_WRITE') && <Button title="Soạn thông báo" icon="plus" onPress={() => router.push('/announcements/new')} />}
          </View>
        }
        renderItem={({ item: a }) => (
          <ListRow
            icon="bullhorn-outline"
            title={a.title}
            subtitle={`${ANNOUNCEMENT_AUDIENCE[a.audience]}${a.sentAt ? ` · ${a.staffCount} nhân viên · ${a.residentCount} cư dân` : ''}`}
            meta={timeAgo(a.sentAt ?? a.scheduledAt ?? a.createdAt)}
            chip={ANNOUNCEMENT_STATUS[a.status]}
            onPress={() => router.push(`/announcements/${a.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="bullhorn-outline" message="Chưa có thông báo nào." />
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

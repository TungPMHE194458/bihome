import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { FilterChips, ListRow } from '@/components/common'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { USER_STATUS } from '@/lib/constants'
import { userApi } from '@/lib/staff'
import type { UserStatus } from '@/lib/types'
import { colors } from '@/theme'

type StatusFilter = 'any' | UserStatus

export default function UsersScreen() {
  const { can } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('any')

  const query = useInfiniteQuery({
    queryKey: ['users', status, search],
    queryFn: ({ pageParam }) => userApi.list({ page: pageParam, keyword: search, status: status === 'any' ? undefined : status }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
  const items = query.data?.pages.flatMap((p) => p.content) ?? []

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <TextField
              label="Tìm theo tên, tên đăng nhập, email"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={() => setSearch(keyword.trim())}
              onBlur={() => setSearch(keyword.trim())}
              returnKeyType="search"
            />
            <FilterChips
              items={[
                { value: 'any', label: 'Tất cả' },
                { value: 'ACTIVE', label: USER_STATUS.ACTIVE.label },
                { value: 'LOCKED', label: USER_STATUS.LOCKED.label },
                { value: 'INACTIVE', label: USER_STATUS.INACTIVE.label },
              ]}
              value={status}
              onChange={setStatus}
            />
            {can('USER_WRITE') && <Button title="Thêm người dùng" icon="plus" onPress={() => router.push('/users/new')} />}
          </View>
        }
        renderItem={({ item: u }) => (
          <ListRow
            icon="account-circle-outline"
            title={u.fullName}
            subtitle={`${u.username} · ${u.email}${u.roles.length ? ` · ${u.roles.map((r) => r.name).join(', ')}` : ''}`}
            meta={u.temporarilyLocked ? 'Tạm khoá do sai mật khẩu nhiều lần' : undefined}
            chip={USER_STATUS[u.status]}
            highlight={u.temporarilyLocked}
            onPress={() => router.push(`/users/${u.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="account-circle-outline" message="Không có người dùng nào." />
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

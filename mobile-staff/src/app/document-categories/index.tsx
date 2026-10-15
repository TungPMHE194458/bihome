import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { FilterChips, ListRow } from '@/components/common'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { DOCUMENT_CATEGORY_STATUS } from '@/lib/constants'
import { documentApi } from '@/lib/staff'
import type { ActiveStatus } from '@/lib/types'
import { colors } from '@/theme'

type StatusFilter = 'any' | ActiveStatus

export default function DocumentCategoriesScreen() {
  const { can } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('any')

  const query = useInfiniteQuery({
    queryKey: ['document-categories', status, search],
    queryFn: ({ pageParam }) => documentApi.categories({ page: pageParam, keyword: search, status: status === 'any' ? undefined : status }),
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
                { value: 'ACTIVE', label: DOCUMENT_CATEGORY_STATUS.ACTIVE.label },
                { value: 'INACTIVE', label: DOCUMENT_CATEGORY_STATUS.INACTIVE.label },
              ]}
              value={status}
              onChange={setStatus}
            />
            {can('DOCUMENT_WRITE') && <Button title="Thêm danh mục" icon="plus" onPress={() => router.push('/document-categories/new')} />}
          </View>
        }
        renderItem={({ item: c }) => (
          <ListRow
            icon="folder-outline"
            iconColor={c.color}
            title={c.name}
            subtitle={c.description}
            meta={`${c.documentCount} tài liệu`}
            chip={DOCUMENT_CATEGORY_STATUS[c.status]}
            onPress={() => router.push(`/document-categories/${c.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="folder-outline" message="Chưa có danh mục tài liệu nào." />
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

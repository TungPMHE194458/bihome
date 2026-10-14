import { useInfiniteQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { DECLARATION_STATUS, RELATIONSHIP } from '@/lib/constants'
import { timeAgo } from '@/lib/format'
import { declarationApi } from '@/lib/staff'
import type { DeclarationStatus } from '@/lib/types'
import { colors } from '@/theme'

type StatusFilter = 'any' | DeclarationStatus

export default function DeclarationsScreen() {
  const { buildingId } = useAuth()
  const params = useLocalSearchParams<{ view?: string }>()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('PENDING')

  useEffect(() => {
    if (params.view) router.push(`/declarations/${params.view}`)
  }, [params.view])

  const query = useInfiniteQuery({
    queryKey: ['declarations', 'list', buildingId, status, search],
    queryFn: ({ pageParam }) =>
      declarationApi.list({ page: pageParam, keyword: search, status: status === 'any' ? undefined : status }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
  const items = query.data?.pages.flatMap((p) => p.content) ?? []

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <BuildingBar />
            <TextField
              label="Tìm theo mã, tên, SĐT, biển số"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={() => setSearch(keyword.trim())}
              onBlur={() => setSearch(keyword.trim())}
              returnKeyType="search"
            />
            <FilterChips
              items={[
                { value: 'any', label: 'Tất cả' },
                { value: 'PENDING', label: DECLARATION_STATUS.PENDING.label },
                { value: 'APPROVED', label: DECLARATION_STATUS.APPROVED.label },
                { value: 'REJECTED', label: DECLARATION_STATUS.REJECTED.label },
                { value: 'CANCELLED', label: DECLARATION_STATUS.CANCELLED.label },
              ]}
              value={status}
              onChange={setStatus}
            />
          </View>
        }
        renderItem={({ item: d }) => (
          <ListRow
            icon={d.type === 'MEMBER' ? 'account-plus-outline' : 'car-info'}
            title={
              d.type === 'MEMBER'
                ? `${d.fullName ?? ''}${d.relationship ? ` (${RELATIONSHIP[d.relationship]})` : ''}`
                : `${d.vehicleName ?? ''}${d.plateNumber ? ` · ${d.plateNumber}` : ''}`
            }
            subtitle={`Căn ${d.apartmentCode} · gửi bởi ${d.submittedByName ?? 'cư dân'}`}
            meta={`${d.code} · ${timeAgo(d.createdAt)}`}
            chip={DECLARATION_STATUS[d.status]}
            highlight={d.status === 'PENDING'}
            onPress={() => router.push(`/declarations/${d.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="clipboard-text-outline" message="Không có phiếu kê khai nào." />
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

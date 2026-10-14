import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { RESIDENCE_STATUS } from '@/lib/constants'
import { residentApi } from '@/lib/staff'
import type { ResidenceStatus } from '@/lib/types'
import { colors } from '@/theme'

type StatusFilter = 'any' | ResidenceStatus

export default function ResidentsScreen() {
  const { can, buildingId } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('any')

  const query = useInfiniteQuery({
    queryKey: ['residents', buildingId, status, search],
    queryFn: ({ pageParam }) =>
      residentApi.list({ page: pageParam, keyword: search, residenceStatus: status === 'any' ? undefined : status }),
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
              label="Tìm theo tên, mã, SĐT"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={() => setSearch(keyword.trim())}
              onBlur={() => setSearch(keyword.trim())}
              returnKeyType="search"
            />
            <FilterChips
              items={[
                { value: 'any', label: 'Tất cả' },
                { value: 'LIVING', label: RESIDENCE_STATUS.LIVING.label },
                { value: 'TEMP_ABSENT', label: RESIDENCE_STATUS.TEMP_ABSENT.label },
                { value: 'MOVED_OUT', label: RESIDENCE_STATUS.MOVED_OUT.label },
              ]}
              value={status}
              onChange={setStatus}
            />
            {can('RESIDENT_WRITE') && <Button title="Thêm cư dân" icon="plus" onPress={() => router.push('/residents/new')} />}
          </View>
        }
        renderItem={({ item: r }) => (
          <ListRow
            icon="account-outline"
            title={r.fullName}
            subtitle={`${r.code} · ${r.phone}${r.apartments[0] ? ` · Căn ${r.apartments[0].apartmentCode}${r.apartments.length > 1 ? ` (+${r.apartments.length - 1})` : ''}` : ''}`}
            chip={RESIDENCE_STATUS[r.residenceStatus]}
            onPress={() => router.push(`/residents/${r.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="account-group-outline" message="Chưa có cư dân nào." />
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

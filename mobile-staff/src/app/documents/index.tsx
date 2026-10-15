import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { BuildingBar, ListRow } from '@/components/common'
import { SearchPicker } from '@/components/form'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { DOCUMENT_AUDIENCE } from '@/lib/constants'
import { formatFileSize } from '@/lib/format'
import { documentApi } from '@/lib/staff'
import { colors } from '@/theme'

export default function DocumentsScreen() {
  const { can } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [categoryLabel, setCategoryLabel] = useState<string>()

  const query = useInfiniteQuery({
    queryKey: ['documents', categoryId, search],
    queryFn: ({ pageParam }) => documentApi.list({ page: pageParam, keyword: search, categoryId: categoryId ?? undefined }),
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
              label="Tìm theo mã, tên, thẻ"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={() => setSearch(keyword.trim())}
              onBlur={() => setSearch(keyword.trim())}
              returnKeyType="search"
            />
            <SearchPicker
              label="Danh mục"
              value={categoryId}
              valueLabel={categoryLabel}
              placeholder="Tất cả danh mục"
              onSearch={(k) =>
                documentApi.categoryOptions().then((os) => os.filter((o) => !k || o.name.toLowerCase().includes(k.toLowerCase())).map((o) => ({ value: o.id, label: o.name })))
              }
              onChange={(v, o) => {
                setCategoryId(v)
                setCategoryLabel(o?.label)
              }}
            />
            {can('DOCUMENT_WRITE') && <Button title="Thêm tài liệu" icon="plus" onPress={() => router.push('/documents/new')} />}
          </View>
        }
        renderItem={({ item: d }) => (
          <ListRow
            icon="file-document-outline"
            iconColor={d.categoryColor}
            title={d.name}
            subtitle={`${d.code} · ${d.categoryName} · ${DOCUMENT_AUDIENCE[d.audience]}`}
            meta={`${formatFileSize(d.fileSize)}${d.fileVersionNo > 1 ? ` · v${d.fileVersionNo}` : ''}`}
            onPress={() => router.push(`/documents/${d.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="file-document-outline" message="Chưa có tài liệu nào." />
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

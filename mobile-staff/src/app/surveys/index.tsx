import { useInfiniteQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { AUDIENCE, SURVEY_PHASE, SURVEY_STATUS } from '@/lib/constants'
import { surveyApi } from '@/lib/staff'
import type { SurveyStatus } from '@/lib/types'
import { colors } from '@/theme'

type StatusFilter = 'any' | SurveyStatus

export default function SurveysScreen() {
  const { can, buildingId } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('any')

  const query = useInfiniteQuery({
    queryKey: ['surveys', buildingId, status, search],
    queryFn: ({ pageParam }) => surveyApi.list({ page: pageParam, keyword: search, status: status === 'any' ? undefined : status }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
  const items = query.data?.pages.flatMap((p) => p.content) ?? []

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(s) => String(s.id)}
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
                { value: 'DRAFT', label: SURVEY_STATUS.DRAFT.label },
                { value: 'OPEN', label: SURVEY_STATUS.OPEN.label },
                { value: 'CLOSED', label: SURVEY_STATUS.CLOSED.label },
              ]}
              value={status}
              onChange={setStatus}
            />
            {can('SURVEY_WRITE') && <Button title="Thêm khảo sát" icon="plus" onPress={() => router.push('/surveys/new')} />}
          </View>
        }
        renderItem={({ item: s }) => (
          <ListRow
            icon="poll"
            title={s.title}
            subtitle={`${AUDIENCE[s.audience]}${s.audience !== 'ALL' ? ` · ${s.targetLabel}` : ''} · ${s.questionCount} câu hỏi`}
            meta={`${s.responseCount} phản hồi`}
            chip={s.status === 'OPEN' ? SURVEY_PHASE[s.phase] : SURVEY_STATUS[s.status]}
            onPress={() => router.push(`/surveys/${s.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="poll" message="Chưa có khảo sát nào." />
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

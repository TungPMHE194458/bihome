import { useInfiniteQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { AuditDetailModal } from '@/components/AuditDetailModal'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { Segmented } from '@/components/form'
import { EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { AUDIT_ACTION } from '@/lib/constants'
import { timeAgo } from '@/lib/format'
import { MODULE_LABEL } from '@/lib/modules'
import { auditApi } from '@/lib/staff'
import type { AuditAction, AuditLogEntry } from '@/lib/types'
import { colors } from '@/theme'

type Tab = 'activity' | 'login'
type ActionFilter = 'any' | AuditAction
type LoginFilter = 'any' | 'success' | 'failed'

export default function AuditLogsScreen() {
  const { can } = useAuth()
  const [tab, setTab] = useState<Tab>('activity')
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<ActionFilter>('any')
  const [loginResult, setLoginResult] = useState<LoginFilter>('any')
  const [viewing, setViewing] = useState<AuditLogEntry | null>(null)

  const activity = useInfiniteQuery({
    queryKey: ['audit-logs', search, action],
    queryFn: ({ pageParam }) => auditApi.list({ page: pageParam, keyword: search, action: action === 'any' ? undefined : action }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    enabled: tab === 'activity',
  })
  const logins = useInfiniteQuery({
    queryKey: ['login-history', search, loginResult],
    queryFn: ({ pageParam }) =>
      auditApi.logins({ page: pageParam, keyword: search, success: loginResult === 'any' ? undefined : loginResult === 'success' }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    enabled: tab === 'login' && can('USER_READ'),
  })

  return (
    <View style={{ flex: 1 }}>
      {tab === 'activity' ? (
        <FlatList
          data={activity.data?.pages.flatMap((p) => p.content) ?? []}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Header
              tab={tab}
              setTab={setTab}
              keyword={keyword}
              setKeyword={setKeyword}
              setSearch={setSearch}
              showLoginTab={can('USER_READ')}
            >
              <FilterChips
                items={[
                  { value: 'any', label: 'Tất cả' },
                  { value: 'CREATE', label: AUDIT_ACTION.CREATE.label },
                  { value: 'UPDATE', label: AUDIT_ACTION.UPDATE.label },
                  { value: 'STATUS_CHANGE', label: AUDIT_ACTION.STATUS_CHANGE.label },
                  { value: 'DELETE', label: AUDIT_ACTION.DELETE.label },
                ]}
                value={action}
                onChange={setAction}
              />
            </Header>
          }
          renderItem={({ item: e }) => (
            <ListRow
              icon="history"
              title={e.entityLabel ?? `${e.entityType} #${e.entityId}`}
              subtitle={`${MODULE_LABEL[e.module] ?? e.module} · ${e.actorName ?? e.actorUsername ?? 'Hệ thống'}`}
              meta={timeAgo(e.occurredAt)}
              chip={AUDIT_ACTION[e.action]}
              onPress={() => setViewing(e)}
            />
          )}
          ListEmptyComponent={
            activity.isLoading ? (
              <Loading />
            ) : activity.error ? (
              <ErrorView message={errorMessage(activity.error)} onRetry={() => void activity.refetch()} />
            ) : (
              <EmptyState icon="history" message="Chưa có hoạt động nào." />
            )
          }
          onEndReached={() => activity.hasNextPage && !activity.isFetchingNextPage && void activity.fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={activity.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null}
          refreshControl={<RefreshControl refreshing={activity.isRefetching && !activity.isFetchingNextPage} onRefresh={() => void activity.refetch()} tintColor={colors.primary} />}
        />
      ) : (
        <FlatList
          data={logins.data?.pages.flatMap((p) => p.content) ?? []}
          keyExtractor={(l) => String(l.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Header
              tab={tab}
              setTab={setTab}
              keyword={keyword}
              setKeyword={setKeyword}
              setSearch={setSearch}
              showLoginTab={can('USER_READ')}
            >
              <FilterChips
                items={[
                  { value: 'any', label: 'Tất cả' },
                  { value: 'success', label: 'Thành công' },
                  { value: 'failed', label: 'Thất bại' },
                ]}
                value={loginResult}
                onChange={setLoginResult}
              />
            </Header>
          }
          renderItem={({ item: l }) => (
            <ListRow
              icon={l.success ? 'login' : 'alert-circle-outline'}
              title={l.fullName ?? l.loginName}
              subtitle={`${l.loginName}${l.ipAddress ? ` · ${l.ipAddress}` : ''}`}
              meta={`${timeAgo(l.createdAt)}${l.failureReason ? ` · ${l.failureReason}` : ''}`}
              chip={l.success ? { label: 'Thành công', tone: 'success' } : { label: 'Thất bại', tone: 'danger' }}
              highlight={!l.success}
            />
          )}
          ListEmptyComponent={
            logins.isLoading ? (
              <Loading />
            ) : logins.error ? (
              <ErrorView message={errorMessage(logins.error)} onRetry={() => void logins.refetch()} />
            ) : (
              <EmptyState icon="login" message="Chưa có lượt đăng nhập nào." />
            )
          }
          onEndReached={() => logins.hasNextPage && !logins.isFetchingNextPage && void logins.fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={logins.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null}
          refreshControl={<RefreshControl refreshing={logins.isRefetching && !logins.isFetchingNextPage} onRefresh={() => void logins.refetch()} tintColor={colors.primary} />}
        />
      )}
      <AuditDetailModal entry={viewing} onClose={() => setViewing(null)} />
    </View>
  )
}

function Header({
  tab,
  setTab,
  keyword,
  setKeyword,
  setSearch,
  showLoginTab,
  children,
}: {
  tab: Tab
  setTab: (t: Tab) => void
  keyword: string
  setKeyword: (v: string) => void
  setSearch: (v: string) => void
  showLoginTab: boolean
  children: ReactNode
}) {
  return (
    <View style={{ gap: 12 }}>
      <BuildingBar />
      {showLoginTab && (
        <Segmented
          items={[
            { value: 'activity', label: 'Hoạt động' },
            { value: 'login', label: 'Đăng nhập' },
          ]}
          value={tab}
          onChange={setTab}
        />
      )}
      <TextField
        label="Tìm kiếm"
        value={keyword}
        onChangeText={setKeyword}
        onSubmitEditing={() => setSearch(keyword.trim())}
        onBlur={() => setSearch(keyword.trim())}
        returnKeyType="search"
      />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({ list: { padding: 16, gap: 10, paddingBottom: 32 } })

import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { ListRow } from '@/components/common'
import { EmptyState, ErrorView, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { roleApi } from '@/lib/staff'
import { colors } from '@/theme'

export default function RolesScreen() {
  const query = useQuery({ queryKey: ['roles-overview'], queryFn: () => roleApi.overview() })
  const items = query.data ?? []

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item: r }) => (
          <ListRow
            icon="shield-account-outline"
            title={r.name}
            subtitle={r.description}
            meta={r.allPermissions ? 'Toàn bộ quyền hệ thống' : `${r.permissions.length} quyền · ${r.userCount} người dùng`}
            chip={r.system ? { label: 'Vai trò hệ thống', tone: 'info' } : undefined}
            onPress={() => router.push(`/roles/${r.id}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <ErrorView message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="shield-account-outline" message="Chưa có vai trò nào." />
          )
        }
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({ list: { padding: 16, gap: 10, paddingBottom: 32 } })

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorView, Icon, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { NOTIFICATION_ICON } from '@/lib/constants'
import { timeAgo } from '@/lib/format'
import { routeForLink } from '@/lib/push'
import { authApi } from '@/lib/staff'
import type { AppNotification } from '@/lib/types'
import { colors } from '@/theme'

export default function NotificationsScreen() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['notifications', 'list'], queryFn: () => authApi.notifications() })
  const items = list.data?.content ?? []
  const refreshCount = () => qc.invalidateQueries({ queryKey: ['notifications'] })

  const open = async (n: AppNotification) => {
    if (!n.read) {
      void authApi.markRead(n.id).then(refreshCount)
    }
    router.push(routeForLink(n.link) as never)
  }

  return (
    <Screen onRefresh={() => list.refetch()}>
      <Stack.Screen
        options={{
          headerRight: () =>
            items.some((n) => !n.read) ? (
              <Pressable onPress={() => void authApi.markAllRead().then(refreshCount)} hitSlop={8}>
                <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>Đọc tất cả</Text>
              </Pressable>
            ) : null,
        }}
      />
      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorView message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="bell-check-outline" message="Chưa có thông báo." />
      ) : (
        items.map((n) => (
          <Pressable key={n.id} onPress={() => void open(n)} style={[styles.row, !n.read && styles.unread]}>
            <View style={[styles.icon, n.type === 'SOS_ALERT' && { backgroundColor: colors.dangerLight }]}>
              <Icon name={NOTIFICATION_ICON[n.type] ?? 'bell-outline'} size={20} color={n.type === 'SOS_ALERT' ? colors.danger : colors.primaryDark} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.title, !n.read && { fontWeight: '700' }]}>{n.title}</Text>
              {n.body ? (
                <Text style={styles.body} numberOfLines={2}>
                  {n.body}
                </Text>
              ) : null}
              <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
            </View>
            {!n.read && <View style={styles.dot} />}
          </Pressable>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  unread: { backgroundColor: '#F0FDF4' },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, color: colors.text, fontWeight: '500' },
  body: { fontSize: 13, color: colors.textMuted },
  time: { fontSize: 12, color: colors.textMuted },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
})

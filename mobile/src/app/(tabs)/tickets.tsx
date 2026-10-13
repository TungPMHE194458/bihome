import { router, Tabs } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, EmptyState, ErrorView, Icon, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { TICKET_STATUS } from '@/lib/constants'
import { timeAgo } from '@/lib/format'
import { useTickets } from '@/lib/queries'
import { colors } from '@/theme'

export default function TicketsScreen() {
  const tickets = useTickets()
  const items = tickets.data?.content ?? []
  return (
    <Screen onRefresh={() => tickets.refetch()}>
      <Tabs.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/tickets/new')} hitSlop={8} style={{ marginRight: 16 }} accessibilityLabel="Gửi yêu cầu mới">
              <Icon name="plus-circle" size={28} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      {tickets.isLoading ? (
        <Loading />
      ) : tickets.error ? (
        <ErrorView message={errorMessage(tickets.error)} onRetry={() => void tickets.refetch()} />
      ) : items.length === 0 ? (
        <View style={{ gap: 12 }}>
          <EmptyState icon="message-text-outline" message="Bạn chưa gửi yêu cầu nào" />
          <Button title="Gửi yêu cầu" icon="message-plus-outline" onPress={() => router.push('/tickets/new')} />
        </View>
      ) : (
        items.map((t) => (
          <Card key={t.id} onPress={() => router.push(`/tickets/${t.id}`)} style={{ gap: 6 }}>
            <View style={styles.top}>
              <Text style={styles.code}>{t.code}</Text>
              <Chip {...TICKET_STATUS[t.status]} />
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {t.title}
            </Text>
            <Text style={styles.muted}>
              {t.categoryName} · cập nhật {timeAgo(t.updatedAt)}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
})

import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, EmptyState, ErrorView, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useApartment } from '@/lib/auth'
import { SERVICE_ORDER_STATUS } from '@/lib/constants'
import { formatDateTime, money } from '@/lib/format'
import { api } from '@/lib/resident'
import { colors } from '@/theme'

export default function OrdersScreen() {
  const apt = useApartment()
  const orders = useQuery({ queryKey: ['apt', apt.id, 'orders'], queryFn: () => api.orders(apt.id) })
  const items = orders.data?.content ?? []
  return (
    <Screen onRefresh={() => orders.refetch()}>
      {orders.isLoading ? (
        <Loading />
      ) : orders.error ? (
        <ErrorView message={errorMessage(orders.error)} onRetry={() => void orders.refetch()} />
      ) : items.length === 0 ? (
        <View style={{ gap: 12 }}>
          <EmptyState icon="room-service-outline" message="Chưa có đơn dịch vụ nào" />
          <Button title="Xem dịch vụ" onPress={() => router.push('/services')} />
        </View>
      ) : (
        items.map((o) => (
          <Card key={o.id} onPress={() => router.push(`/orders/${o.id}`)} style={{ gap: 4 }}>
            <View style={styles.top}>
              <Text style={styles.name}>{o.serviceName}</Text>
              <Chip {...SERVICE_ORDER_STATUS[o.status]} />
            </View>
            <Text style={styles.muted}>
              {o.code} · {o.quantity} {o.unit} · {money(o.total)}
            </Text>
            <Text style={styles.muted}>{o.scheduledAt ? `Hẹn ${formatDateTime(o.scheduledAt)}` : `Đặt ${formatDateTime(o.createdAt)}`}</Text>
          </Card>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  muted: { fontSize: 13, color: colors.textMuted },
})

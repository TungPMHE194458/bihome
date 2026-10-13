import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { Card, Chip, EmptyState, ErrorView, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useApartment } from '@/lib/auth'
import { PAYMENT_METHOD } from '@/lib/constants'
import { formatDateTime, money, periodLabel } from '@/lib/format'
import { api } from '@/lib/resident'
import { colors } from '@/theme'

export default function PaymentsScreen() {
  const apt = useApartment()
  const payments = useQuery({ queryKey: ['apt', apt.id, 'payments'], queryFn: () => api.payments(apt.id) })
  const items = payments.data?.content ?? []
  return (
    <Screen onRefresh={() => payments.refetch()}>
      {payments.isLoading ? (
        <Loading />
      ) : payments.error ? (
        <ErrorView message={errorMessage(payments.error)} onRetry={() => void payments.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="cash-multiple" message="Chưa có khoản thanh toán nào" />
      ) : (
        items.map((p) => (
          <Card key={p.id} onPress={() => router.push(`/fees/${p.feeNoticeId}`)} style={{ gap: 4 }}>
            <View style={styles.top}>
              <Text style={styles.amount}>{money(p.amount)}</Text>
              {p.status === 'CANCELLED' ? <Chip label="Đã huỷ" tone="neutral" /> : <Chip label={PAYMENT_METHOD[p.method]} tone="success" />}
            </View>
            <Text style={styles.muted}>
              {p.code} · {periodLabel(p.period)} · {p.feeNoticeCode}
            </Text>
            <Text style={styles.muted}>{formatDateTime(p.paidAt)}</Text>
          </Card>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 18, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
})

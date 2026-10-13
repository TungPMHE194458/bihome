import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { Card, Chip, EmptyState, ErrorView, Icon, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { FEE_STATUS } from '@/lib/constants'
import { formatDate, money, periodLabel } from '@/lib/format'
import { useFeeNotices } from '@/lib/queries'
import { colors } from '@/theme'

export default function FeesScreen() {
  const fees = useFeeNotices()
  const items = fees.data?.content ?? []
  return (
    <Screen onRefresh={() => fees.refetch()}>
      <Pressable style={styles.history} onPress={() => router.push('/payments')}>
        <Icon name="history" size={20} color={colors.primaryDark} />
        <Text style={styles.historyText}>Lịch sử thanh toán</Text>
        <Icon name="chevron-right" size={20} color={colors.primaryDark} />
      </Pressable>
      {fees.isLoading ? (
        <Loading />
      ) : fees.error ? (
        <ErrorView message={errorMessage(fees.error)} onRetry={() => void fees.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="file-document-outline" message="Chưa có thông báo phí nào" />
      ) : (
        items.map((n) => {
          const carried = !!n.carriedToId
          return (
            <Card key={n.id} onPress={() => router.push(`/fees/${n.id}`)} style={{ gap: 8 }}>
              <View style={styles.top}>
                <Text style={styles.period}>{periodLabel(n.period)}</Text>
                <Chip {...(carried ? { label: 'Đã chuyển nợ', tone: 'neutral' as const } : FEE_STATUS[n.status])} />
              </View>
              <Text style={styles.code}>
                {n.code} · Căn {n.apartmentCode}
              </Text>
              <View style={styles.top}>
                <View>
                  <Text style={styles.label}>Tổng cộng</Text>
                  <Text style={styles.total}>{money(n.totalAmount)}</Text>
                </View>
                {!carried && n.outstanding > 0 && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.label}>Còn nợ · hạn {formatDate(n.dueDate)}</Text>
                    <Text style={[styles.total, { color: n.status === 'OVERDUE' ? colors.danger : colors.warning }]}>
                      {money(n.outstanding)}
                    </Text>
                  </View>
                )}
              </View>
              {carried && <Text style={styles.label}>Số còn nợ đã chuyển sang thông báo {n.carriedToCode}.</Text>}
            </Card>
          )
        })
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  history: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 12,
  },
  historyText: { flex: 1, color: colors.primaryDark, fontWeight: '600' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  period: { fontSize: 17, fontWeight: '700', color: colors.text },
  code: { fontSize: 13, color: colors.textMuted },
  label: { fontSize: 12, color: colors.textMuted },
  total: { fontSize: 18, fontWeight: '700', color: colors.text },
})

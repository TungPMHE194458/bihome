import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { Card, Chip, EmptyState, ErrorView, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { BOOKING_STATUS } from '@/lib/constants'
import { money, shortDay } from '@/lib/format'
import { useBookings } from '@/lib/queries'
import { colors } from '@/theme'

export default function BookingsScreen() {
  const bookings = useBookings()
  const items = bookings.data?.content ?? []
  return (
    <Screen onRefresh={() => bookings.refetch()}>
      {bookings.isLoading ? (
        <Loading />
      ) : bookings.error ? (
        <ErrorView message={errorMessage(bookings.error)} onRetry={() => void bookings.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="calendar-blank-outline" message="Chưa có lượt đặt tiện ích nào" />
      ) : (
        items.map((b) => (
          <Card key={b.id} onPress={() => router.push(`/bookings/${b.id}`)} style={{ gap: 6 }}>
            <View style={styles.top}>
              <Text style={styles.name}>{b.amenityName}</Text>
              <Chip {...BOOKING_STATUS[b.status]} />
            </View>
            <Text style={styles.time}>
              {shortDay(b.bookingDate)} · {b.startTime}–{b.endTime}
            </Text>
            <Text style={styles.muted}>
              {b.code} · {b.peopleCount} người{b.total > 0 ? ` · ${money(b.total)}` : ''}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  time: { fontSize: 15, color: colors.text, fontWeight: '500' },
  muted: { fontSize: 13, color: colors.textMuted },
})

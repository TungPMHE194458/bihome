import { router, Tabs } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { AuthImage, Card, Chip, EmptyState, ErrorView, Icon, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAmenities } from '@/lib/queries'
import { colors } from '@/theme'

export default function AmenitiesScreen() {
  const amenities = useAmenities()
  const items = amenities.data ?? []
  return (
    <Screen onRefresh={() => amenities.refetch()}>
      <Tabs.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/bookings')} hitSlop={8} style={styles.headerLink}>
              <Text style={styles.headerLinkText}>Lượt đặt</Text>
            </Pressable>
          ),
        }}
      />
      {amenities.isLoading ? (
        <Loading />
      ) : amenities.error ? (
        <ErrorView message={errorMessage(amenities.error)} onRetry={() => void amenities.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="pool" message="Tòa nhà chưa có tiện ích nào" />
      ) : (
        items.map((a) => (
          <Card key={a.id} onPress={() => router.push(`/amenities/${a.id}`)} style={styles.card}>
            <AuthImage url={a.coverImageUrl} style={styles.image} icon="pool" />
            <View style={styles.body}>
              <View style={styles.top}>
                <Text style={styles.name}>{a.name}</Text>
                <Chip {...(a.requiresApproval ? { label: 'Cần duyệt', tone: 'warning' as const } : { label: 'Đặt ngay', tone: 'success' as const })} />
              </View>
              <View style={styles.meta}>
                <Icon name="map-marker-outline" size={16} color={colors.textMuted} />
                <Text style={styles.muted}>{a.location || '—'}</Text>
              </View>
              <View style={styles.meta}>
                <Icon name="clock-outline" size={16} color={colors.textMuted} />
                <Text style={styles.muted}>
                  {a.openTime}–{a.closeTime} · tối đa {a.capacity} người
                </Text>
              </View>
              {a.slotCount === 0 && <Text style={[styles.muted, { color: colors.warning }]}>Chưa mở đặt chỗ</Text>}
            </View>
          </Card>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  headerLink: { marginRight: 16 },
  headerLinkText: { color: colors.primaryDark, fontWeight: '700' },
  card: { padding: 0, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 16 / 9 },
  body: { padding: 14, gap: 6 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  muted: { fontSize: 13, color: colors.textMuted },
})

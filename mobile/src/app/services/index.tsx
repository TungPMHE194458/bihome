import { useQuery } from '@tanstack/react-query'
import { router, Stack } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { AuthImage, Card, Chip, EmptyState, ErrorView, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useApartment } from '@/lib/auth'
import { money } from '@/lib/format'
import { api } from '@/lib/resident'
import { colors } from '@/theme'

export default function ServicesScreen() {
  const apt = useApartment()
  const services = useQuery({ queryKey: ['apt', apt.id, 'services'], queryFn: () => api.services(apt.id) })
  const items = services.data ?? []
  return (
    <Screen onRefresh={() => services.refetch()}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/orders')} hitSlop={8}>
              <Text style={styles.link}>Đơn của tôi</Text>
            </Pressable>
          ),
        }}
      />
      {services.isLoading ? (
        <Loading />
      ) : services.error ? (
        <ErrorView message={errorMessage(services.error)} onRetry={() => void services.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="room-service-outline" message="Tòa nhà chưa có dịch vụ nào" />
      ) : (
        items.map((s) => (
          <Card key={s.id} onPress={() => router.push(`/services/${s.id}`)} style={styles.card}>
            <AuthImage url={s.coverImageUrl} style={styles.image} icon="room-service-outline" />
            <View style={styles.body}>
              <View style={styles.top}>
                <Text style={styles.name}>{s.name}</Text>
                <Chip label={s.serviceTypeName} tone="info" />
              </View>
              <Text style={styles.price}>
                {money(s.unitPrice)} / {s.unit}
              </Text>
              {s.description ? (
                <Text style={styles.muted} numberOfLines={2}>
                  {s.description}
                </Text>
              ) : null}
            </View>
          </Card>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  link: { color: colors.primaryDark, fontWeight: '700' },
  card: { padding: 0, overflow: 'hidden', flexDirection: 'row' },
  image: { width: 110, height: 110 },
  body: { flex: 1, padding: 12, gap: 4 },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  price: { fontSize: 15, fontWeight: '600', color: colors.primaryDark },
  muted: { fontSize: 13, color: colors.textMuted },
})

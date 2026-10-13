import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { Card, Chip, EmptyState, ErrorView, Icon, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useApartment } from '@/lib/auth'
import { DECLARATION_STATUS } from '@/lib/constants'
import { timeAgo } from '@/lib/format'
import { api } from '@/lib/resident'
import { colors } from '@/theme'

export default function DeclarationsScreen() {
  const apt = useApartment()
  const list = useQuery({ queryKey: ['apt', apt.id, 'declarations'], queryFn: () => api.declarations(apt.id) })
  const items = list.data ?? []
  return (
    <Screen onRefresh={() => list.refetch()}>
      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorView message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="clipboard-text-outline" message="Căn hộ chưa có phiếu kê khai nào" />
      ) : (
        items.map((d) => (
          <Card key={d.id} onPress={() => router.push(`/declarations/${d.id}`)} style={styles.row}>
            <Icon name={d.type === 'MEMBER' ? 'account-plus-outline' : 'car-info'} size={26} color={colors.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.name}>{d.type === 'MEMBER' ? d.fullName : d.vehicleName}</Text>
              <Text style={styles.muted}>
                {d.code} · {d.type === 'MEMBER' ? 'Thành viên' : (d.plateNumber ?? 'Xe')} · {timeAgo(d.createdAt)}
              </Text>
            </View>
            <Chip {...DECLARATION_STATUS[d.status]} />
          </Card>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
})

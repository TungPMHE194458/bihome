import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { Card, Icon } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { colors } from '@/theme'

/** Chọn tòa làm việc (như bộ chọn tòa ở header web); "Tất cả" chỉ khi được xem nhiều tòa. */
export default function BuildingPicker() {
  const { buildings, buildingId, canSelectAll, selectBuilding } = useAuth()
  const choose = (id: number | null) => {
    selectBuilding(id)
    router.back()
  }
  const options: { id: number | null; name: string; sub?: string; inactive?: boolean }[] = [
    ...(canSelectAll ? [{ id: null, name: 'Tất cả tòa nhà', sub: 'Xem chung mọi tòa được giao' }] : []),
    ...buildings.map((b) => ({ id: b.id, name: b.name, sub: [b.code, b.address].filter(Boolean).join(' · '), inactive: b.status === 'INACTIVE' })),
  ]
  return (
    <Screen>
      <Card style={{ paddingVertical: 4 }}>
        {options.map((o, i) => {
          const active = o.id === buildingId
          return (
            <Pressable
              key={String(o.id)}
              onPress={() => choose(o.id)}
              style={[styles.item, i < options.length - 1 && styles.divider]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Icon name={o.id == null ? 'domain' : 'office-building-outline'} size={24} color={active ? colors.primary : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, active && { color: colors.primaryDark }]}>
                  {o.name}
                  {o.inactive ? ' (ngừng hoạt động)' : ''}
                </Text>
                {o.sub ? <Text style={styles.sub}>{o.sub}</Text> : null}
              </View>
              {active && <Icon name="check" size={22} color={colors.primary} />}
            </Pressable>
          )
        })}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted },
})

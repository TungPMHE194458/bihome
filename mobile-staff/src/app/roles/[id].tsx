import { useQuery } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { Card, Chip, ErrorView, Icon, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { MODULE_GROUPS, PERMISSION_ACTIONS } from '@/lib/modules'
import { roleApi } from '@/lib/staff'
import { colors } from '@/theme'

export default function RoleDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const role = useQuery({ queryKey: ['role', id], queryFn: () => roleApi.get(id) })

  if (role.isLoading) return <Loading />
  if (role.error || !role.data) return <ErrorView message={errorMessage(role.error)} onRetry={() => void role.refetch()} />
  const r = role.data
  const granted = new Set(r.permissions)

  return (
    <Screen onRefresh={() => role.refetch()}>
      <Stack.Screen options={{ title: r.name }} />
      <Card style={{ gap: 2 }}>
        <View style={styles.top}>
          <Text style={styles.name}>{r.name}</Text>
          {r.system && <Chip label="Vai trò hệ thống" tone="info" />}
        </View>
        <Row label="Mã" value={r.code} />
        <Row label="Số người dùng" value={r.userCount} />
        {r.description ? <Row label="Mô tả" value={r.description} /> : null}
        <Row label="Cập nhật" value={`${formatDateTime(r.updatedAt)}${r.updatedBy ? ` · ${r.updatedBy}` : ''}`} />
      </Card>

      {r.allPermissions ? (
        <Card>
          <Text style={styles.allPerms}>Vai trò này có toàn bộ quyền hệ thống và không sửa được.</Text>
        </Card>
      ) : (
        MODULE_GROUPS.map((g) => (
          <View key={g.label} style={{ gap: 8 }}>
            <Text style={styles.groupTitle}>{g.label}</Text>
            <Card style={{ gap: 10 }}>
              {g.modules.map((m) => {
                const actions = PERMISSION_ACTIONS.filter((a) => granted.has(`${m.code}_${a.code}`))
                if (actions.length === 0) return null
                return (
                  <View key={m.code} style={styles.moduleRow}>
                    <Icon name="check-circle" size={18} color={colors.primaryDark} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moduleLabel}>{m.label}</Text>
                      <Text style={styles.moduleActions}>{actions.map((a) => a.label).join(' · ')}</Text>
                    </View>
                  </View>
                )
              })}
              {g.modules.every((m) => PERMISSION_ACTIONS.every((a) => !granted.has(`${m.code}_${a.code}`))) && (
                <Text style={styles.muted}>Không có quyền trong nhóm này.</Text>
              )}
            </Card>
          </View>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: colors.text, flexShrink: 1 },
  allPerms: { fontSize: 14, color: colors.text },
  groupTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  moduleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  moduleLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  moduleActions: { fontSize: 12, color: colors.textMuted },
  muted: { fontSize: 13, color: colors.textMuted },
})

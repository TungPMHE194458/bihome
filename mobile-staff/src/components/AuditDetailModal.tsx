import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { AUDIT_ACTION } from '@/lib/constants'
import { formatDateTime } from '@/lib/format'
import { MODULE_LABEL } from '@/lib/modules'
import type { AuditLogEntry } from '@/lib/types'
import { colors, radius } from '@/theme'
import { Chip } from '@/components/ui'

export function AuditDetailModal({ entry, onClose }: { entry: AuditLogEntry | null; onClose: () => void }) {
  return (
    <Modal visible={!!entry} animationType="slide" onRequestClose={onClose}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={styles.close}>Đóng</Text>
        </Pressable>
        <Text style={styles.title}>Chi tiết hoạt động</Text>
        <View style={{ width: 44 }} />
      </View>
      {entry && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View style={{ gap: 4 }}>
            <View style={styles.top}>
              <Text style={styles.entity}>{entry.entityLabel ?? `${entry.entityType} #${entry.entityId}`}</Text>
              <Chip {...AUDIT_ACTION[entry.action]} />
            </View>
            <Text style={styles.meta}>
              {MODULE_LABEL[entry.module] ?? entry.module}
              {entry.buildingName ? ` · ${entry.buildingName}` : ''}
            </Text>
            <Text style={styles.meta}>
              {entry.actorName ?? entry.actorUsername ?? 'Hệ thống'} · {formatDateTime(entry.occurredAt)}
              {entry.ipAddress ? ` · ${entry.ipAddress}` : ''}
            </Text>
          </View>

          {entry.changes.length === 0 ? (
            <Text style={styles.muted}>Không có trường nào thay đổi.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {entry.changes.map((c, i) => (
                <View key={i} style={styles.changeRow}>
                  <Text style={styles.field}>{c.field}</Text>
                  <View style={styles.valueRow}>
                    <Text style={styles.oldValue} numberOfLines={3}>{c.oldValue ?? '—'}</Text>
                    <Text style={styles.arrow}>→</Text>
                    <Text style={styles.newValue} numberOfLines={3}>{c.newValue ?? '—'}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </Modal>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  close: { color: colors.primaryDark, fontWeight: '600', fontSize: 15 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entity: { fontSize: 17, fontWeight: '700', color: colors.text, flexShrink: 1 },
  meta: { fontSize: 13, color: colors.textMuted },
  muted: { fontSize: 13, color: colors.textMuted },
  changeRow: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, gap: 6 },
  field: { fontSize: 13, fontWeight: '700', color: colors.text },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  oldValue: { flex: 1, fontSize: 13, color: colors.danger, textDecorationLine: 'line-through' },
  arrow: { fontSize: 13, color: colors.textMuted },
  newValue: { flex: 1, fontSize: 13, color: colors.primaryDark, fontWeight: '600' },
})

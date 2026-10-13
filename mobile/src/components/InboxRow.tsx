import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Icon, type IconName } from '@/components/ui'
import { INBOX_ICON } from '@/lib/constants'
import { timeAgo } from '@/lib/format'
import { api } from '@/lib/resident'
import type { InboxItem } from '@/lib/types'
import { colors } from '@/theme'

/** Một tin trong hộp thư: bấm → đánh dấu đã đọc và mở màn hình liên quan (link do backend gửi). */
export function InboxRow({ item, last }: { item: InboxItem; last?: boolean }) {
  const qc = useQueryClient()
  const open = async () => {
    if (!item.read) {
      try {
        await api.markRead(item.id)
      } finally {
        void qc.invalidateQueries({ queryKey: ['inbox'] })
      }
    }
    if (item.link && item.link !== '/' && item.link !== '/inbox') router.push(item.link as never)
  }
  return (
    <Pressable onPress={() => void open()} style={[styles.row, !last && styles.divider]}>
      <View style={[styles.icon, !item.read && { backgroundColor: colors.primaryLight }]}>
        <Icon name={INBOX_ICON[item.type] as IconName} size={20} color={item.read ? colors.textMuted : colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, !item.read && { fontWeight: '700' }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.body ? (
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
        ) : null}
        <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={styles.dot} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingVertical: 12, alignItems: 'flex-start' },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.neutralLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, color: colors.text },
  body: { fontSize: 13, color: colors.textMuted },
  time: { fontSize: 12, color: colors.textMuted },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
})

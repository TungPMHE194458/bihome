import { router, type Href } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { AuthImage, Card, Icon, type IconName } from '@/components/ui'
import { useAuth, useBuildingName } from '@/lib/auth'
import { APP_VERSION } from '@/lib/config'
import { confirm } from '@/lib/dialogs'
import { useUnreadCount } from '@/lib/queries'
import { colors } from '@/theme'

export default function MoreScreen() {
  const { me, logout } = useAuth()
  const buildingName = useBuildingName()
  const unread = useUnreadCount()
  if (!me) return null

  const items: { icon: IconName; label: string; href: Href; show: boolean; badge?: number }[] = [
    { icon: 'bell-outline', label: 'Thông báo', href: '/notifications', show: true, badge: unread.data?.count },
    { icon: 'office-building-marker-outline', label: `Tòa nhà: ${buildingName}`, href: '/building', show: true },
    { icon: 'lock-reset', label: 'Đổi mật khẩu', href: '/profile-password', show: true },
  ]

  return (
    <Screen>
      <Card style={styles.profile}>
        <AuthImage url={me.profile.avatarUrl} style={styles.avatar} icon="account" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name}>{me.profile.fullName}</Text>
          <Text style={styles.muted}>{me.roles.map((r) => r.name).join(', ')}</Text>
          <Text style={styles.muted}>
            {me.username}
            {me.phone ? ` · ${me.phone}` : ''}
          </Text>
        </View>
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        {items
          .filter((i) => i.show)
          .map((i, idx, arr) => (
            <Pressable
              key={i.label}
              onPress={() => router.push(i.href)}
              style={({ pressed }) => [styles.item, idx < arr.length - 1 && styles.divider, pressed && { opacity: 0.7 }]}
            >
              <Icon name={i.icon} size={22} color={colors.primaryDark} />
              <Text style={styles.itemText} numberOfLines={1}>
                {i.label}
              </Text>
              {i.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{i.badge}</Text>
                </View>
              ) : null}
              <Icon name="chevron-right" size={20} color={colors.textMuted} />
            </Pressable>
          ))}
      </Card>

      <Pressable
        onPress={() => confirm('Đăng xuất', 'Thiết bị này sẽ không nhận thông báo đẩy nữa.', 'Đăng xuất', () => void logout(), true)}
        style={({ pressed }) => [styles.logout, pressed && { opacity: 0.7 }]}
      >
        <Icon name="logout" size={22} color={colors.danger} />
        <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 15 }}>Đăng xuất</Text>
      </Pressable>
      <Text style={styles.version}>BiHome Quản lý · phiên bản {APP_VERSION}</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  itemText: { flex: 1, fontSize: 15, color: colors.text },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  version: { textAlign: 'center', color: colors.textMuted, fontSize: 12 },
})

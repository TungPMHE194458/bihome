import { Tabs } from 'expo-router'
import { Platform, type ColorValue } from 'react-native'
import { Icon, type IconName } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { usePendingCounts, useSosActive } from '@/lib/queries'
import { colors } from '@/theme'

const icon = (name: IconName) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon name={focused ? name : (`${name}-outline` as IconName)} size={24} color={color} />
  }

/** Tab hiện / ẩn theo quyền của vai trò (href: null = ẩn). */
export default function TabLayout() {
  const { can } = useAuth()
  const sos = useSosActive()
  const pending = usePendingCounts()
  const sosCount = sos.data?.count ?? 0
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        // Bản web không có vùng an toàn: cao thêm cho nhãn có dấu tiếng Việt khỏi bị cắt.
        tabBarStyle: Platform.OS === 'web' ? { height: 62, paddingBottom: 8, paddingTop: 4 } : undefined,
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Tổng quan', headerShown: false, tabBarIcon: icon('view-dashboard') }} />
      <Tabs.Screen
        name="tickets"
        options={{ title: 'Yêu cầu', tabBarIcon: icon('message-text'), href: can('TICKET_READ') ? undefined : null }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: 'SOS',
          tabBarIcon: icon('alarm-light'),
          tabBarActiveTintColor: colors.danger,
          tabBarBadge: sosCount ? sosCount : undefined,
          href: sos.enabled ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: 'Duyệt',
          tabBarIcon: icon('clipboard-check'),
          tabBarBadge: pending.total ? pending.total : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.warning },
          href: pending.any ? undefined : null,
        }}
      />
      <Tabs.Screen name="manage" options={{ title: 'Quản lý', tabBarIcon: icon('view-grid') }} />
      <Tabs.Screen name="more" options={{ title: 'Thêm', tabBarIcon: icon('dots-horizontal-circle') }} />
    </Tabs>
  )
}

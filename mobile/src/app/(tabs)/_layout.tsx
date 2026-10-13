import { Tabs } from 'expo-router'
import { Platform, type ColorValue } from 'react-native'
import { Icon, type IconName } from '@/components/ui'
import { colors } from '@/theme'

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Icon name={focused ? icon : (`${icon}-outline` as IconName)} size={24} color={color} />
  ),
})

export default function TabLayout() {
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
      <Tabs.Screen name="index" options={{ ...tab('Trang chủ', 'home'), headerShown: false }} />
      <Tabs.Screen name="fees" options={tab('Phí', 'file-document')} />
      <Tabs.Screen name="tickets" options={tab('Yêu cầu', 'message-text')} />
      <Tabs.Screen name="amenities" options={tab('Tiện ích', 'calendar-month')} />
      <Tabs.Screen name="account" options={tab('Tài khoản', 'account-circle')} />
    </Tabs>
  )
}

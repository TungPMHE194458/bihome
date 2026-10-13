import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { AuthImage, Button, Card, Icon, SectionTitle, TextField, type IconName } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { APP_VERSION } from '@/lib/config'
import { RESIDENT_ROLE } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { api } from '@/lib/resident'
import { colors } from '@/theme'

export default function AccountScreen() {
  const { me, logout, forget } = useAuth()
  const config = useQuery({ queryKey: ['app-config'], queryFn: api.appConfig, staleTime: 10 * 60_000 })
  const [deleting, setDeleting] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  if (!me) return null

  const deleteAccount = () => {
    confirm(
      'Xoá tài khoản app?',
      'Bạn sẽ không đăng nhập app được nữa. Hồ sơ cư trú, phí, yêu cầu do Ban quản lý quản lý vẫn được giữ.',
      'Xoá tài khoản',
      async () => {
        setBusy(true)
        try {
          await api.deleteAccount(password)
          await forget()
          notify('Đã xoá tài khoản app')
        } catch (e) {
          notify('Không xoá được', errorMessage(e))
        } finally {
          setBusy(false)
        }
      },
      true,
    )
  }

  const menu: { icon: IconName; label: string; onPress: () => void }[] = [
    { icon: 'home-account', label: 'Căn hộ của tôi (thành viên, xe, thẻ từ)', onPress: () => router.push('/apartment') },
    { icon: 'clipboard-text-outline', label: 'Phiếu kê khai', onPress: () => router.push('/declarations') },
    { icon: 'room-service-outline', label: 'Đơn dịch vụ', onPress: () => router.push('/orders') },
    { icon: 'poll', label: 'Khảo sát ý kiến', onPress: () => router.push('/surveys') },
    { icon: 'folder-text-outline', label: 'Tài liệu của Ban quản lý', onPress: () => router.push('/documents') },
    { icon: 'lock-reset', label: 'Đổi mật khẩu', onPress: () => router.push('/profile-password') },
    { icon: 'history', label: 'Lịch sử thanh toán', onPress: () => router.push('/payments') },
    { icon: 'calendar-check-outline', label: 'Lượt đặt tiện ích', onPress: () => router.push('/bookings') },
    { icon: 'bell-outline', label: 'Thông báo', onPress: () => router.push('/inbox') },
  ]
  if (config.data?.hotline) {
    menu.push({ icon: 'phone-outline', label: `Gọi Ban quản lý (${config.data.hotline})`, onPress: () => void Linking.openURL(`tel:${config.data?.hotline}`) })
  }

  return (
    <Screen>
      <Card style={styles.profile}>
        <AuthImage url={me.avatarUrl} style={styles.avatar} icon="account" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name}>{me.fullName}</Text>
          <Text style={styles.muted}>{me.phone}</Text>
          {me.email ? <Text style={styles.muted}>{me.email}</Text> : null}
        </View>
      </Card>

      <SectionTitle title="Căn hộ đang ở" />
      <Card style={{ paddingVertical: 4 }}>
        {me.apartments.map((a, i) => (
          <View key={a.id} style={[styles.item, i < me.apartments.length - 1 && styles.divider]}>
            <Icon name="home-city-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemText}>
                Căn {a.code} · {a.buildingName}
              </Text>
              <Text style={styles.muted}>
                {RESIDENT_ROLE[a.role]}
                {a.householdHead ? ' · Chủ hộ' : ''}
              </Text>
            </View>
          </View>
        ))}
      </Card>
      <Text style={styles.hint}>Thông tin cá nhân và cư trú do Ban quản lý cập nhật. Cần sửa, vui lòng liên hệ Ban quản lý.</Text>

      <Card style={{ paddingVertical: 4 }}>
        {menu.map((m, i) => (
          <Pressable key={m.label} onPress={m.onPress} style={[styles.item, i < menu.length - 1 && styles.divider]}>
            <Icon name={m.icon} size={22} color={colors.text} />
            <Text style={[styles.itemText, { flex: 1 }]}>{m.label}</Text>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </Pressable>
        ))}
      </Card>

      <Button title="Đăng xuất" variant="outline" icon="logout" onPress={() => void logout()} />

      {!deleting ? (
        <Button title="Xoá tài khoản app" variant="ghost" onPress={() => setDeleting(true)} />
      ) : (
        <Card style={{ gap: 12 }}>
          <Text style={styles.danger}>Nhập mật khẩu để xác nhận xoá tài khoản app.</Text>
          <TextField label="Mật khẩu" secret value={password} onChangeText={setPassword} />
          <Button title="Xoá tài khoản" variant="danger" onPress={deleteAccount} loading={busy} disabled={!password} />
          <Button title="Không xoá" variant="ghost" onPress={() => setDeleting(false)} />
        </Card>
      )}
      <Text style={styles.hint}>
        BiHome {APP_VERSION}
        {config.data?.companyName ? ` · ${config.data.companyName}` : ''}
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  itemText: { fontSize: 15, color: colors.text },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  danger: { fontSize: 14, color: colors.danger },
})

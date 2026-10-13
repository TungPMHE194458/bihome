import { useQuery } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { useState } from 'react'
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { Button, Icon, TextField, type IconName } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useApartment } from '@/lib/auth'
import { SOS_TYPE } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { api } from '@/lib/resident'
import type { SosAlert, SosType } from '@/lib/types'
import { colors } from '@/theme'

/** SOS: chọn loại sự cố → xác nhận → BQL nhận cảnh báo ngay (nút SOS nhấp nháy + âm báo trên web BQL). */
export default function SosScreen() {
  const apt = useApartment()
  const config = useQuery({ queryKey: ['app-config'], queryFn: api.appConfig, staleTime: 10 * 60_000 })
  const [type, setType] = useState<SosType | null>(null)
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<SosAlert | null>(null)

  const send = () => {
    if (!type) return
    confirm('Gửi cảnh báo khẩn cấp?', `${SOS_TYPE[type].label} tại căn ${apt.code}. Ban quản lý sẽ nhận được ngay.`, 'Gửi SOS', async () => {
      setSending(true)
      try {
        setSent(await api.sos(apt.id, type, description.trim() || undefined))
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      } catch (e) {
        notify('Không gửi được cảnh báo', `${errorMessage(e)}\nHãy gọi trực tiếp số khẩn cấp.`)
      } finally {
        setSending(false)
      }
    }, true)
  }

  const hotline = config.data?.hotline

  if (sent) {
    return (
      <Screen contentStyle={{ alignItems: 'center', paddingTop: 48 }}>
        <View style={styles.sentIcon}>
          <Icon name="check-bold" size={44} color="#FFFFFF" />
        </View>
        <Text style={styles.sentTitle}>Đã gửi cảnh báo {sent.code}</Text>
        <Text style={styles.muted}>Ban quản lý đã nhận được và sẽ liên hệ với bạn. Hãy giữ điện thoại bên mình.</Text>
        {hotline && <Button title={`Gọi Ban quản lý ${hotline}`} icon="phone" onPress={() => void Linking.openURL(`tel:${hotline}`)} style={{ alignSelf: 'stretch' }} />}
        <Button title="Gọi 114 (cứu hoả)" variant="outline" icon="fire-truck" onPress={() => void Linking.openURL('tel:114')} style={{ alignSelf: 'stretch' }} />
        <Button title="Gọi 115 (cấp cứu)" variant="outline" icon="ambulance" onPress={() => void Linking.openURL('tel:115')} style={{ alignSelf: 'stretch' }} />
        <Button title="Đóng" variant="ghost" onPress={() => router.back()} />
      </Screen>
    )
  }

  return (
    <Screen>
      <Text style={styles.muted}>Chọn loại sự cố tại căn {apt.code}:</Text>
      <View style={styles.grid}>
        {(Object.keys(SOS_TYPE) as SosType[]).map((t) => {
          const active = type === t
          return (
            <Pressable key={t} onPress={() => setType(t)} style={[styles.type, active && styles.typeActive]} accessibilityRole="radio" accessibilityState={{ selected: active }}>
              <Icon name={SOS_TYPE[t].icon as IconName} size={32} color={active ? '#FFFFFF' : colors.danger} />
              <Text style={[styles.typeText, active && { color: '#FFFFFF' }]}>{SOS_TYPE[t].label}</Text>
            </Pressable>
          )
        })}
      </View>
      <TextField label="Mô tả thêm (không bắt buộc)" multiline value={description} onChangeText={setDescription} maxLength={1000} />
      <Button title="Gửi SOS" variant="danger" icon="alarm-light" onPress={send} loading={sending} disabled={!type} />
      <Text style={[styles.muted, { textAlign: 'center' }]}>
        Trường hợp nguy hiểm đến tính mạng, hãy gọi ngay 114 (cứu hoả) hoặc 115 (cấp cứu).
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  muted: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  type: { width: '48%', paddingVertical: 18, borderRadius: 16, borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FFFFFF', alignItems: 'center', gap: 6 },
  typeActive: { backgroundColor: colors.danger, borderColor: colors.danger },
  typeText: { fontWeight: '600', color: colors.text },
  sentIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sentTitle: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
})

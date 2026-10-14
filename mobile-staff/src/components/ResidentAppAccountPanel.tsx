import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Button, Card, Icon } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { confirm, notify } from '@/lib/dialogs'
import { formatDateTime } from '@/lib/format'
import { residentApi } from '@/lib/staff'
import type { AppAccountStatus, ResidenceStatus } from '@/lib/types'
import { colors } from '@/theme'

/** Tạo / khoá / mở khoá / đặt lại / xoá tài khoản app cư dân — khớp AppAccountPanel của web. */
export function ResidentAppAccountPanel({
  residentId,
  residenceStatus,
  appAccountStatus,
}: {
  residentId: number
  residenceStatus: ResidenceStatus
  appAccountStatus: AppAccountStatus
}) {
  const qc = useQueryClient()
  const { can } = useAuth()
  const [busy, setBusy] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const account = useQuery({
    queryKey: ['resident', residentId, 'app-account'],
    queryFn: () => residentApi.appAccount(residentId),
    enabled: appAccountStatus !== 'NONE',
  })
  const exists = appAccountStatus !== 'NONE' && !!account.data

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['resident', residentId, 'app-account'] })
    void qc.invalidateQueries({ queryKey: ['resident', residentId] })
  }

  const run = async (action: () => Promise<{ temporaryPassword?: string } | unknown>) => {
    setBusy(true)
    try {
      const r = (await action()) as { temporaryPassword?: string }
      if (r.temporaryPassword) setTempPassword(r.temporaryPassword)
      refresh()
    } catch (e) {
      notify('Không thực hiện được', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (!can('RESIDENT_WRITE') && !exists) return null

  return (
    <Card style={{ gap: 10 }}>
      <Text style={styles.title}>Tài khoản app cư dân</Text>
      {!exists ? (
        <>
          <Text style={styles.muted}>Cư dân đăng nhập app bằng số điện thoại đã khai.</Text>
          {can('RESIDENT_WRITE') && (
            <Button
              title="Tạo tài khoản app"
              icon="cellphone-key"
              onPress={() => void run(() => residentApi.createAppAccount(residentId))}
              loading={busy}
              disabled={residenceStatus === 'MOVED_OUT'}
            />
          )}
        </>
      ) : (
        <>
          <Text style={styles.muted}>
            {account.data!.phone} · {account.data!.mustChangePassword ? 'chưa đổi mật khẩu tạm' : 'đã đổi mật khẩu'}
          </Text>
          <Text style={styles.muted}>{account.data!.lastLoginAt ? `Đăng nhập gần nhất: ${formatDateTime(account.data!.lastLoginAt)}` : 'Chưa đăng nhập'}</Text>
          {can('RESIDENT_WRITE') && (
            <View style={{ gap: 8 }}>
              <Button title="Đặt lại mật khẩu" variant="outline" onPress={() => void run(() => residentApi.resetAppPassword(residentId))} loading={busy} />
              {account.data!.status === 'LOCKED' ? (
                <Button title="Mở khoá" onPress={() => void run(() => residentApi.unlockAppAccount(residentId))} loading={busy} />
              ) : (
                <Button
                  title="Khoá"
                  variant="outline"
                  onPress={() =>
                    confirm('Khoá tài khoản app', 'Cư dân sẽ bị đăng xuất khỏi mọi thiết bị.', 'Khoá', () => void run(() => residentApi.lockAppAccount(residentId)), true)
                  }
                />
              )}
              <Button
                title="Xoá tài khoản"
                variant="ghost"
                onPress={() =>
                  confirm(
                    'Xoá tài khoản app',
                    'Cư dân sẽ không đăng nhập app được nữa. Lịch sử phí, yêu cầu, cư trú vẫn giữ nguyên; có thể tạo lại tài khoản sau.',
                    'Xoá',
                    () => void run(() => residentApi.deleteAppAccount(residentId)),
                    true,
                  )
                }
              />
            </View>
          )}
        </>
      )}

      <Modal visible={!!tempPassword} transparent animationType="fade" onRequestClose={() => setTempPassword(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Icon name="shield-key-outline" size={32} color={colors.primary} />
            <Text style={styles.sheetTitle}>Mật khẩu tạm</Text>
            <Text style={styles.password} selectable>{tempPassword}</Text>
            <Text style={styles.muted}>Chỉ hiện một lần. Hãy gửi cho cư dân ngay.</Text>
            <Pressable onPress={() => setTempPassword(null)} style={styles.doneButton}>
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Đã ghi lại</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Card>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: colors.card, borderRadius: 16, padding: 24, gap: 10, alignItems: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  password: { fontSize: 22, fontWeight: '800', color: colors.primaryDark, letterSpacing: 1 },
  doneButton: { marginTop: 8, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
})

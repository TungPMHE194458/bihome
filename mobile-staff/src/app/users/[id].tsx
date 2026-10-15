import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { TemporaryPasswordModal } from '@/components/TemporaryPasswordModal'
import { UserForm } from '@/components/forms/UserForm'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { GENDER, USER_STATUS } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { formatDate, formatDateTime } from '@/lib/format'
import { userApi } from '@/lib/staff'
import { colors } from '@/theme'

export default function UserDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can, me } = useAuth()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [resetResult, setResetResult] = useState<string | null>(null)
  const detail = useQuery({ queryKey: ['user', id], queryFn: () => userApi.get(id) })

  if (detail.isLoading) return <Loading />
  if (detail.error || !detail.data) return <ErrorView message={errorMessage(detail.error)} onRetry={() => void detail.refetch()} />
  const u = detail.data
  const isSelf = me?.id === u.id

  const refresh = async () => {
    void qc.invalidateQueries({ queryKey: ['users'] })
    await detail.refetch()
  }

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Sửa ${u.profile.fullName}` }} />
        <UserForm
          user={u}
          onSaved={() => {
            setEditing(false)
            void refresh()
            notify('Đã lưu thay đổi')
          }}
        />
      </Screen>
    )
  }

  const changeStatus = async (status: 'ACTIVE' | 'INACTIVE' | 'LOCKED') => {
    setBusy(true)
    try {
      await userApi.changeStatus(id, status)
      await refresh()
    } catch (e) {
      notify('Không đổi được trạng thái', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async () => {
    setBusy(true)
    try {
      const r = await userApi.resetPassword(id)
      setResetResult(r.temporaryPassword)
    } catch (e) {
      notify('Không đặt lại được', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen onRefresh={() => detail.refetch()}>
      <Stack.Screen options={{ title: u.profile.fullName }} />
      <Card style={{ gap: 2 }}>
        <View style={styles.top}>
          <Text style={styles.name}>{u.profile.fullName}</Text>
          <Chip {...USER_STATUS[u.status]} />
        </View>
        <Row label="Tên đăng nhập" value={u.username} />
        <Row label="Email" value={u.email} />
        {u.phone ? <Row label="Điện thoại" value={u.phone} /> : null}
        {u.profile.gender ? <Row label="Giới tính" value={GENDER[u.profile.gender]} /> : null}
        {u.profile.dateOfBirth ? <Row label="Ngày sinh" value={formatDate(u.profile.dateOfBirth)} /> : null}
        {u.profile.jobTitle ? <Row label="Chức vụ" value={u.profile.jobTitle} /> : null}
        {u.profile.department ? <Row label="Phòng ban" value={u.profile.department} /> : null}
        {u.profile.address ? <Row label="Địa chỉ" value={u.profile.address} /> : null}
        <Row label="Đăng nhập gần nhất" value={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Chưa đăng nhập'} />
        {u.mustChangePassword && <Row label="Mật khẩu" value="Phải đổi ở lần đăng nhập tới" />}
      </Card>

      <Card style={{ gap: 6 }}>
        <Text style={styles.section}>Vai trò</Text>
        <View style={styles.chips}>
          {u.roles.map((r) => (
            <Chip key={r.id} label={r.name} tone="info" />
          ))}
        </View>
      </Card>

      {can('USER_WRITE') && (
        <View style={{ gap: 10 }}>
          <Button title="Chỉnh sửa" icon="pencil-outline" onPress={() => setEditing(true)} />
          {!isSelf && (
            <>
              {u.status === 'ACTIVE' ? (
                <View style={styles.actions}>
                  <Button title="Khoá tài khoản" variant="danger" onPress={() => void changeStatus('LOCKED')} style={{ flex: 1 }} loading={busy} />
                  <Button title="Ngừng hoạt động" variant="outline" onPress={() => void changeStatus('INACTIVE')} style={{ flex: 1 }} loading={busy} />
                </View>
              ) : (
                <Button
                  title={u.status === 'LOCKED' ? 'Mở khoá' : 'Kích hoạt'}
                  icon={u.status === 'LOCKED' ? 'lock-open-outline' : 'toggle-switch-outline'}
                  onPress={() => void changeStatus('ACTIVE')}
                  loading={busy}
                />
              )}
              <Button title="Đặt lại mật khẩu" variant="outline" icon="key-outline" onPress={() => void resetPassword()} loading={busy} />
            </>
          )}
        </View>
      )}

      {resetResult && (
        <TemporaryPasswordModal visible username={u.username} password={resetResult} onClose={() => setResetResult(null)} />
      )}
    </Screen>
  )
}

const styles = {
  top: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  name: { fontSize: 18, fontWeight: '700' as const, color: colors.text, flexShrink: 1 },
  section: { fontSize: 14, fontWeight: '700' as const, color: colors.text },
  chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
  actions: { flexDirection: 'row' as const, gap: 10 },
}

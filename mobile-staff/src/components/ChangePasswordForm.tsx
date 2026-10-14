import { useState } from 'react'
import { Text, View } from 'react-native'
import { Button, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { colors } from '@/theme'

/** Khớp PasswordPolicy của backend. */
const POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/
const POLICY_MESSAGE = 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.'

export function ChangePasswordForm({ intro, onDone }: { intro?: string; onDone?: () => void }) {
  const { changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!current) e.currentPassword = 'Vui lòng nhập mật khẩu hiện tại'
    if (!POLICY.test(next)) e.newPassword = POLICY_MESSAGE
    if (next !== confirm) e.confirm = 'Mật khẩu nhập lại không khớp.'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    setLoading(true)
    try {
      await changePassword(current, next)
      onDone?.()
    } catch (err) {
      const fe = fieldErrors(err)
      setErrors(fe)
      if (!Object.keys(fe).length) setMessage(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ gap: 16 }}>
      {intro && <Text style={{ color: colors.textMuted, fontSize: 15 }}>{intro}</Text>}
      {message && <Text style={{ color: colors.danger }}>{message}</Text>}
      <TextField label="Mật khẩu hiện tại" secret value={current} onChangeText={setCurrent} error={errors.currentPassword} />
      <TextField label="Mật khẩu mới" secret value={next} onChangeText={setNext} error={errors.newPassword} />
      <TextField label="Nhập lại mật khẩu mới" secret value={confirm} onChangeText={setConfirm} error={errors.confirm} />
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>{POLICY_MESSAGE}</Text>
      <Button title="Đổi mật khẩu" onPress={submit} loading={loading} />
    </View>
  )
}

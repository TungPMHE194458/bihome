import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Logo } from '@/components/Logo'
import { Button, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { colors } from '@/theme'

const PHONE = /^(0|\+84)[35789]\d{8}$/

export default function LoginScreen() {
  const { login } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!PHONE.test(phone.trim())) e.phone = 'Số điện thoại không đúng định dạng Việt Nam.'
    if (!password) e.password = 'Vui lòng nhập mật khẩu'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    setLoading(true)
    try {
      await login(phone.trim(), password)
    } catch (err) {
      setErrors(fieldErrors(err))
      setMessage(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Logo size={56} />
          <View style={{ gap: 6 }}>
            <Text style={styles.title}>Đăng nhập</Text>
            <Text style={styles.subtitle}>Dành cho cư dân. Tài khoản do Ban quản lý tòa nhà cấp.</Text>
          </View>
          {message && (
            <View style={styles.alert} accessibilityRole="alert">
              <Text style={styles.alertText}>{message}</Text>
            </View>
          )}
          <TextField
            label="Số điện thoại"
            placeholder="09xxxxxxxx"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            value={phone}
            onChangeText={setPhone}
            error={errors.phone}
          />
          <TextField
            label="Mật khẩu"
            secret
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            onSubmitEditing={submit}
            returnKeyType="go"
          />
          <Button title="Đăng nhập" onPress={submit} loading={loading} />
          <Text style={styles.hint}>
            Quên mật khẩu hoặc chưa có tài khoản? Liên hệ Ban quản lý tòa nhà để được cấp lại mật khẩu tạm.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.card },
  content: { padding: 24, paddingTop: 48, gap: 20, maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted },
  alert: { backgroundColor: colors.dangerLight, borderRadius: 12, padding: 12 },
  alertText: { color: '#B91C1C', fontSize: 14 },
  hint: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
})

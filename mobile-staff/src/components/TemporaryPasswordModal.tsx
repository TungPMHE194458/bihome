import * as Clipboard from 'expo-clipboard'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Button, Icon } from '@/components/ui'
import { notify } from '@/lib/dialogs'
import { colors, radius } from '@/theme'

export function TemporaryPasswordModal({
  visible,
  username,
  password,
  onClose,
}: {
  visible: boolean
  username: string
  password: string
  onClose: () => void
}) {
  const copy = async () => {
    await Clipboard.setStringAsync(password)
    notify('Đã sao chép mật khẩu tạm')
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Icon name="key-variant" size={32} color={colors.primaryDark} />
          <Text style={styles.title}>Mật khẩu tạm</Text>
          <Text style={styles.hint}>
            Tài khoản <Text style={styles.strong}>{username}</Text> — mật khẩu này chỉ hiện một lần, hãy gửi cho người dùng ngay. Bắt buộc đổi ở lần đăng nhập đầu tiên.
          </Text>
          <Pressable style={styles.passwordBox} onPress={() => void copy()}>
            <Text style={styles.password}>{password}</Text>
            <Icon name="content-copy" size={18} color={colors.primaryDark} />
          </Pressable>
          <Button title="Đã sao chép, đóng" onPress={onClose} style={{ alignSelf: 'stretch' }} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 24, gap: 12, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  strong: { fontWeight: '700', color: colors.text },
  passwordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignSelf: 'stretch',
  },
  password: { fontSize: 20, fontWeight: '700', color: colors.primaryDark, letterSpacing: 1 },
})

import { ChangePasswordForm } from '@/components/ChangePasswordForm'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui'
import { useAuth } from '@/lib/auth'

/** Đăng nhập lần đầu bằng mật khẩu tạm: bắt buộc đổi trước khi dùng app. */
export default function ForcedChangePassword() {
  const { logout } = useAuth()
  return (
    <Screen>
      <ChangePasswordForm intro="Bạn đang dùng mật khẩu tạm do Ban quản lý cấp. Hãy đặt mật khẩu mới để tiếp tục." />
      <Button title="Đăng xuất" variant="ghost" onPress={() => void logout()} />
    </Screen>
  )
}

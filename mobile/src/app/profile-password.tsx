import { router } from 'expo-router'
import { ChangePasswordForm } from '@/components/ChangePasswordForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function ProfilePassword() {
  return (
    <Screen>
      <ChangePasswordForm
        intro="Đổi mật khẩu sẽ đăng xuất BiHome trên các thiết bị khác."
        onDone={() => {
          notify('Đã đổi mật khẩu')
          router.back()
        }}
      />
    </Screen>
  )
}

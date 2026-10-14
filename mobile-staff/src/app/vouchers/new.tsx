import { router } from 'expo-router'
import { VoucherForm } from '@/components/forms/VoucherForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewVoucherScreen() {
  return (
    <Screen>
      <VoucherForm
        onSaved={(v) => {
          notify('Đã thêm voucher')
          router.replace(`/vouchers/${v.id}`)
        }}
      />
    </Screen>
  )
}

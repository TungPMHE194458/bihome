import { router } from 'expo-router'
import { ServiceOrderForm } from '@/components/forms/ServiceOrderForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewOrderScreen() {
  return (
    <Screen>
      <ServiceOrderForm
        onSaved={(o) => {
          notify('Đã tạo đơn dịch vụ', o.code)
          router.replace(`/orders/${o.id}`)
        }}
      />
    </Screen>
  )
}

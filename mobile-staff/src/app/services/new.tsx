import { router } from 'expo-router'
import { ServiceForm } from '@/components/forms/ServiceForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewServiceScreen() {
  return (
    <Screen>
      <ServiceForm
        onSaved={(s) => {
          notify('Đã thêm dịch vụ')
          router.replace(`/services/${s.id}`)
        }}
      />
    </Screen>
  )
}

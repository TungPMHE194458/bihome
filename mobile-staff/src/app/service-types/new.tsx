import { router } from 'expo-router'
import { ServiceTypeForm } from '@/components/forms/ServiceTypeForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewServiceTypeScreen() {
  return (
    <Screen>
      <ServiceTypeForm
        onSaved={() => {
          notify('Đã thêm loại dịch vụ')
          router.back()
        }}
      />
    </Screen>
  )
}

import { router } from 'expo-router'
import { AmenityForm } from '@/components/forms/AmenityForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewAmenityScreen() {
  return (
    <Screen>
      <AmenityForm
        onSaved={(a) => {
          notify('Đã thêm tiện ích', 'Hãy cấu hình khung giờ để cư dân đặt được.')
          router.replace(`/amenities/${a.id}`)
        }}
      />
    </Screen>
  )
}

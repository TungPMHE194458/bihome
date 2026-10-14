import { router } from 'expo-router'
import { ApartmentForm } from '@/components/forms/ApartmentForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewApartmentScreen() {
  return (
    <Screen>
      <ApartmentForm
        onSaved={(a) => {
          notify('Đã thêm căn hộ')
          router.replace(`/apartments/${a.id}`)
        }}
      />
    </Screen>
  )
}

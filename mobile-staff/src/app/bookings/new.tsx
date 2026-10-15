import { router } from 'expo-router'
import { BookingForm } from '@/components/forms/BookingForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewBookingScreen() {
  return (
    <Screen>
      <BookingForm
        onSaved={(b) => {
          notify('Đã tạo lượt đặt', b.code)
          router.replace(`/bookings/${b.id}`)
        }}
      />
    </Screen>
  )
}

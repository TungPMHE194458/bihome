import { router } from 'expo-router'
import { TicketForm } from '@/components/forms/TicketForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewTicketScreen() {
  return (
    <Screen>
      <TicketForm
        onSaved={(t) => {
          notify('Đã tạo yêu cầu', t.ticket.code)
          router.replace(`/tickets/${t.ticket.id}`)
        }}
      />
    </Screen>
  )
}

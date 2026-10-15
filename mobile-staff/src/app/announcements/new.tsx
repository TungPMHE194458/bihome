import { router } from 'expo-router'
import { AnnouncementForm } from '@/components/forms/AnnouncementForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewAnnouncementScreen() {
  return (
    <Screen>
      <AnnouncementForm
        onSaved={(a, mode) => {
          notify(mode === 'NOW' ? 'Đã gửi thông báo' : mode === 'SCHEDULED' ? 'Đã hẹn giờ gửi' : 'Đã lưu nháp')
          router.replace(`/announcements/${a.id}`)
        }}
      />
    </Screen>
  )
}

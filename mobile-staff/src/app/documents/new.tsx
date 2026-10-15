import { router } from 'expo-router'
import { DocumentForm } from '@/components/forms/DocumentForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewDocumentScreen() {
  return (
    <Screen>
      <DocumentForm
        onSaved={(d) => {
          notify('Đã thêm tài liệu', d.code)
          router.replace(`/documents/${d.id}`)
        }}
      />
    </Screen>
  )
}

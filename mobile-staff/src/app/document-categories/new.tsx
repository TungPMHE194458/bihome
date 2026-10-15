import { router } from 'expo-router'
import { DocumentCategoryForm } from '@/components/forms/DocumentCategoryForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewDocumentCategoryScreen() {
  return (
    <Screen>
      <DocumentCategoryForm
        onSaved={() => {
          notify('Đã thêm danh mục')
          router.back()
        }}
      />
    </Screen>
  )
}

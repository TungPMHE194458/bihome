import { router } from 'expo-router'
import { AssetCategoryForm } from '@/components/forms/AssetCategoryForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewAssetCategoryScreen() {
  return (
    <Screen>
      <AssetCategoryForm
        onSaved={() => {
          notify('Đã thêm danh mục')
          router.back()
        }}
      />
    </Screen>
  )
}

import { ImportExcelDialog } from '@/components/ImportExcelDialog'
import { apartmentApi } from '@/features/apartment/api'
import { useImportApartments } from '@/features/apartment/hooks'

export function ApartmentImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const importer = useImportApartments()
  return (
    <ImportExcelDialog
      open={open}
      onClose={onClose}
      entityLabel="căn hộ"
      keyHeader="Mã căn hộ"
      onDownloadTemplate={apartmentApi.downloadTemplate}
      onImport={(file, stopOnError) => importer.mutateAsync({ file, stopOnError })}
      pending={importer.isPending}
    />
  )
}

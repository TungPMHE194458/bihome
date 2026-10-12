import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { AuthImage } from '@/components/AuthImage'
import { Can } from '@/components/Can'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ImportExcelDialog } from '@/components/ImportExcelDialog'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { meterApi } from '@/features/meter/api'
import { MeterReadingFormDialog } from '@/features/meter/components/MeterReadingFormDialog'
import { MeterSheetDialog } from '@/features/meter/components/MeterSheetDialog'
import { METER_TYPE_LABEL, METER_TYPE_OPTIONS, METER_UNIT } from '@/features/meter/constants'
import { useDeleteMeterReading, useImportMeterReadings, useMeterReadings } from '@/features/meter/hooks'
import type { MeterReading } from '@/features/meter/types'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime, formatNumber } from '@/lib/format'
import { currentPeriod, formatPeriod, periodOptions, shiftPeriod } from '@/lib/period'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = ['keyword', 'period', 'apartment', 'floor', 'meterType', 'spike'] as const
const PERIOD_OPTIONS = periodOptions(18)

/** Số liệu điện / nước theo kỳ: thêm từng căn, nhập nhanh theo tầng, nhập Excel; cảnh báo tăng bất thường. */
export function MeterReadingListPage() {
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useMeterReadings(list.apiParams)
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const canWrite = usePermission('METER_READING_WRITE')
  const canDelete = usePermission('METER_READING_DELETE')
  const remove = useDeleteMeterReading()
  const importer = useImportMeterReadings()
  const [form, setForm] = useState<{ open: boolean; id?: number }>({ open: false })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deleting, setDeleting] = useState<MeterReading | null>(null)
  const workingPeriod = list.filters.period ?? shiftPeriod(currentPeriod(), -1)

  const rowActions = (r: MeterReading): RowAction[] =>
    r.locked
      ? []
      : [
          ...(canWrite ? [{ label: 'Chỉnh sửa', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => setForm({ open: true, id: r.id }) }] : []),
          ...(canDelete ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => setDeleting(r) }] : []),
        ]

  const columns: Column<MeterReading>[] = [
    { key: 'period', header: 'Kỳ', sortable: true, filter: { type: 'select', options: PERIOD_OPTIONS }, render: (r) => formatPeriod(r.period) },
    ...(buildingId == null ? [{ key: 'buildingName', header: 'Tòa nhà', render: (r: MeterReading) => r.buildingName }] : []),
    {
      key: 'apartment',
      header: 'Căn hộ',
      sortable: true,
      sortKey: 'apartmentCode',
      filter: { type: 'text' },
      render: (r) => (
        <>
          <b>{r.apartmentCode}</b>
          <Typography variant="caption" color="text.secondary" component="div">
            Tầng {r.floorNo}
          </Typography>
        </>
      ),
    },
    {
      key: 'meterType',
      header: 'Loại đồng hồ',
      sortable: true,
      filter: { type: 'select', options: METER_TYPE_OPTIONS },
      render: (r) => <StatusChip label={METER_TYPE_LABEL[r.meterType]} tone={r.meterType === 'ELECTRIC' ? 'warning' : 'info'} />,
    },
    { key: 'oldIndex', header: 'Chỉ số cũ', align: 'right', render: (r) => formatNumber(r.oldIndex) },
    { key: 'newIndex', header: 'Chỉ số mới', align: 'right', sortable: true, render: (r) => formatNumber(r.newIndex) },
    {
      key: 'consumption',
      header: 'Tiêu thụ',
      align: 'right',
      sortable: true,
      render: (r) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
          {r.spike && (
            <Tooltip title={`Tăng hơn 200% so với trung bình 3 kỳ trước (${formatNumber(r.averageConsumption)} ${METER_UNIT[r.meterType]})`}>
              <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main' }} aria-label="Tăng bất thường" />
            </Tooltip>
          )}
          <Typography variant="body2" fontWeight={r.spike ? 700 : 400} color={r.spike ? 'warning.dark' : undefined}>
            {formatNumber(r.consumption)} {METER_UNIT[r.meterType]}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'image',
      header: 'Ảnh',
      render: (r) =>
        r.imageUrl ? (
          <AuthImage url={r.imageUrl} alt={`Ảnh đồng hồ ${r.apartmentCode}`} placeholder={<ImageOutlinedIcon fontSize="small" />}
            sx={{ width: 40, height: 30, borderRadius: 1 }} />
        ) : null,
    },
    {
      key: 'createdBy',
      header: 'Người nhập',
      render: (r) => (
        <>
          {r.updatedBy ?? r.createdBy}
          <Typography variant="caption" color="text.secondary" component="div">
            {formatDateTime(r.updatedAt ?? r.createdAt)}
          </Typography>
        </>
      ),
    },
    {
      key: 'locked',
      header: '',
      render: (r) => (r.locked ? <StatusChip label="Đã khoá" tone="neutral" /> : null),
    },
  ]

  return (
    <>
      <ListPageLayout
        title="Số liệu"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={
              <>
                <ToolbarSelect label="Kỳ" value={list.filters.period ?? ''} options={PERIOD_OPTIONS} onChange={(v) => list.setFilter('period', v)} />
                <ToolbarSelect label="Loại" value={list.filters.meterType ?? ''} options={METER_TYPE_OPTIONS}
                  onChange={(v) => list.setFilter('meterType', v)} />
                <ToolbarSelect label="Cảnh báo" value={list.filters.spike ?? ''} options={[{ value: 'true', label: 'Tăng bất thường' }]}
                  onChange={(v) => list.setFilter('spike', v)} />
              </>
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm căn hộ, ghi chú..."
            actions={
              buildingId != null && (
                <Can permission="METER_READING_WRITE">
                  <Button variant="outlined" startIcon={<GridOnOutlinedIcon />} onClick={() => setSheetOpen(true)}>
                    Nhập theo tầng
                  </Button>
                  <Button variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={() => setImportOpen(true)}>
                    Nhập Excel
                  </Button>
                </Can>
              )
            }
            onAdd={() => setForm({ open: true })}
            addPermission="METER_READING_WRITE"
          />
        }
      >
        <DataTable
          columns={columns}
          rows={data?.content ?? []}
          getRowId={(r) => r.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sort={list.sort}
          onSortChange={list.setSort}
          onRowClick={canWrite ? (r) => !r.locked && setForm({ open: true, id: r.id }) : undefined}
          rowActions={rowActions}
          emptyMessage={list.hasFilters ? 'Không có số liệu phù hợp với bộ lọc' : 'Chưa có số liệu nào'}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      <MeterReadingFormDialog open={form.open} readingId={form.id} defaultPeriod={workingPeriod} onClose={() => setForm({ open: false })} />
      <MeterSheetDialog open={sheetOpen} defaultPeriod={workingPeriod} onClose={() => setSheetOpen(false)} />
      <ImportExcelDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel={`số liệu kỳ ${formatPeriod(workingPeriod)}`}
        keyHeader="Căn hộ · Loại"
        onDownloadTemplate={meterApi.downloadTemplate}
        onImport={(file, stopOnError) => importer.mutateAsync({ file, period: workingPeriod, stopOnError })}
        pending={importer.isPending}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Xoá số liệu?"
        message={
          <>
            Căn <b>{deleting?.apartmentCode}</b> · {deleting ? METER_TYPE_LABEL[deleting.meterType] : ''} · kỳ {formatPeriod(deleting?.period)}.
            Chỉ số cũ của kỳ sau (nếu có) sẽ được tính lại.
          </>
        }
        confirmLabel="Xoá"
        variant="danger"
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await remove.mutateAsync(deleting.id)
            enqueueSnackbar('Đã xoá số liệu.', { variant: 'success' })
            setDeleting(null)
          } catch (e) {
            enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
          }
        }}
      />
    </>
  )
}

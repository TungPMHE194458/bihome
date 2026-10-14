import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { BuildingBar, FilterChips } from '@/components/common'
import { Segmented } from '@/components/form'
import { Screen } from '@/components/Screen'
import { Button, Card, EmptyState, ErrorView, Icon, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { METER_TYPE } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { periodLabel } from '@/lib/format'
import { meterApi } from '@/lib/staff'
import type { MeterType, SheetRow } from '@/lib/types'
import { colors, radius } from '@/theme'

/** Giống backend: tiêu thụ > 3 lần trung bình 3 kỳ trước thì cảnh báo. */
const SPIKE_RATIO = 3

/** Ghi chỉ số theo tầng tại hiện trường: nhập chỉ số mới từng căn rồi lưu cả tầng một lần (PUT /meter-readings/sheet). */
export default function MeterScreen() {
  const { buildingId } = useAuth()
  const qc = useQueryClient()
  // Mặc định kỳ trước (đầu tháng ghi số của tháng vừa qua), như web.
  const [period, setPeriodState] = useState(dayjs().subtract(1, 'month').format('YYYY-MM'))
  const [type, setTypeState] = useState<MeterType>('ELECTRIC')
  const [pickedFloor, setFloorState] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<number, { old?: string; next?: string }>>({})
  const [saving, setSaving] = useState(false)
  // Đổi kỳ / loại / tầng: bỏ số đang nhập dở.
  const setPeriod = (p: string) => {
    setPeriodState(p)
    setDraft({})
  }
  const setType = (t: MeterType) => {
    setTypeState(t)
    setDraft({})
  }
  const setFloor = (f: string) => {
    setFloorState(f)
    setDraft({})
  }

  // Tải cả tòa một lần rồi lọc theo tầng trên máy (chuyển tầng không phải chờ mạng).
  const sheet = useQuery({
    queryKey: ['meter', buildingId, period, type],
    queryFn: () => meterApi.sheet(period, type),
    enabled: buildingId != null,
  })
  const floors = useMemo(() => sheet.data?.floors ?? [], [sheet.data])
  // Chưa chọn tầng: tầng đầu tiên để danh sách gọn.
  const floor = pickedFloor && floors.includes(pickedFloor) ? pickedFloor : (floors[0] ?? null)

  const rows = useMemo(() => (sheet.data?.rows ?? []).filter((r) => floor == null || r.floorNo === floor), [sheet.data, floor])
  const changed = Object.entries(draft).filter(([, v]) => v.next !== undefined || v.old !== undefined)

  if (buildingId == null) {
    return (
      <Screen>
        <BuildingBar />
        <EmptyState icon="office-building-outline" message="Chọn một tòa nhà để ghi chỉ số." />
        <Button title="Chọn tòa nhà" onPress={() => router.push('/building')} />
      </Screen>
    )
  }

  const save = async () => {
    const entries = changed.map(([id, v]) => {
      const row = rows.find((r) => r.apartmentId === Number(id))
      const parse = (s?: string) => (s === undefined ? undefined : s.trim() === '' ? null : Number(s.replace(',', '.')))
      return {
        apartmentId: Number(id),
        oldIndex: parse(v.old) ?? row?.oldIndex ?? null,
        newIndex: parse(v.next) ?? row?.newIndex ?? null,
      }
    })
    if (entries.some((e) => e.newIndex != null && Number.isNaN(e.newIndex))) {
      notify('Chỉ số không hợp lệ', 'Chỉ nhập số (có thể có phần thập phân).')
      return
    }
    setSaving(true)
    try {
      const r = await meterApi.saveSheet(period, type, entries)
      setDraft({})
      await sheet.refetch()
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      notify('Đã lưu chỉ số', `${r.created} căn mới, ${r.updated} căn cập nhật${r.unchanged ? `, ${r.unchanged} không đổi` : ''}.`)
    } catch (e) {
      notify('Không lưu được', errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const shift = (n: number) => setPeriod(dayjs(`${period}-01`).add(n, 'month').format('YYYY-MM'))

  return (
    <Screen onRefresh={() => sheet.refetch()}>
      <BuildingBar />
      <Segmented
        items={(['ELECTRIC', 'WATER'] as MeterType[]).map((t) => ({ value: t, label: `${METER_TYPE[t].label} (${METER_TYPE[t].unit})` }))}
        value={type}
        onChange={setType}
      />
      <View style={styles.period}>
        <Pressable onPress={() => shift(-1)} hitSlop={10} accessibilityLabel="Kỳ trước">
          <Icon name="chevron-left" size={28} color={colors.primaryDark} />
        </Pressable>
        <Text style={styles.periodText}>{periodLabel(period)}</Text>
        <Pressable onPress={() => shift(1)} hitSlop={10} accessibilityLabel="Kỳ sau" disabled={period >= dayjs().format('YYYY-MM')}>
          <Icon name="chevron-right" size={28} color={period >= dayjs().format('YYYY-MM') ? colors.border : colors.primaryDark} />
        </Pressable>
      </View>
      {floors.length > 1 && (
        <FilterChips items={floors.map((f) => ({ value: f, label: `Tầng ${f}` }))} value={floor ?? ''} onChange={setFloor} />
      )}

      {sheet.isLoading ? (
        <Loading />
      ) : sheet.error ? (
        <ErrorView message={errorMessage(sheet.error)} onRetry={() => void sheet.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon="gauge-empty" message="Không có căn hộ nào ở tầng này." />
      ) : (
        <View style={{ gap: 10 }}>
          {rows.map((r) => (
            <MeterRow
              key={r.apartmentId}
              row={r}
              unit={METER_TYPE[type].unit}
              value={draft[r.apartmentId]}
              onChange={(v) => setDraft((d) => ({ ...d, [r.apartmentId]: { ...d[r.apartmentId], ...v } }))}
            />
          ))}
        </View>
      )}
      {rows.length > 0 && (
        <Button
          title={changed.length ? `Lưu ${changed.length} căn` : 'Lưu'}
          icon="content-save-outline"
          onPress={() => void save()}
          loading={saving}
          disabled={!changed.length}
        />
      )}
    </Screen>
  )
}

function MeterRow({
  row,
  unit,
  value,
  onChange,
}: {
  row: SheetRow
  unit: string
  value?: { old?: string; next?: string }
  onChange: (v: { old?: string; next?: string }) => void
}) {
  // Kỳ đầu (chưa có kỳ trước) mới được nhập chỉ số cũ.
  const first = row.previousPeriod == null
  const oldText = value?.old ?? (row.oldIndex != null ? String(row.oldIndex) : '')
  const newText = value?.next ?? (row.newIndex != null ? String(row.newIndex) : '')
  const oldNum = oldText === '' ? null : Number(oldText.replace(',', '.'))
  const newNum = newText === '' ? null : Number(newText.replace(',', '.'))
  const consumption = oldNum != null && newNum != null && !Number.isNaN(oldNum) && !Number.isNaN(newNum) ? newNum - oldNum : null
  const negative = consumption != null && consumption < 0
  const spike =
    consumption != null && row.averageConsumption != null && row.averageConsumption > 0 && consumption > row.averageConsumption * SPIKE_RATIO
  const edited = value?.next !== undefined || value?.old !== undefined
  return (
    <Card style={[styles.row, edited && { borderColor: colors.primary, borderWidth: 1.5 }, row.locked && { opacity: 0.6 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.code}>{row.apartmentCode}</Text>
        <Text style={styles.muted}>
          Cũ: {first ? '' : (row.oldIndex ?? '—')}
          {row.averageConsumption != null ? ` · TB ${row.averageConsumption} ${unit}` : ''}
        </Text>
        {consumption != null && (
          <Text style={[styles.consumption, (negative || spike) && { color: colors.danger }]}>
            {negative ? 'Chỉ số mới nhỏ hơn chỉ số cũ' : `Tiêu thụ ${Math.round(consumption * 100) / 100} ${unit}${spike ? ' · bất thường' : ''}`}
          </Text>
        )}
        {row.locked && <Text style={styles.muted}>Đã khoá (kỳ đã phát hành thông báo phí)</Text>}
      </View>
      <View style={{ gap: 6, width: 130 }}>
        {first && (
          <TextInput
            style={styles.input}
            value={oldText}
            onChangeText={(t) => onChange({ old: t })}
            placeholder="Chỉ số cũ"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            editable={!row.locked}
            accessibilityLabel={`Chỉ số cũ ${row.apartmentCode}`}
          />
        )}
        <TextInput
          style={[styles.input, styles.inputNew]}
          value={newText}
          onChangeText={(t) => onChange({ next: t })}
          placeholder="Chỉ số mới"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          editable={!row.locked}
          accessibilityLabel={`Chỉ số mới ${row.apartmentCode}`}
        />
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  period: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  periodText: { fontSize: 18, fontWeight: '700', color: colors.text, minWidth: 140, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  code: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { fontSize: 12, color: colors.textMuted },
  consumption: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
    backgroundColor: colors.card,
  },
  inputNew: { borderColor: colors.primary, fontWeight: '700' },
})

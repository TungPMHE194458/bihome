import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { BuildingBar, FilterChips, StatTile } from '@/components/common'
import { SearchPicker } from '@/components/form'
import { Screen } from '@/components/Screen'
import { Button, Card, EmptyState, ErrorView, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { amenityApi } from '@/lib/api/amenity'
import { amenityReportApi } from '@/lib/api/amenityreport'
import { useAuth } from '@/lib/auth'
import { notify } from '@/lib/dialogs'
import { money } from '@/lib/format'
import { colors, radius } from '@/theme'

type Preset = 'week' | 'month' | 'last30' | 'custom'

function rangeFor(preset: Preset): { from: string; to: string } {
  const today = dayjs()
  if (preset === 'week') return { from: today.startOf('week').format('YYYY-MM-DD'), to: today.endOf('week').format('YYYY-MM-DD') }
  if (preset === 'month') return { from: today.startOf('month').format('YYYY-MM-DD'), to: today.endOf('month').format('YYYY-MM-DD') }
  return { from: today.subtract(29, 'day').format('YYYY-MM-DD'), to: today.format('YYYY-MM-DD') }
}

function pct(v: number): string {
  return `${Math.round(v * 1000) / 10}%`
}

export default function AmenityReportsScreen() {
  const { can, buildingId } = useAuth()
  const [preset, setPreset] = useState<Preset>('month')
  const [range, setRange] = useState(rangeFor('month'))
  const [amenityId, setAmenityId] = useState<number | null>(null)
  const [amenityLabel, setAmenityLabel] = useState<string>()
  const [exporting, setExporting] = useState(false)

  const report = useQuery({
    queryKey: ['amenity-report', buildingId, range, amenityId],
    queryFn: () => amenityReportApi.get({ ...range, amenityId: amenityId ?? undefined }),
  })

  const choosePreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') setRange(rangeFor(p))
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      await amenityReportApi.export({ ...range, amenityId: amenityId ?? undefined })
    } catch (e) {
      notify('Không xuất được', errorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  return (
    <Screen onRefresh={() => report.refetch()}>
      <BuildingBar />
      <FilterChips
        items={[
          { value: 'week', label: 'Tuần này' },
          { value: 'month', label: 'Tháng này' },
          { value: 'last30', label: '30 ngày qua' },
          { value: 'custom', label: 'Tuỳ chọn' },
        ]}
        value={preset}
        onChange={choosePreset}
      />
      <Text style={styles.range}>
        {range.from.split('-').reverse().join('/')} – {range.to.split('-').reverse().join('/')}
      </Text>
      <SearchPicker
        label="Tiện ích"
        value={amenityId}
        valueLabel={amenityLabel}
        placeholder="Tất cả tiện ích"
        onSearch={(k) => amenityApi.options(buildingId ?? undefined).then((os) => os.filter((o) => !k || o.name.toLowerCase().includes(k.toLowerCase())).map((o) => ({ value: o.id, label: o.name })))}
        onChange={(v, o) => {
          setAmenityId(v)
          setAmenityLabel(o?.label)
        }}
      />

      {report.isLoading ? (
        <Loading />
      ) : report.error ? (
        <ErrorView message={errorMessage(report.error)} onRetry={() => void report.refetch()} />
      ) : !report.data ? null : (
        <>
          <View style={styles.tiles}>
            <StatTile label="Tổng lượt đặt" value={report.data.totalBookings} icon="calendar-check" tone={colors.primary} />
            <StatTile label="Tỉ lệ lấp đầy" value={pct(report.data.fillRate)} icon="chart-donut" tone={colors.info} />
            <StatTile label="Doanh thu" value={money(report.data.revenue)} icon="cash-multiple" tone={colors.primary} />
            <StatTile label="Tỉ lệ huỷ" value={pct(report.data.cancelRate)} icon="close-circle-outline" tone={colors.danger} />
          </View>
          <Text style={styles.hint}>Đã thu: {money(report.data.collected)} · Người giữ chỗ: {report.data.people}</Text>

          {can('AMENITY_REPORT_EXPORT') && <Button title="Xuất Excel" icon="file-excel-outline" variant="outline" onPress={() => void exportExcel()} loading={exporting} />}

          {report.data.byAmenity.length === 0 ? (
            <EmptyState icon="pool" message="Không có dữ liệu trong khoảng này." />
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={styles.sectionTitle}>Top tiện ích</Text>
              {report.data.byAmenity.map((a) => (
                <Card key={a.amenityId} style={{ gap: 6 }}>
                  <Text style={styles.amenityName}>{a.code} · {a.name}</Text>
                  <View style={styles.barRow}>
                    <Text style={styles.barLabel}>Lấp đầy</Text>
                    <Text style={styles.barValue}>{a.capacity === 0 ? '—' : pct(a.fillRate)}</Text>
                  </View>
                  {a.capacity > 0 && (
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.min(100, a.fillRate * 100)}%` }]} />
                    </View>
                  )}
                  <Text style={styles.amenityMeta}>
                    {a.bookings} lượt · {a.cancelled} huỷ/từ chối · {a.people} người · {money(a.revenue)}
                  </Text>
                </Card>
              ))}
            </View>
          )}

          {report.data.bySlot.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={styles.sectionTitle}>Lượt đặt theo khung giờ</Text>
              <Card style={{ gap: 8 }}>
                {report.data.bySlot
                  .slice()
                  .sort((a, b) => b.bookings - a.bookings)
                  .slice(0, 10)
                  .map((s) => {
                    const max = Math.max(...report.data!.bySlot.map((x) => x.bookings), 1)
                    return (
                      <View key={s.startTime} style={{ gap: 4 }}>
                        <View style={styles.barRow}>
                          <Text style={styles.barLabel}>{s.startTime}</Text>
                          <Text style={styles.barValue}>{s.bookings}</Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${(s.bookings / max) * 100}%` }]} />
                        </View>
                      </View>
                    )
                  })}
              </Card>
            </View>
          )}
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  range: { fontSize: 13, color: colors.textMuted },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  hint: { fontSize: 13, color: colors.textMuted },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  amenityName: { fontSize: 15, fontWeight: '700', color: colors.text },
  amenityMeta: { fontSize: 13, color: colors.textMuted },
  barRow: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { fontSize: 13, color: colors.text },
  barValue: { fontSize: 13, color: colors.textMuted },
  barTrack: { height: 8, borderRadius: radius.sm, backgroundColor: colors.neutralLight, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.primary, borderRadius: radius.sm },
})

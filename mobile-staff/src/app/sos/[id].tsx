import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { callPhone, PromptModal } from '@/components/common'
import { Segmented } from '@/components/form'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Icon, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { SOS_STATUS, SOS_TYPE } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { formatDateTime, timeAgo } from '@/lib/format'
import { api } from '@/lib/staff'
import { colors } from '@/theme'

export default function SosDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const alert = useQuery({ queryKey: ['sos', id], queryFn: () => api.sos(id), refetchInterval: 15_000 })
  const [busy, setBusy] = useState(false)
  const [closing, setClosing] = useState(false)
  const [result, setResult] = useState<'RESOLVED' | 'FALSE_ALARM'>('RESOLVED')

  if (alert.isLoading) return <Loading />
  if (alert.error || !alert.data) return <ErrorView message={errorMessage(alert.error)} onRetry={() => void alert.refetch()} />
  const a = alert.data
  const open = a.status === 'NEW' || a.status === 'ACKNOWLEDGED'
  const canWrite = can('SOS_WRITE')

  const changed = async () => {
    await alert.refetch()
    void qc.invalidateQueries({ queryKey: ['sos'] })
  }

  const acknowledge = async () => {
    setBusy(true)
    try {
      await api.acknowledgeSos(id, a.version)
      await changed()
    } catch (e) {
      notify('Không tiếp nhận được', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const resolve = async (note: string) => {
    try {
      await api.resolveSos(id, result, note, a.version)
      setClosing(false)
      await changed()
    } catch (e) {
      notify('Không kết thúc được cảnh báo', errorMessage(e))
    }
  }

  return (
    <Screen onRefresh={() => alert.refetch()}>
      <View style={[styles.hero, { backgroundColor: open ? colors.danger : colors.neutral }]}>
        <Icon name={SOS_TYPE[a.alertType].icon} size={40} color="#FFFFFF" />
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>{SOS_TYPE[a.alertType].label}</Text>
          <Text style={styles.heroSub}>
            {a.code} · {timeAgo(a.createdAt)}
          </Text>
        </View>
        <Chip {...SOS_STATUS[a.status]} />
      </View>

      <Card style={{ gap: 4 }}>
        {a.apartmentCode && <Row label="Căn hộ" value={a.apartmentCode} strong />}
        {a.location && <Row label="Vị trí" value={a.location} strong />}
        <Row label="Tòa nhà" value={a.buildingName} />
        <Row label="Người báo" value={a.reporterName ?? '—'} />
        {a.reporterPhone && <Row label="Số điện thoại" value={a.reporterPhone} />}
        <Row label="Nguồn" value={a.source === 'APP' ? 'App cư dân' : 'BQL tạo'} />
        <Row label="Thời điểm" value={formatDateTime(a.createdAt)} />
        {a.acknowledgedAt && <Row label="Tiếp nhận" value={`${a.acknowledgedBy ?? ''} · ${formatDateTime(a.acknowledgedAt)}`} />}
        {a.resolvedAt && <Row label="Kết thúc" value={`${a.resolvedBy ?? ''} · ${formatDateTime(a.resolvedAt)}`} />}
        {a.description ? <Text style={styles.body}>{a.description}</Text> : null}
        {a.resolutionNote ? (
          <View style={styles.note}>
            <Text style={styles.noteLabel}>Kết quả xử lý</Text>
            <Text style={styles.body}>{a.resolutionNote}</Text>
          </View>
        ) : null}
      </Card>

      {a.reporterPhone && (
        <Button title={`Gọi ${a.reporterName ?? 'người báo'}`} icon="phone" variant="outline" onPress={() => callPhone(a.reporterPhone)} />
      )}
      {canWrite && a.status === 'NEW' && (
        <Button title="Tiếp nhận – tôi đang xử lý" icon="hand-back-right" onPress={() => void acknowledge()} loading={busy} />
      )}
      {canWrite && open && (
        <Button title="Kết thúc cảnh báo" icon="check-decagram" variant={a.status === 'NEW' ? 'outline' : 'primary'} onPress={() => setClosing(true)} />
      )}

      <PromptModal
        visible={closing}
        title="Kết thúc cảnh báo"
        label="Kết quả xử lý *"
        confirmLabel="Kết thúc"
        extra={
          <Segmented
            items={[
              { value: 'RESOLVED', label: 'Đã xử lý' },
              { value: 'FALSE_ALARM', label: 'Báo nhầm' },
            ]}
            value={result}
            onChange={setResult}
          />
        }
        onCancel={() => setClosing(false)}
        onConfirm={resolve}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 16 },
  heroTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  heroSub: { color: '#FEE2E2', fontSize: 13, marginTop: 2 },
  body: { fontSize: 15, color: colors.text, lineHeight: 21, marginTop: 6 },
  note: { backgroundColor: colors.neutralLight, borderRadius: 10, padding: 10, marginTop: 8 },
  noteLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
})

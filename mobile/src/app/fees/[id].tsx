import { useQuery } from '@tanstack/react-query'
import * as Clipboard from 'expo-clipboard'
import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Icon, Loading, Row, SectionTitle } from '@/components/ui'
import { authHeaders, errorMessage } from '@/lib/api'
import { API_BASE } from '@/lib/config'
import { FEE_STATUS, PAYMENT_METHOD } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { formatDate, formatDateTime, money, periodLabel } from '@/lib/format'
import { openPdf } from '@/lib/pdf'
import { api } from '@/lib/resident'
import { colors } from '@/theme'

export default function FeeNoticeScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const notice = useQuery({ queryKey: ['fee', id], queryFn: () => api.feeNotice(id) })
  const n = notice.data
  const payable = !!n && n.vietQrAvailable && !n.summary.carriedToId && n.summary.outstanding > 0
  const qr = useQuery({ queryKey: ['fee', id, 'qr'], queryFn: () => api.vietQr(id), enabled: payable })
  const [pdfLoading, setPdfLoading] = useState(false)

  if (notice.isLoading) return <Loading />
  if (notice.error || !n) return <ErrorView message={errorMessage(notice.error)} onRetry={() => void notice.refetch()} />
  const s = n.summary

  const pdf = async () => {
    setPdfLoading(true)
    try {
      await openPdf(`/fee-notices/${id}/pdf`, `${s.code}.pdf`)
    } catch (e) {
      notify('Không mở được PDF', errorMessage(e))
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <Screen onRefresh={() => Promise.all([notice.refetch(), payable ? qr.refetch() : null])}>
      <Card style={{ gap: 6 }}>
        <View style={styles.top}>
          <Text style={styles.period}>{periodLabel(s.period)}</Text>
          <Chip {...FEE_STATUS[s.status]} />
        </View>
        <Text style={styles.muted}>
          {s.code} · Căn {s.apartmentCode} · hạn {formatDate(s.dueDate)}
        </Text>
        <Row label="Tổng cộng" value={money(s.totalAmount)} strong />
        <Row label="Đã thanh toán" value={money(s.paidAmount)} />
        <Row
          label="Còn phải trả"
          value={<Text style={[styles.outstanding, s.outstanding <= 0 && { color: colors.primaryDark }]}>{money(s.outstanding)}</Text>}
        />
        {s.carriedToId ? <Text style={styles.muted}>Số còn nợ đã chuyển sang thông báo {s.carriedToCode}.</Text> : null}
      </Card>

      {payable && (
        <>
          <SectionTitle title="Thanh toán bằng VietQR" />
          <Card style={{ alignItems: 'center', gap: 12 }}>
            <Image
              source={{ uri: `${API_BASE}/fee-notices/${id}/vietqr.png`, headers: authHeaders() }}
              style={styles.qr}
              contentFit="contain"
              accessibilityLabel="Mã VietQR"
            />
            <Text style={[styles.muted, { textAlign: 'center' }]}>
              Mở ứng dụng ngân hàng, quét mã để thanh toán đúng số tiền và nội dung. Hệ thống tự ghi nhận khi nhận được tiền.
            </Text>
            {qr.data && (
              <View style={{ alignSelf: 'stretch' }}>
                <Copyable label="Số tài khoản" value={qr.data.accountNo} />
                <Row label="Chủ tài khoản" value={qr.data.accountName} />
                <Row label="Số tiền" value={money(qr.data.amount)} strong />
                <Copyable label="Nội dung" value={qr.data.content} />
              </View>
            )}
          </Card>
        </>
      )}

      <SectionTitle title="Chi tiết các khoản" />
      <Card style={{ paddingVertical: 8 }}>
        {n.items.map((item, i) => (
          <View key={i} style={[styles.item, i < n.items.length - 1 && styles.divider]}>
            <Text style={styles.itemText}>{item.description}</Text>
            <Text style={[styles.itemAmount, item.amount < 0 && { color: colors.primaryDark }]}>{money(item.amount)}</Text>
          </View>
        ))}
      </Card>
      {n.note ? <Text style={styles.muted}>Ghi chú: {n.note}</Text> : null}

      {n.payments.length > 0 && (
        <>
          <SectionTitle title="Phiếu thu" />
          <Card style={{ paddingVertical: 8 }}>
            {n.payments.map((p, i) => (
              <View key={p.id} style={[styles.item, i < n.payments.length - 1 && styles.divider]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemText, p.status === 'CANCELLED' && styles.strike]}>
                    {p.code} · {PAYMENT_METHOD[p.method]}
                  </Text>
                  <Text style={styles.muted}>{formatDateTime(p.paidAt)}</Text>
                </View>
                <Text style={[styles.itemAmount, p.status === 'CANCELLED' && styles.strike]}>{money(p.amount)}</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      <Button title="Xem / tải PDF" variant="outline" icon="file-pdf-box" loading={pdfLoading} onPress={() => void pdf()} />
    </Screen>
  )
}

function Copyable({ label, value }: { label: string; value: string }) {
  const copy = async () => {
    await Clipboard.setStringAsync(value)
    notify('Đã sao chép', value)
  }
  return (
    <Row
      label={label}
      value={
        <Pressable onPress={() => void copy()} style={styles.copy} accessibilityLabel={`Sao chép ${label}`}>
          <Text style={styles.copyText}>{value}</Text>
          <Icon name="content-copy" size={16} color={colors.primaryDark} />
        </Pressable>
      }
    />
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  period: { fontSize: 20, fontWeight: '800', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  outstanding: { fontSize: 18, fontWeight: '800', color: colors.danger },
  qr: { width: 240, height: 240 },
  item: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  itemText: { flex: 1, fontSize: 14, color: colors.text },
  itemAmount: { fontSize: 14, fontWeight: '600', color: colors.text },
  strike: { textDecorationLine: 'line-through', color: colors.textMuted },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  copyText: { fontSize: 14, fontWeight: '600', color: colors.primaryDark, flexShrink: 1 },
})

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { PromptModal } from '@/components/common'
import { AccessCardForm } from '@/components/forms/AccessCardForm'
import { IssueCardModal } from '@/components/IssueCardModal'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Loading, Row, SectionTitle } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { CARD_STATUS, CARD_STATUS_ACTION, CARD_TYPE, HISTORY_ACTION } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { formatDate, formatDateTime } from '@/lib/format'
import { accessCardApi } from '@/lib/staff'
import type { CardStatus } from '@/lib/types'
import { colors } from '@/theme'

export default function AccessCardDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [statusTarget, setStatusTarget] = useState<CardStatus | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const card = useQuery({ queryKey: ['access-card', id], queryFn: () => accessCardApi.get(id) })
  const history = useQuery({ queryKey: ['access-card', id, 'history'], queryFn: () => accessCardApi.history(id), enabled: showHistory })

  if (card.isLoading) return <Loading />
  if (card.error || !card.data) return <ErrorView message={errorMessage(card.error)} onRetry={() => void card.refetch()} />
  const c = card.data

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Sửa ${c.cardNo}` }} />
        <AccessCardForm
          card={c}
          onSaved={() => {
            setEditing(false)
            void card.refetch()
            notify('Đã lưu thay đổi')
          }}
        />
      </Screen>
    )
  }

  const changeStatus = async (note: string) => {
    if (!statusTarget) return
    try {
      await accessCardApi.changeStatus(id, statusTarget, note || null, c.version)
      setStatusTarget(null)
      void card.refetch()
      void qc.invalidateQueries({ queryKey: ['access-cards'] })
    } catch (e) {
      notify('Không đổi được trạng thái', errorMessage(e))
    }
  }

  const remove = () => {
    confirm(
      'Xoá thẻ từ',
      `Xoá thẻ "${c.cardNo}"? Chỉ xoá được thẻ chưa từng cấp (Trong kho).`,
      'Xoá',
      () =>
        void accessCardApi
          .remove(id)
          .then(() => {
            void qc.invalidateQueries({ queryKey: ['access-cards'] })
            router.back()
          })
          .catch((e) => notify('Không xoá được', errorMessage(e))),
      true,
    )
  }

  const nonIssueTransitions = c.allowedStatuses.filter((s) => !(c.status === 'IN_STOCK' && s === 'IN_USE'))

  return (
    <Screen onRefresh={() => card.refetch()}>
      <Stack.Screen options={{ title: c.cardNo }} />
      <Card style={{ gap: 2 }}>
        <View style={styles.top}>
          <Text style={styles.title}>{c.cardNo}</Text>
          <Chip {...CARD_STATUS[c.status]} />
        </View>
        <Row label="Loại thẻ" value={CARD_TYPE[c.cardType].label} />
        {c.apartmentCode && <Row label="Căn hộ" value={`${c.apartmentCode} · ${c.apartmentName}`} />}
        {c.residentName && <Row label="Cư dân" value={c.residentName} />}
        {c.plateNumber && <Row label="Xe liên kết" value={`${c.plateNumber} · ${c.assetItemName ?? ''}`} />}
        {c.issuedDate && <Row label="Ngày cấp" value={formatDate(c.issuedDate)} />}
        {c.expiryDate && <Row label="Ngày hết hạn" value={`${formatDate(c.expiryDate)}${c.expired ? ' (đã hết hạn)' : ''}`} />}
        <Row label="Phí cấp thẻ" value={c.issueFee ? `${c.issueFee.toLocaleString('vi-VN')} đ` : 'Miễn phí'} />
        {c.note && <Row label="Ghi chú" value={c.note} />}
      </Card>

      {can('ACCESS_CARD_WRITE') && (
        <View style={{ gap: 10 }}>
          {c.status === 'IN_STOCK' && <Button title="Cấp thẻ" icon="card-plus-outline" onPress={() => setIssuing(true)} />}
          {nonIssueTransitions.map((s) => (
            <Button key={s} title={CARD_STATUS_ACTION[s]} variant="outline" onPress={() => setStatusTarget(s)} />
          ))}
          <Button title="Chỉnh sửa thông tin" variant="ghost" onPress={() => setEditing(true)} />
        </View>
      )}
      {can('ACCESS_CARD_DELETE') && c.status === 'IN_STOCK' && <Button title="Xoá thẻ" variant="ghost" onPress={remove} />}

      <SectionTitle title="Lịch sử thẻ" action={<Text style={styles.link} onPress={() => setShowHistory((s) => !s)}>{showHistory ? 'Ẩn' : 'Xem'}</Text>} />
      {showHistory &&
        (history.isLoading ? (
          <Loading />
        ) : (
          (history.data ?? []).map((h) => (
            <Card key={h.id} style={{ gap: 2 }}>
              <Text style={styles.historyAction}>{HISTORY_ACTION[h.action]}</Text>
              {h.apartmentLabel && <Text style={styles.muted}>{h.apartmentLabel}</Text>}
              {h.residentName && <Text style={styles.muted}>{h.residentName}</Text>}
              {h.note && <Text style={styles.muted}>{h.note}</Text>}
              <Text style={styles.muted}>
                {h.actor ?? ''} · {formatDateTime(h.createdAt)}
              </Text>
            </Card>
          ))
        ))}

      {issuing && <IssueCardModal visible card={c} onClose={() => setIssuing(false)} onSaved={() => { setIssuing(false); void card.refetch(); notify('Đã cấp thẻ') }} />}

      <PromptModal
        visible={!!statusTarget}
        title={statusTarget ? CARD_STATUS_ACTION[statusTarget] : ''}
        label="Ghi chú (không bắt buộc)"
        confirmLabel={statusTarget ? CARD_STATUS_ACTION[statusTarget] : 'Xác nhận'}
        required={false}
        onCancel={() => setStatusTarget(null)}
        onConfirm={changeStatus}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  link: { color: colors.primaryDark, fontWeight: '600' },
  muted: { fontSize: 13, color: colors.textMuted },
  historyAction: { fontSize: 14, fontWeight: '700', color: colors.text },
})

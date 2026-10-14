import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { VoucherForm } from '@/components/forms/VoucherForm'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { APPLY_SCOPE, VALIDITY, VOUCHER_STATUS } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { formatDate, money } from '@/lib/format'
import { voucherApi } from '@/lib/staff'
import { colors } from '@/theme'

export default function VoucherDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const voucher = useQuery({ queryKey: ['voucher', id], queryFn: () => voucherApi.get(id) })

  if (voucher.isLoading) return <Loading />
  if (voucher.error || !voucher.data) return <ErrorView message={errorMessage(voucher.error)} onRetry={() => void voucher.refetch()} />
  const v = voucher.data

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Sửa ${v.code}` }} />
        <VoucherForm
          voucher={v}
          onSaved={() => {
            setEditing(false)
            void voucher.refetch()
            notify('Đã lưu thay đổi')
          }}
        />
      </Screen>
    )
  }

  const toggleStatus = () => {
    const next = v.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    confirm(
      next === 'INACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại',
      `Chuyển voucher "${v.code}" sang ${next === 'INACTIVE' ? 'ngừng hoạt động' : 'hoạt động'}?`,
      next === 'INACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt',
      () => void voucherApi.status(id, next).then(() => voucher.refetch()),
      next === 'INACTIVE',
    )
  }

  const remove = () => {
    confirm(
      'Xoá voucher',
      `Xoá "${v.code}"? Voucher đã có lượt dùng thì chỉ chuyển được sang Ngừng hoạt động.`,
      'Xoá',
      () =>
        void voucherApi
          .remove(id)
          .then(() => {
            void qc.invalidateQueries({ queryKey: ['vouchers'] })
            router.back()
          })
          .catch((e) => notify('Không xoá được', errorMessage(e))),
      true,
    )
  }

  return (
    <Screen onRefresh={() => voucher.refetch()}>
      <Stack.Screen options={{ title: v.code }} />
      <Card style={{ gap: 2 }}>
        <View style={styles.top}>
          <Text style={styles.title}>{v.name}</Text>
          <Chip {...(v.status === 'INACTIVE' ? VOUCHER_STATUS.INACTIVE : VALIDITY[v.validity])} />
        </View>
        {v.description ? <Text style={styles.muted}>{v.description}</Text> : null}
        <Row label="Giảm giá" value={v.discountType === 'PERCENT' ? `${v.discountValue}%${v.maxDiscount ? ` (tối đa ${money(v.maxDiscount)})` : ''}` : money(v.discountValue)} strong />
        <Row label="Phạm vi" value={APPLY_SCOPE[v.applyScope]} />
        {v.amenities.length > 0 && <Row label="Tiện ích" value={v.amenities.map((a) => a.name).join(', ')} />}
        {v.services.length > 0 && <Row label="Dịch vụ" value={v.services.map((s) => s.name).join(', ')} />}
        <Row label="Đã dùng" value={`${v.usedCount}${v.totalQuantity ? `/${v.totalQuantity}` : ' (không giới hạn)'}`} />
        {v.perApartmentLimit && <Row label="Giới hạn mỗi căn" value={v.perApartmentLimit} />}
        <Row label="Hiệu lực" value={`${formatDate(v.validFrom)} – ${formatDate(v.validTo)}`} />
      </Card>
      {can('VOUCHER_WRITE') && (
        <View style={{ gap: 10 }}>
          <Button title="Chỉnh sửa" icon="pencil-outline" onPress={() => setEditing(true)} />
          <Button title={v.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại'} variant="outline" onPress={toggleStatus} />
        </View>
      )}
      {can('VOUCHER_DELETE') && v.usedCount === 0 && <Button title="Xoá voucher" variant="ghost" onPress={remove} />}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, flexShrink: 1 },
  muted: { fontSize: 13, color: colors.textMuted },
})

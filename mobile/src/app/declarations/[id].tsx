import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { Screen } from '@/components/Screen'
import { AuthImage, Button, Card, Chip, ErrorView, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { DECLARATION_STATUS, GENDER, RELATIONSHIP, RESIDENT_ROLE } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { formatDate, formatDateTime } from '@/lib/format'
import { api } from '@/lib/resident'
import { colors } from '@/theme'

export default function DeclarationScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { me } = useAuth()
  const declaration = useQuery({ queryKey: ['declaration', id], queryFn: () => api.declaration(id) })
  const [busy, setBusy] = useState(false)

  if (declaration.isLoading) return <Loading />
  if (declaration.error || !declaration.data) {
    return <ErrorView message={errorMessage(declaration.error)} onRetry={() => void declaration.refetch()} />
  }
  const d = declaration.data
  const mine = d.submittedById === me?.residentId

  const cancel = () =>
    confirm('Huỷ phiếu kê khai?', 'Ban quản lý sẽ không xử lý phiếu này nữa.', 'Huỷ phiếu', async () => {
      setBusy(true)
      try {
        await api.cancelDeclaration(id)
        await declaration.refetch()
        void qc.invalidateQueries({ queryKey: ['apt'] })
      } catch (e) {
        notify('Không huỷ được', errorMessage(e))
      } finally {
        setBusy(false)
      }
    }, true)

  return (
    <Screen onRefresh={() => declaration.refetch()}>
      <Card style={{ gap: 4 }}>
        <Chip {...DECLARATION_STATUS[d.status]} />
        <Text style={styles.title}>{d.type === 'MEMBER' ? `Thành viên: ${d.fullName}` : `Xe: ${d.vehicleName}`}</Text>
        <Text style={styles.muted}>
          {d.code} · căn {d.apartmentCode} · gửi {formatDateTime(d.createdAt)}
          {d.submittedByName && !mine ? ` bởi ${d.submittedByName}` : ''}
        </Text>
        {d.status === 'REJECTED' && d.rejectReason ? <Text style={styles.danger}>Lý do từ chối: {d.rejectReason}</Text> : null}
        {d.status === 'APPROVED' && (
          <Text style={styles.ok}>
            Ban quản lý đã duyệt{d.reviewedAt ? ` lúc ${formatDateTime(d.reviewedAt)}` : ''}.
            {d.type === 'MEMBER' ? ' Thành viên đã có trong danh sách căn hộ.' : ' Xe đã có trong danh sách của căn.'}
          </Text>
        )}
      </Card>

      <Card style={{ gap: 2 }}>
        {d.type === 'MEMBER' ? (
          <>
            {d.photoUrl && <AuthImage url={d.photoUrl} style={styles.photo} icon="account" />}
            <Row label="Họ và tên" value={d.fullName ?? '—'} />
            <Row label="Vai trò" value={d.role ? RESIDENT_ROLE[d.role] : '—'} />
            <Row label="Quan hệ" value={d.relationship ? RELATIONSHIP[d.relationship] : '—'} />
            <Row label="Số điện thoại" value={d.phone ?? '—'} />
            <Row label="Giới tính" value={d.gender ? GENDER[d.gender] : '—'} />
            <Row label="Ngày sinh" value={formatDate(d.dateOfBirth)} />
            <Row label="Giấy tờ" value={d.idNumber ? `${d.idType === 'PASSPORT' ? 'Hộ chiếu' : 'CCCD'} ${d.idNumber}` : '—'} />
            <Row label="Bắt đầu ở" value={formatDate(d.moveInDate)} />
          </>
        ) : (
          <>
            <Row label="Loại xe" value={d.categoryName ?? '—'} />
            <Row label="Tên xe" value={d.vehicleName ?? '—'} />
            <Row label="Biển số" value={d.plateNumber ?? '—'} />
            <Row label="Mô tả" value={d.vehicleDescription ?? '—'} />
          </>
        )}
        {d.note ? <Row label="Ghi chú" value={d.note} /> : null}
      </Card>

      {d.status === 'PENDING' && mine && (
        <Button title="Huỷ phiếu" variant="outline" icon="close-circle-outline" onPress={cancel} loading={busy} />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 6 },
  muted: { fontSize: 13, color: colors.textMuted },
  danger: { fontSize: 14, color: colors.danger, marginTop: 4 },
  ok: { fontSize: 14, color: colors.primaryDark, marginTop: 4 },
  photo: { width: 80, height: 80, borderRadius: 40, alignSelf: 'center', marginBottom: 8 },
})

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { callPhone, PromptModal } from '@/components/common'
import { Screen } from '@/components/Screen'
import { AuthImage, Button, Card, Chip, ErrorView, Loading, Row, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { DECLARATION_STATUS, GENDER, RELATIONSHIP, RESIDENT_ROLE } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { formatDate, formatDateTime } from '@/lib/format'
import { declarationApi } from '@/lib/staff'
import { colors } from '@/theme'

/**
 * Duyệt phiếu kê khai trên app: duyệt nguyên bản cư dân khai (sửa chi tiết thì dùng web). Thành viên chưa khai số
 * điện thoại thì nhập ở đây — cư dân bắt buộc có SĐT.
 */
export default function DeclarationScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const declaration = useQuery({ queryKey: ['declaration', id], queryFn: () => declarationApi.get(id) })
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  if (declaration.isLoading) return <Loading />
  if (declaration.error || !declaration.data)
    return <ErrorView message={errorMessage(declaration.error)} onRetry={() => void declaration.refetch()} />
  const d = declaration.data
  const member = d.type === 'MEMBER'
  const canDecide = d.status === 'PENDING' && can(member ? 'RESIDENT_WRITE' : 'ASSET_WRITE')

  const done = async (message: string) => {
    void qc.invalidateQueries({ queryKey: ['pending'] })
    void qc.invalidateQueries({ queryKey: ['declarations'] })
    await declaration.refetch()
    notify(message)
    router.back()
  }

  const approve = async () => {
    if (member && !d.phone && !phone.trim()) {
      setPhoneError('Cư dân cần có số điện thoại — hãy hỏi lại và nhập trước khi duyệt.')
      return
    }
    setBusy(true)
    setPhoneError(undefined)
    try {
      await declarationApi.approve(id, { phone: member && !d.phone ? phone.trim() : null, version: d.version })
      await done(member ? 'Đã duyệt – đã thêm thành viên vào căn hộ' : 'Đã duyệt – đã thêm xe')
    } catch (e) {
      const fe = fieldErrors(e)
      if (fe.phone) setPhoneError(fe.phone)
      else notify('Không duyệt được', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const reject = async (reason: string) => {
    try {
      await declarationApi.reject(id, reason, d.version)
      setRejecting(false)
      await done('Đã từ chối phiếu kê khai')
    } catch (e) {
      notify('Không từ chối được', errorMessage(e))
    }
  }

  return (
    <Screen onRefresh={() => declaration.refetch()}>
      <Card style={{ gap: 4 }}>
        <View style={styles.top}>
          <Text style={styles.code}>{d.code}</Text>
          <Chip {...DECLARATION_STATUS[d.status]} />
        </View>
        <Text style={styles.title}>{member ? 'Kê khai thành viên gia đình' : 'Kê khai xe'}</Text>
        <Row label="Căn hộ" value={d.apartmentCode} strong />
        <Row
          label="Người gửi"
          value={
            <Text style={styles.link} onPress={() => callPhone(d.submittedByPhone)}>
              {d.submittedByName ?? '—'}
              {d.submittedByPhone ? ` · ${d.submittedByPhone}` : ''}
            </Text>
          }
        />
        <Row label="Gửi lúc" value={formatDateTime(d.createdAt)} />
      </Card>

      <Card style={{ gap: 4 }}>
        {member ? (
          <>
            {d.photoUrl && <AuthImage url={d.photoUrl} style={styles.photo} icon="account" />}
            <Row label="Họ và tên" value={d.fullName ?? '—'} strong />
            {d.role && <Row label="Vai trò" value={RESIDENT_ROLE[d.role].label} />}
            {d.relationship && <Row label="Quan hệ với chủ hộ" value={RELATIONSHIP[d.relationship]} />}
            {d.gender && <Row label="Giới tính" value={GENDER[d.gender]} />}
            {d.dateOfBirth && <Row label="Ngày sinh" value={formatDate(d.dateOfBirth)} />}
            <Row label="Số điện thoại" value={d.phone ?? 'Chưa khai'} />
            {d.email && <Row label="Email" value={d.email} />}
            {d.idNumber && <Row label={d.idType === 'PASSPORT' ? 'Hộ chiếu' : 'CCCD'} value={d.idNumber} />}
            {d.moveInDate && <Row label="Ngày vào ở" value={formatDate(d.moveInDate)} />}
          </>
        ) : (
          <>
            <Row label="Loại xe" value={d.categoryName ?? '—'} />
            <Row label="Tên xe" value={d.vehicleName ?? '—'} strong />
            <Row label="Biển số" value={d.plateNumber ?? '—'} strong />
            {d.vehicleDescription && <Row label="Mô tả" value={d.vehicleDescription} />}
          </>
        )}
        {d.note ? <Text style={styles.note}>Ghi chú: {d.note}</Text> : null}
        {d.reviewedAt && <Row label="Xử lý" value={`${d.reviewedBy ?? ''} · ${formatDateTime(d.reviewedAt)}`} />}
        {d.rejectReason ? <Text style={[styles.note, { color: colors.danger }]}>Lý do từ chối: {d.rejectReason}</Text> : null}
      </Card>

      {canDecide && (
        <>
          {member && !d.phone && (
            <TextField
              label="Số điện thoại thành viên *"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              error={phoneError}
              placeholder="09xxxxxxxx"
            />
          )}
          <View style={styles.actions}>
            <Button title="Từ chối" variant="danger" onPress={() => setRejecting(true)} style={{ flex: 1 }} />
            <Button title="Duyệt" icon="check" onPress={() => void approve()} loading={busy} style={{ flex: 1 }} />
          </View>
          <Text style={styles.hint}>Cần sửa thông tin trước khi duyệt? Mở phiếu trên web quản lý (Kê khai từ cư dân).</Text>
        </>
      )}
      <PromptModal
        visible={rejecting}
        title="Từ chối phiếu kê khai"
        label="Lý do (gửi tới cư dân) *"
        confirmLabel="Từ chối"
        danger
        onCancel={() => setRejecting(false)}
        onConfirm={reject}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  link: { color: colors.primaryDark, fontWeight: '600', fontSize: 14 },
  photo: { width: 96, height: 96, borderRadius: 48, alignSelf: 'center', marginBottom: 8 },
  note: { fontSize: 14, color: colors.text, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10 },
  hint: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
})

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { callPhone } from '@/components/common'
import { MoveOutModal } from '@/components/MoveOutModal'
import { ResidenceLinkModal } from '@/components/ResidenceLinkModal'
import { ResidentAppAccountPanel } from '@/components/ResidentAppAccountPanel'
import { ResidentForm } from '@/components/forms/ResidentForm'
import { Screen } from '@/components/Screen'
import { AuthImage, Button, Card, Chip, ErrorView, Icon, Loading, Row, SectionTitle } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { ID_TYPE, RELATIONSHIP, RESIDENCE_STATUS, RESIDENT_ROLE } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { formatDate } from '@/lib/format'
import { residentApi } from '@/lib/staff'
import type { ResidentLink } from '@/lib/types'
import { colors } from '@/theme'

export default function ResidentDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const [linkModal, setLinkModal] = useState<{ link?: ResidentLink } | null>(null)
  const [moveOutModal, setMoveOutModal] = useState<ResidentLink[] | null>(null)
  const [showIdNumber, setShowIdNumber] = useState(false)
  const resident = useQuery({ queryKey: ['resident', id], queryFn: () => residentApi.get(id) })

  if (resident.isLoading) return <Loading />
  if (resident.error || !resident.data) return <ErrorView message={errorMessage(resident.error)} onRetry={() => void resident.refetch()} />
  const r = resident.data
  const activeLinks = r.apartments.filter((l) => l.residenceStatus !== 'MOVED_OUT')

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Sửa ${r.fullName}` }} />
        <ResidentForm
          resident={r}
          onSaved={() => {
            setEditing(false)
            void resident.refetch()
            notify('Đã lưu thay đổi')
          }}
        />
      </Screen>
    )
  }

  const afterChange = (message: string) => {
    void resident.refetch()
    void qc.invalidateQueries({ queryKey: ['residents'] })
    setLinkModal(null)
    setMoveOutModal(null)
    notify(message)
  }

  const remove = () => {
    confirm(
      'Xoá cư dân',
      `Xoá "${r.fullName}"? Chỉ xoá được cư dân đã chuyển đi khỏi mọi căn. Không thể hoàn tác.`,
      'Xoá',
      () =>
        void residentApi
          .remove(id)
          .then(() => {
            void qc.invalidateQueries({ queryKey: ['residents'] })
            router.back()
          })
          .catch((e) => notify('Không xoá được', errorMessage(e))),
      true,
    )
  }

  return (
    <Screen onRefresh={() => resident.refetch()}>
      <Stack.Screen options={{ title: r.fullName }} />
      <Card style={{ gap: 10 }}>
        <View style={styles.top}>
          <AuthImage url={r.avatarUrl} style={styles.avatar} icon="account" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.name}>{r.fullName}</Text>
            <Text style={styles.muted}>{r.code}</Text>
            <Chip {...RESIDENCE_STATUS[r.residenceStatus]} />
          </View>
          <Pressable onPress={() => callPhone(r.phone)} style={styles.call} accessibilityLabel={`Gọi ${r.fullName}`}>
            <Icon name="phone" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        <Row label="Số điện thoại" value={r.phone} strong />
        {r.email && <Row label="Email" value={r.email} />}
        {r.gender && <Row label="Giới tính" value={r.gender === 'MALE' ? 'Nam' : r.gender === 'FEMALE' ? 'Nữ' : 'Khác'} />}
        {r.dateOfBirth && <Row label="Ngày sinh" value={formatDate(r.dateOfBirth)} />}
        {r.idNumber && (
          <Row
            label={r.idType ? ID_TYPE[r.idType] : 'Giấy tờ'}
            value={
              <Pressable onPress={() => setShowIdNumber((s) => !s)}>
                <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>
                  {showIdNumber ? r.idNumber : r.idNumberMasked ?? '••••'}
                </Text>
              </Pressable>
            }
          />
        )}
        {r.nationality && <Row label="Quốc tịch" value={r.nationality} />}
        {r.note && <Row label="Ghi chú" value={r.note} />}
      </Card>

      {can('RESIDENT_WRITE') && (
        <View style={{ gap: 10 }}>
          <Button title="Chỉnh sửa hồ sơ" icon="pencil-outline" onPress={() => setEditing(true)} />
          <Button title="Gán căn hộ" icon="home-plus-outline" variant="outline" onPress={() => setLinkModal({})} />
          <Button
            title="Chuyển đi"
            variant="outline"
            onPress={() => setMoveOutModal(activeLinks)}
            disabled={!activeLinks.length}
          />
        </View>
      )}

      <ResidentAppAccountPanel residentId={id} residenceStatus={r.residenceStatus} appAccountStatus={r.appAccountStatus} />

      <SectionTitle title="Căn hộ & lịch sử cư trú" />
      {r.apartments.length === 0 ? (
        <Card>
          <Text style={styles.muted}>Chưa gán căn hộ nào.</Text>
        </Card>
      ) : (
        r.apartments.map((l) => (
          <Card key={l.id} style={{ gap: 4 }}>
            <View style={styles.linkTop}>
              <Text style={styles.linkTitle}>
                {l.apartmentCode} · {l.apartmentName}
              </Text>
              <Chip {...RESIDENCE_STATUS[l.residenceStatus]} />
            </View>
            <Text style={styles.muted}>
              {RESIDENT_ROLE[l.role].label}
              {l.householdHead ? ' · chủ hộ chính' : ''}
              {l.relationship ? ` · ${RELATIONSHIP[l.relationship]}` : ''}
            </Text>
            <Text style={styles.muted}>
              Vào ở {formatDate(l.moveInDate)}
              {l.moveOutDate ? ` · chuyển đi ${formatDate(l.moveOutDate)}` : ''}
            </Text>
            {can('RESIDENT_WRITE') && l.residenceStatus !== 'MOVED_OUT' && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Button title="Sửa cư trú" variant="outline" onPress={() => setLinkModal({ link: l })} style={{ flex: 1 }} />
                <Button title="Chuyển đi" variant="ghost" onPress={() => setMoveOutModal([l])} style={{ flex: 1 }} />
              </View>
            )}
          </Card>
        ))
      )}

      {can('RESIDENT_DELETE') && <Button title="Xoá cư dân" variant="ghost" onPress={remove} />}

      {linkModal && (
        <ResidenceLinkModal
          visible
          residentId={id}
          link={linkModal.link}
          onClose={() => setLinkModal(null)}
          onSaved={() => afterChange(linkModal.link ? 'Đã lưu thay đổi' : 'Đã gán căn hộ')}
        />
      )}
      {moveOutModal && (
        <MoveOutModal
          visible
          residentId={id}
          links={moveOutModal}
          onClose={() => setMoveOutModal(null)}
          onSaved={() => afterChange('Đã chuyển đi')}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  call: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  linkTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
})

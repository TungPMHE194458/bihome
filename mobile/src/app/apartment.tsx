import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Segmented } from '@/components/form'
import { Screen } from '@/components/Screen'
import { AuthImage, Button, Card, Chip, EmptyState, ErrorView, Icon, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useApartment } from '@/lib/auth'
import { CARD_STATUS, CARD_TYPE, RELATIONSHIP, RESIDENT_ROLE } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { api } from '@/lib/resident'
import { colors } from '@/theme'

type Tab = 'members' | 'vehicles' | 'cards'

/** Căn hộ của tôi: thành viên, xe, thẻ từ (chỉ xem) + kê khai thành viên / xe (chủ sở hữu, người thuê). */
export default function ApartmentScreen() {
  const apt = useApartment()
  const [tab, setTab] = useState<Tab>('members')
  const canDeclare = apt.role === 'OWNER' || apt.role === 'TENANT'
  const members = useQuery({ queryKey: ['apt', apt.id, 'members'], queryFn: () => api.members(apt.id), enabled: tab === 'members' })
  const vehicles = useQuery({ queryKey: ['apt', apt.id, 'vehicles'], queryFn: () => api.vehicles(apt.id), enabled: tab === 'vehicles' })
  const cards = useQuery({ queryKey: ['apt', apt.id, 'cards'], queryFn: () => api.accessCards(apt.id), enabled: tab === 'cards' })
  const current = { members, vehicles, cards }[tab]

  return (
    <Screen onRefresh={() => current.refetch()}>
      <Card style={styles.head}>
        <Icon name="home-city-outline" size={28} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Căn {apt.code}</Text>
          <Text style={styles.muted}>
            {apt.buildingName} · bạn là {RESIDENT_ROLE[apt.role].toLowerCase()}
          </Text>
        </View>
      </Card>
      <Segmented
        items={[
          { value: 'members', label: 'Thành viên' },
          { value: 'vehicles', label: 'Xe' },
          { value: 'cards', label: 'Thẻ từ' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {current.isLoading ? (
        <Loading />
      ) : current.error ? (
        <ErrorView message={errorMessage(current.error)} onRetry={() => void current.refetch()} />
      ) : tab === 'members' ? (
        (members.data ?? []).map((m) => (
          <Card key={m.linkId} style={styles.row}>
            <AuthImage url={m.avatarUrl} style={styles.avatar} icon="account" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.name}>{m.fullName}</Text>
              <Text style={styles.muted}>
                {RESIDENT_ROLE[m.role]}
                {m.householdHead ? ' · Chủ hộ' : ''}
                {m.relationship ? ` · ${RELATIONSHIP[m.relationship]}` : ''}
              </Text>
              {m.phone ? <Text style={styles.muted}>{m.phone}</Text> : null}
            </View>
            {m.residenceStatus === 'TEMP_ABSENT' && <Chip label="Tạm vắng" tone="warning" />}
          </Card>
        ))
      ) : tab === 'vehicles' ? (
        (vehicles.data ?? []).length === 0 ? (
          <EmptyState icon="car-outline" message="Căn hộ chưa có xe nào được đăng ký" />
        ) : (
          (vehicles.data ?? []).map((v) => (
            <Card key={v.id} style={styles.row}>
              <View style={styles.iconBox}>
                <Icon name="car-side" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name}>{v.name}</Text>
                <Text style={styles.muted}>
                  {v.categoryName}
                  {v.plateNumber ? ` · ${v.plateNumber}` : ''}
                </Text>
                {v.accessCardNo ? <Text style={styles.muted}>Thẻ gửi xe: {v.accessCardNo}</Text> : null}
              </View>
            </Card>
          ))
        )
      ) : (cards.data ?? []).length === 0 ? (
        <EmptyState icon="card-account-details-outline" message="Căn hộ chưa có thẻ từ nào" />
      ) : (
        (cards.data ?? []).map((c) => (
          <Card key={c.id} style={styles.row}>
            <View style={styles.iconBox}>
              <Icon name="card-account-details-outline" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.name}>{c.cardNo}</Text>
              <Text style={styles.muted}>
                {CARD_TYPE[c.cardType]}
                {c.residentName ? ` · ${c.residentName}` : ''}
                {c.plateNumber ? ` · ${c.plateNumber}` : ''}
              </Text>
              {c.expiryDate ? <Text style={[styles.muted, c.expired && { color: colors.danger }]}>Hạn: {formatDate(c.expiryDate)}</Text> : null}
            </View>
            <Chip {...CARD_STATUS[c.status]} />
          </Card>
        ))
      )}

      {canDeclare && tab === 'members' && (
        <Button title="Kê khai thành viên" icon="account-plus-outline" onPress={() => router.push('/declarations/member')} />
      )}
      {canDeclare && tab === 'vehicles' && (
        <Button title="Kê khai xe" icon="car-info" onPress={() => router.push('/declarations/vehicle')} />
      )}
      {tab === 'cards' && <Text style={styles.hint}>Cấp mới, báo mất hoặc khoá thẻ: liên hệ Ban quản lý.</Text>}
      {!canDeclare && tab !== 'cards' && (
        <Text style={styles.hint}>Chủ sở hữu hoặc người thuê của căn hộ mới kê khai được thành viên / xe.</Text>
      )}
      <Button title="Phiếu kê khai của căn" variant="ghost" icon="clipboard-text-outline" onPress={() => router.push('/declarations')} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
})

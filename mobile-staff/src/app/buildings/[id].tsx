import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ListRow } from '@/components/common'
import { Segmented } from '@/components/form'
import { BuildingForm } from '@/components/forms/BuildingForm'
import { Screen } from '@/components/Screen'
import { AuthImage, Button, Card, Chip, EmptyState, ErrorView, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { BUILDING_STATUS, BUILDING_TYPE } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { apartmentApi, buildingApi } from '@/lib/staff'
import { colors } from '@/theme'

type Tab = 'info' | 'apartments'

export default function BuildingDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const [tab, setTab] = useState<Tab>('info')
  const [editing, setEditing] = useState(false)
  const building = useQuery({ queryKey: ['building', id], queryFn: () => buildingApi.get(id) })
  const apartments = useQuery({
    queryKey: ['building', id, 'apartments'],
    queryFn: () => apartmentApi.list({ buildingId: id, size: 50, sort: 'code,asc' }),
    enabled: tab === 'apartments' && can('APARTMENT_READ'),
  })

  if (building.isLoading) return <Loading />
  if (building.error || !building.data) return <ErrorView message={errorMessage(building.error)} onRetry={() => void building.refetch()} />
  const b = building.data

  if (editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Sửa ${b.code}` }} />
        <BuildingForm
          building={b}
          onSaved={() => {
            setEditing(false)
            void building.refetch()
            notify('Đã lưu thay đổi')
          }}
        />
      </Screen>
    )
  }

  const toggleStatus = () => {
    const next = b.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    confirm(
      next === 'INACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại',
      next === 'INACTIVE'
        ? 'Người dùng đang gán vào tòa này sẽ không chọn được tòa trong bộ chọn.'
        : `Chuyển "${b.name}" về trạng thái hoạt động?`,
      next === 'INACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt',
      () => void buildingApi.status(id, next).then(() => building.refetch()),
      next === 'INACTIVE',
    )
  }

  const remove = () => {
    confirm(
      'Xoá tòa nhà',
      `Xoá "${b.name}"? Chỉ xoá được khi tòa chưa có căn hộ. Không thể hoàn tác.`,
      'Xoá',
      () =>
        void buildingApi
          .remove(id)
          .then(() => {
            void qc.invalidateQueries({ queryKey: ['buildings'] })
            router.back()
          })
          .catch((e) => notify('Không xoá được', errorMessage(e))),
      true,
    )
  }

  return (
    <Screen onRefresh={() => Promise.all([building.refetch(), apartments.refetch()])}>
      <Stack.Screen options={{ title: b.code }} />
      {b.coverImageUrl && <AuthImage url={b.coverImageUrl} style={styles.cover} icon="office-building-outline" />}
      <View style={styles.top}>
        <Text style={styles.title}>{b.name}</Text>
        <Chip {...BUILDING_STATUS[b.status]} />
      </View>
      <Text style={styles.muted}>{b.fullAddress}</Text>

      <Segmented
        items={[
          { value: 'info', label: 'Thông tin' },
          { value: 'apartments', label: `Căn hộ (${b.apartmentCount})` },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'info' ? (
        <>
          <Card style={{ gap: 2 }}>
            <Row label="Loại" value={BUILDING_TYPE[b.type].label} />
            <Row label="Số tầng nổi" value={b.floorsAbove ?? '—'} />
            <Row label="Số tầng hầm" value={b.floorsBelow ?? '—'} />
            <Row label="Chủ đầu tư" value={b.investor ?? '—'} />
            <Row label="Hotline" value={b.hotline ?? '—'} />
            <Row label="Email quản lý" value={b.managementEmail ?? '—'} />
            <Row label="Cư dân đang ở" value={b.residentCount} />
            <Row label="Căn hộ có người ở" value={`${b.occupiedApartmentCount}/${b.apartmentCount}`} />
            {b.description ? (
              <View style={{ marginTop: 6 }}>
                <Text style={styles.label}>Mô tả</Text>
                <Text style={styles.body}>{b.description}</Text>
              </View>
            ) : null}
          </Card>
          {can('BUILDING_WRITE') && (
            <View style={{ gap: 10 }}>
              <Button title="Chỉnh sửa" icon="pencil-outline" onPress={() => setEditing(true)} />
              <Button
                title={b.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
                variant="outline"
                onPress={toggleStatus}
              />
            </View>
          )}
          {can('BUILDING_DELETE') && <Button title="Xoá tòa nhà" variant="ghost" onPress={remove} />}
        </>
      ) : apartments.isLoading ? (
        <Loading />
      ) : apartments.error ? (
        <ErrorView message={errorMessage(apartments.error)} onRetry={() => void apartments.refetch()} />
      ) : !apartments.data?.content.length ? (
        <EmptyState icon="home-outline" message="Tòa chưa có căn hộ nào." />
      ) : (
        <View style={{ gap: 10 }}>
          {apartments.data.content.map((a) => (
            <ListRow
              key={a.id}
              icon="home-outline"
              title={`${a.code} · ${a.name}`}
              subtitle={`Tầng ${a.floorNo} · ${a.area} m² · ${a.memberCount} người ở`}
              onPress={() => router.push(`/apartments/${a.id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 180, borderRadius: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, flexShrink: 1 },
  muted: { color: colors.textMuted, fontSize: 14 },
  label: { fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
})

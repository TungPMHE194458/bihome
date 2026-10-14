import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { BuildingBar, callPhone, ListRow } from '@/components/common'
import { Segmented } from '@/components/form'
import { Screen } from '@/components/Screen'
import { AuthImage, Card, EmptyState, ErrorView, Icon, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { RESIDENCE_STATUS, RESIDENT_ROLE } from '@/lib/constants'
import { lookupApi } from '@/lib/staff'
import type { ResidentSummary } from '@/lib/types'
import { colors } from '@/theme'

type Kind = 'residents' | 'apartments' | 'vehicles'

const PLACEHOLDER: Record<Kind, string> = {
  residents: 'Tên, số điện thoại, mã cư dân',
  apartments: 'Mã hoặc tên căn, VD: A0101',
  vehicles: 'Biển số (gõ một phần), tên xe, mã căn',
}

export default function LookupScreen() {
  const { can, buildingId } = useAuth()
  const kinds = [
    can('RESIDENT_READ') && { value: 'residents' as Kind, label: 'Cư dân' },
    can('APARTMENT_READ') && { value: 'apartments' as Kind, label: 'Căn hộ' },
    can('ASSET_READ') && { value: 'vehicles' as Kind, label: 'Xe' },
  ].filter((k): k is { value: Kind; label: string } => !!k)
  const [kind, setKind] = useState<Kind>(kinds[0]?.value ?? 'residents')
  const [text, setText] = useState('')
  const [keyword, setKeyword] = useState('')

  const residents = useQuery({
    queryKey: ['lookup', 'residents', buildingId, keyword],
    queryFn: () => lookupApi.residents(keyword),
    enabled: kind === 'residents' && keyword.length > 0,
  })
  const apartments = useQuery({
    queryKey: ['lookup', 'apartments', buildingId, keyword],
    queryFn: () => lookupApi.apartments({ keyword }),
    enabled: kind === 'apartments' && keyword.length > 0,
  })
  const vehicles = useQuery({
    queryKey: ['lookup', 'vehicles', buildingId, keyword],
    queryFn: () => lookupApi.vehicles({ keyword }),
    enabled: kind === 'vehicles' && keyword.length > 0,
  })
  const active = { residents, apartments, vehicles }[kind]

  return (
    <Screen>
      <BuildingBar />
      {kinds.length > 1 && (
        <Segmented
          items={kinds}
          value={kind}
          onChange={(k) => {
            setKind(k)
          }}
        />
      )}
      <TextField
        label="Tìm kiếm"
        placeholder={PLACEHOLDER[kind]}
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setKeyword(text.trim())}
        returnKeyType="search"
        autoCapitalize={kind === 'residents' ? 'words' : 'characters'}
        autoCorrect={false}
      />
      {keyword.length === 0 ? (
        <EmptyState icon="magnify" message="Nhập từ khoá rồi bấm Tìm trên bàn phím." />
      ) : active.isLoading ? (
        <Loading />
      ) : active.error ? (
        <ErrorView message={errorMessage(active.error)} onRetry={() => void active.refetch()} />
      ) : kind === 'residents' ? (
        <List empty={!residents.data?.content.length}>
          {residents.data?.content.map((r) => <ResidentCard key={r.id} resident={r} />)}
        </List>
      ) : kind === 'apartments' ? (
        <List empty={!apartments.data?.content.length}>
          {apartments.data?.content.map((a) => (
            <ListRow
              key={a.id}
              icon="home-outline"
              title={`${a.code} · ${a.name}`}
              subtitle={`Tầng ${a.floorNo} · ${a.area} m² · ${a.memberCount} người ở`}
              meta={a.ownerName ? `Chủ sở hữu: ${a.ownerName}` : 'Chưa có chủ sở hữu'}
              onPress={() => router.push(`/apartments/${a.id}`)}
            />
          ))}
        </List>
      ) : (
        <List empty={!vehicles.data?.content.length}>
          {vehicles.data?.content.map((v) => (
            <ListRow
              key={v.id}
              icon={v.categoryName.toLowerCase().includes('ô tô') ? 'car' : 'motorbike'}
              title={`${v.plateNumber ?? 'Không biển'} · ${v.name}`}
              subtitle={`Căn ${v.apartmentCode} · ${v.categoryName}${v.accessCardNo ? ` · thẻ ${v.accessCardNo}` : ''}`}
              meta={v.status === 'ACTIVE' ? undefined : 'Ngừng sử dụng'}
              onPress={() => router.push(`/apartments/${v.apartmentId}`)}
            />
          ))}
        </List>
      )}
    </Screen>
  )
}

function List({ empty, children }: { empty: boolean; children: React.ReactNode }) {
  if (empty) return <EmptyState icon="file-search-outline" message="Không tìm thấy kết quả." />
  return <View style={{ gap: 10 }}>{children}</View>
}

function ResidentCard({ resident: r }: { resident: ResidentSummary }) {
  const living = r.apartments.filter((a) => a.residenceStatus !== 'MOVED_OUT')
  return (
    <Card style={{ gap: 8 }}>
      <View style={styles.head}>
        <AuthImage url={r.avatarUrl} style={styles.avatar} icon="account" />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{r.fullName}</Text>
          <Text style={styles.muted}>
            {r.code} · {RESIDENCE_STATUS[r.residenceStatus].label}
          </Text>
        </View>
        <Pressable onPress={() => callPhone(r.phone)} style={styles.call} accessibilityLabel={`Gọi ${r.fullName}`}>
          <Icon name="phone" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
      <Text style={styles.phone}>{r.phone}</Text>
      {living.map((a) => (
        <Pressable key={a.id} onPress={() => router.push(`/apartments/${a.apartmentId}`)} style={styles.apt}>
          <Icon name="home-outline" size={18} color={colors.primaryDark} />
          <Text style={styles.aptText}>
            Căn {a.apartmentCode} · {RESIDENT_ROLE[a.role].label}
            {a.householdHead ? ' · chủ hộ' : ''}
          </Text>
          <Icon name="chevron-right" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
    </Card>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  phone: { fontSize: 15, color: colors.text, fontWeight: '600' },
  call: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  apt: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10 },
  aptText: { flex: 1, color: colors.primaryDark, fontWeight: '600' },
})

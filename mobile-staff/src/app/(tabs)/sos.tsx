import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { Screen } from '@/components/Screen'
import { EmptyState, ErrorView, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { SOS_STATUS, SOS_TYPE } from '@/lib/constants'
import { formatDateTime, timeAgo } from '@/lib/format'
import { useSosActive } from '@/lib/queries'
import { api } from '@/lib/staff'
import type { SosAlert } from '@/lib/types'
import { colors } from '@/theme'

type Tab = 'open' | 'closed'

/** Cảnh báo SOS: đang mở (tự làm mới 15 giây) và đã kết thúc gần đây. */
export default function SosScreen() {
  const { buildingId } = useAuth()
  const [tab, setTab] = useState<Tab>('open')
  const active = useSosActive()
  const history = useQuery({
    queryKey: ['sos', 'history', buildingId],
    queryFn: () => api.sosList({ open: false }),
    enabled: tab === 'closed',
  })
  const openItems = active.data?.latest ?? []
  const closedItems = (history.data?.content ?? []).filter((a) => a.status === 'RESOLVED' || a.status === 'FALSE_ALARM')
  const list = tab === 'open' ? openItems : closedItems
  const loading = tab === 'open' ? active.isLoading : history.isLoading
  const error = tab === 'open' ? active.error : history.error

  return (
    <Screen onRefresh={() => (tab === 'open' ? active.refetch() : history.refetch())}>
      <BuildingBar />
      <FilterChips
        items={[
          { value: 'open', label: 'Đang mở', count: active.data?.count },
          { value: 'closed', label: 'Đã kết thúc' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'open' && (
        <Text style={styles.hint}>Tự cập nhật mỗi 15 giây; điện thoại rung khi có cảnh báo mới.</Text>
      )}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={errorMessage(error)} onRetry={() => void (tab === 'open' ? active.refetch() : history.refetch())} />
      ) : list.length === 0 ? (
        <EmptyState icon="shield-check-outline" message={tab === 'open' ? 'Không có cảnh báo nào đang mở.' : 'Chưa có cảnh báo đã kết thúc.'} />
      ) : (
        <View style={{ gap: 10 }}>
          {list.map((a) => (
            <SosRow key={a.id} alert={a} />
          ))}
        </View>
      )}
    </Screen>
  )
}

function SosRow({ alert: a }: { alert: SosAlert }) {
  const place = [a.apartmentCode ? `Căn ${a.apartmentCode}` : null, a.location].filter(Boolean).join(' · ')
  return (
    <ListRow
      icon={SOS_TYPE[a.alertType].icon}
      iconColor={a.status === 'NEW' ? colors.danger : a.status === 'ACKNOWLEDGED' ? colors.warning : colors.neutral}
      title={`${SOS_TYPE[a.alertType].label}${place ? ` – ${place}` : ''}`}
      subtitle={[a.code, a.reporterName, a.source === 'APP' ? 'từ app cư dân' : 'BQL tạo'].filter(Boolean).join(' · ')}
      meta={a.status === 'NEW' || a.status === 'ACKNOWLEDGED' ? timeAgo(a.createdAt) : formatDateTime(a.createdAt)}
      chip={SOS_STATUS[a.status]}
      highlight={a.status === 'NEW'}
      onPress={() => router.push(`/sos/${a.id}`)}
    />
  )
}

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, fontSize: 13 },
})

import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { Segmented } from '@/components/form'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { ORDER_STATUS, SERVICE_STATUS } from '@/lib/constants'
import { formatDateTime, money } from '@/lib/format'
import { serviceApi } from '@/lib/staff'
import type { ActiveStatus, ServiceOrderStatus } from '@/lib/types'

type Tab = 'services' | 'orders'

export default function ServicesScreen() {
  const { can, buildingId } = useAuth()
  const params = useLocalSearchParams<{ tab?: Tab }>()
  const [tab, setTab] = useState<Tab>(params.tab === 'orders' ? 'orders' : 'services')
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [serviceStatus, setServiceStatus] = useState<'any' | ActiveStatus>('any')
  const [orderStatus, setOrderStatus] = useState<'any' | ServiceOrderStatus>('any')

  const services = useQuery({
    queryKey: ['services', buildingId, serviceStatus, search],
    queryFn: () => serviceApi.list({ keyword: search, status: serviceStatus === 'any' ? undefined : serviceStatus, size: 50 }),
    enabled: tab === 'services',
  })
  const orders = useQuery({
    queryKey: ['service-orders', buildingId, orderStatus, search],
    queryFn: () => serviceApi.orders({ keyword: search, status: orderStatus === 'any' ? undefined : orderStatus, size: 50, sort: 'createdAt,desc' }),
    enabled: tab === 'orders',
  })

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <BuildingBar />
      <Segmented items={[{ value: 'services', label: 'Dịch vụ' }, { value: 'orders', label: 'Đơn dịch vụ' }]} value={tab} onChange={setTab} />
      <TextField
        label={tab === 'services' ? 'Tìm theo mã, tên' : 'Tìm theo mã, căn hộ'}
        value={keyword}
        onChangeText={setKeyword}
        onSubmitEditing={() => setSearch(keyword.trim())}
        onBlur={() => setSearch(keyword.trim())}
        returnKeyType="search"
      />
      {tab === 'services' ? (
        <FilterChips
          items={[
            { value: 'any', label: 'Tất cả' },
            { value: 'ACTIVE', label: SERVICE_STATUS.ACTIVE.label },
            { value: 'INACTIVE', label: SERVICE_STATUS.INACTIVE.label },
          ]}
          value={serviceStatus}
          onChange={setServiceStatus}
        />
      ) : (
        <FilterChips
          items={[
            { value: 'any', label: 'Tất cả' },
            { value: 'PENDING', label: ORDER_STATUS.PENDING.label },
            { value: 'CONFIRMED', label: ORDER_STATUS.CONFIRMED.label },
            { value: 'COMPLETED', label: ORDER_STATUS.COMPLETED.label },
            { value: 'CANCELLED', label: ORDER_STATUS.CANCELLED.label },
          ]}
          value={orderStatus}
          onChange={setOrderStatus}
        />
      )}
      {can('SERVICE_WRITE') && (
        <Button
          title={tab === 'services' ? 'Thêm dịch vụ' : 'Tạo đơn dịch vụ'}
          icon="plus"
          onPress={() => router.push(tab === 'services' ? '/services/new' : '/orders/new')}
        />
      )}

      {tab === 'services' ? (
        services.isLoading ? (
          <Loading />
        ) : services.error ? (
          <ErrorView message={errorMessage(services.error)} onRetry={() => void services.refetch()} />
        ) : !services.data?.content.length ? (
          <EmptyState icon="room-service-outline" message="Chưa có dịch vụ nào." />
        ) : (
          <View style={{ gap: 10 }}>
            {services.data.content.map((s) => (
              <ListRow
                key={s.id}
                icon="room-service-outline"
                title={`${s.code} · ${s.name}`}
                subtitle={`${s.serviceTypeName} · ${money(s.unitPrice)} / ${s.unit}`}
                chip={SERVICE_STATUS[s.status]}
                onPress={() => router.push(`/services/${s.id}`)}
              />
            ))}
          </View>
        )
      ) : orders.isLoading ? (
        <Loading />
      ) : orders.error ? (
        <ErrorView message={errorMessage(orders.error)} onRetry={() => void orders.refetch()} />
      ) : !orders.data?.content.length ? (
        <EmptyState icon="clipboard-list-outline" message="Chưa có đơn dịch vụ nào." />
      ) : (
        <View style={{ gap: 10 }}>
          {orders.data.content.map((o) => (
            <ListRow
              key={o.id}
              icon="clipboard-list-outline"
              title={`${o.serviceName} × ${o.quantity} ${o.unit}`}
              subtitle={`Căn ${o.apartmentCode}${o.residentName ? ` · ${o.residentName}` : ''}${o.scheduledAt ? ` · hẹn ${formatDateTime(o.scheduledAt)}` : ''}`}
              meta={`${o.code} · ${money(o.total)}`}
              chip={ORDER_STATUS[o.status]}
              onPress={() => router.push(`/orders/${o.id}`)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  )
}

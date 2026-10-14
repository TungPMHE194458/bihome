import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { BuildingBar, FilterChips, ListRow } from '@/components/common'
import { Segmented } from '@/components/form'
import { Button, EmptyState, ErrorView, Loading, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { ASSET_STATUS } from '@/lib/constants'
import { assetApi } from '@/lib/staff'
import type { ActiveStatus } from '@/lib/types'

type Tab = 'categories' | 'items'
type StatusFilter = 'any' | ActiveStatus

/** Hạng mục căn hộ: 2 tab Danh mục / Hạng mục (xe), khớp AssetPage của web. */
export default function AssetsScreen() {
  const { can, buildingId } = useAuth()
  const [tab, setTab] = useState<Tab>('categories')
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('any')

  const categories = useQuery({
    queryKey: ['asset-categories', buildingId, search, status],
    queryFn: () => assetApi.categories({ keyword: search, status: status === 'any' ? undefined : status, size: 50 }),
    enabled: tab === 'categories',
  })
  const items = useQuery({
    queryKey: ['asset-items', buildingId, search, status],
    queryFn: () => assetApi.items({ keyword: search, status: status === 'any' ? undefined : status, size: 50 }),
    enabled: tab === 'items',
  })
  const active = tab === 'categories' ? categories : items

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <BuildingBar />
      <Segmented
        items={[
          { value: 'categories', label: 'Danh mục' },
          { value: 'items', label: 'Hạng mục (xe)' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <TextField
        label={tab === 'categories' ? 'Tìm danh mục' : 'Tìm tên, biển số, căn hộ'}
        value={keyword}
        onChangeText={setKeyword}
        onSubmitEditing={() => setSearch(keyword.trim())}
        onBlur={() => setSearch(keyword.trim())}
        returnKeyType="search"
      />
      <FilterChips
        items={[
          { value: 'any', label: 'Tất cả' },
          { value: 'ACTIVE', label: ASSET_STATUS.ACTIVE.label },
          { value: 'INACTIVE', label: ASSET_STATUS.INACTIVE.label },
        ]}
        value={status}
        onChange={setStatus}
      />
      {can('ASSET_WRITE') && (
        <Button
          title={tab === 'categories' ? 'Thêm danh mục' : 'Thêm hạng mục'}
          icon="plus"
          onPress={() => router.push(tab === 'categories' ? '/apartment-assets/categories/new' : '/apartment-assets/items/new')}
        />
      )}

      {active.isLoading ? (
        <Loading />
      ) : active.error ? (
        <ErrorView message={errorMessage(active.error)} onRetry={() => void active.refetch()} />
      ) : tab === 'categories' ? (
        !categories.data?.content.length ? (
          <EmptyState icon="shape-outline" message="Chưa có danh mục nào." />
        ) : (
          <View style={{ gap: 10 }}>
            {categories.data.content.map((c) => (
              <ListRow
                key={c.id}
                icon="shape-outline"
                title={c.name}
                subtitle={`Đơn vị: ${c.unit}`}
                chip={ASSET_STATUS[c.status]}
                onPress={() => router.push(`/apartment-assets/categories/${c.id}`)}
              />
            ))}
          </View>
        )
      ) : !items.data?.content.length ? (
        <EmptyState icon="car-info" message="Chưa có hạng mục nào." />
      ) : (
        <View style={{ gap: 10 }}>
          {items.data.content.map((i) => (
            <ListRow
              key={i.id}
              icon="car-outline"
              title={`${i.plateNumber ?? 'Không biển'} · ${i.name}`}
              subtitle={`Căn ${i.apartmentCode} · ${i.categoryName}${i.accessCardNo ? ` · thẻ ${i.accessCardNo}` : ''}`}
              chip={ASSET_STATUS[i.status]}
              onPress={() => router.push(`/apartment-assets/items/${i.id}`)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  )
}

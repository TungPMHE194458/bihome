import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AssetCategoryTab } from '@/features/asset/components/AssetCategoryTab'
import { AssetItemTab } from '@/features/asset/components/AssetItemTab'

type TabKey = 'categories' | 'items'

/** Một trang, hai tab (lưu ở ?tab=). Đổi tab thì bỏ bộ lọc của tab cũ vì hai danh sách khác cột. */
export function AssetPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tab: TabKey = searchParams.get('tab') === 'items' ? 'items' : 'categories'

  const tabs = (
    <Tabs value={tab} onChange={(_, v: TabKey) => navigate({ search: v === 'categories' ? '' : `?tab=${v}` }, { replace: true })}>
      <Tab value="categories" label="Danh mục" />
      <Tab value="items" label="Hạng mục" />
    </Tabs>
  )

  return tab === 'items' ? <AssetItemTab key="items" tabs={tabs} /> : <AssetCategoryTab key="categories" tabs={tabs} />
}

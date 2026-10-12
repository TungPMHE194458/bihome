import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ServiceOrderTab } from '@/features/servicecatalog/components/ServiceOrderTab'
import { ServiceListPage } from '@/features/servicecatalog/pages/ServiceListPage'

type TabKey = 'services' | 'orders'

/** Dịch vụ: tab Danh mục dịch vụ | Đơn dịch vụ (?tab=orders). Đổi tab thì bỏ bộ lọc của tab cũ. */
export function ServicePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tab: TabKey = searchParams.get('tab') === 'orders' ? 'orders' : 'services'
  const tabs = (
    <Tabs value={tab} onChange={(_, v: TabKey) => navigate({ search: v === 'services' ? '' : `?tab=${v}` }, { replace: true })}>
      <Tab value="services" label="Dịch vụ" />
      <Tab value="orders" label="Đơn dịch vụ" />
    </Tabs>
  )
  return tab === 'orders' ? <ServiceOrderTab key="orders" tabs={tabs} /> : <ServiceListPage key="services" tabs={tabs} />
}

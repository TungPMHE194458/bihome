import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { AuthImage } from '@/components/AuthImage'
import { ListPagination } from '@/components/DataTable/ListPagination'
import { RowActionMenu } from '@/components/DataTable/RowActionMenu'
import type { PaginationProps, RowAction } from '@/components/DataTable/types'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

export interface CardDetail {
  label: string
  value: ReactNode
  /** Giá trị dài (vd danh sách tên) được xuống dòng thay vì cắt bằng "…". */
  wrap?: boolean
}

export interface CardGridProps<T> extends PaginationProps {
  items: T[]
  getId: (item: T) => string | number
  getTitle: (item: T) => string
  getSubtitle?: (item: T) => ReactNode
  getImageUrl?: (item: T) => string | undefined
  /** Thay khung ảnh 16:9 mặc định (vd avatar tròn của cư dân). */
  renderMedia?: (item: T) => ReactNode
  /** Icon trong khung ảnh khi bản ghi chưa có ảnh (mặc định icon ảnh chung). */
  placeholderIcon?: ReactNode
  /** Chip ở góc trên ảnh (vd loại căn hộ). */
  renderBadge?: (item: T) => ReactNode
  /** Thông tin chính: nhãn bên trái, giá trị bên phải. */
  getDetails?: (item: T) => CardDetail[]
  renderStatus?: (item: T) => ReactNode
  /** Màu viền trái của thẻ (vd theo tình trạng). */
  getAccentColor?: (item: T) => string | undefined
  actions?: (item: T) => RowAction[]
  onItemClick?: (item: T) => void
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  emptyMessage?: string
  /** Số cột ở màn hình rộng (mặc định 4). */
  columns?: 3 | 4
}

const gridSx = (columns: 3 | 4) =>
  ({
    display: 'grid',
    gap: 2,
    p: 2,
    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: `repeat(${columns}, 1fr)` },
  }) as const

const MEDIA = { width: '100%', aspectRatio: '16 / 9', verticalAlign: 'top' } as const

export function CardGrid<T>({
  items,
  getId,
  getTitle,
  getSubtitle,
  getImageUrl,
  renderMedia,
  placeholderIcon,
  renderBadge,
  getDetails,
  renderStatus,
  getAccentColor,
  actions,
  onItemClick,
  loading = false,
  error,
  onRetry,
  emptyMessage,
  columns = 4,
  ...pagination
}: CardGridProps<T>) {
  let content: ReactNode
  if (loading) {
    content = (
      <Box sx={gridSx(columns)}>
        {Array.from({ length: columns * 2 }, (_, i) => (
          <Card key={i} variant="outlined" sx={{ borderRadius: 2 }}>
            <Skeleton variant="rectangular" sx={{ ...MEDIA, height: 'auto' }} />
            <Box sx={{ p: 2 }}>
              <Skeleton width="70%" />
              <Skeleton width="40%" />
              <Skeleton width="90%" sx={{ mt: 1 }} />
              <Skeleton width="90%" />
            </Box>
          </Card>
        ))}
      </Box>
    )
  } else if (error) {
    content = <ErrorState error={error} onRetry={onRetry} />
  } else if (items.length === 0) {
    content = <EmptyState message={emptyMessage} />
  } else {
    content = (
      <Box sx={gridSx(columns)}>
        {items.map((item) => {
          const title = getTitle(item)
          const details = getDetails?.(item) ?? []
          const accent = getAccentColor?.(item)
          const body = (
            <>
              <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                {renderMedia ? (
                  renderMedia(item)
                ) : (
                  <AuthImage
                    className="card-media"
                    url={getImageUrl?.(item)}
                    alt={title}
                    placeholder={placeholderIcon}
                    sx={{ ...MEDIA, transition: 'transform .3s ease', '& svg': { fontSize: 48 } }}
                  />
                )}
                {renderBadge && (
                  <Box sx={{ position: 'absolute', top: 8, right: 8, '& .MuiChip-root': { boxShadow: 1 } }}>{renderBadge(item)}</Box>
                )}
              </Box>
              <Box sx={{ px: 2, pt: 1.5 }}>
                <Typography fontWeight={700} noWrap title={title}>
                  {title}
                </Typography>
                {getSubtitle && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {getSubtitle(item)}
                  </Typography>
                )}
                {details.length > 0 && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Stack spacing={0.5}>
                      {details.map((d) => (
                        <Stack key={d.label} direction="row" spacing={1} alignItems="baseline" sx={{ minWidth: 0 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                            {d.label}
                          </Typography>
                          <Typography
                            component="div"
                            variant="body2"
                            fontWeight={500}
                            noWrap={!d.wrap}
                            sx={{ flex: 1, minWidth: 0, textAlign: 'right' }}
                          >
                            {d.value}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </>
                )}
              </Box>
            </>
          )
          return (
            <Card
              key={getId(item)}
              variant="outlined"
              sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                borderLeft: accent ? `4px solid ${accent}` : undefined,
                transition: 'box-shadow .2s ease',
                '&:hover': { boxShadow: 4 },
                '&:hover .card-media': { transform: 'scale(1.04)' },
              }}
            >
              {onItemClick ? (
                <CardActionArea onClick={() => onItemClick(item)} sx={{ flex: 1, alignItems: 'stretch', display: 'block' }}>
                  {body}
                </CardActionArea>
              ) : (
                <Box sx={{ flex: 1 }}>{body}</Box>
              )}
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1 }}>
                <Stack direction="row" spacing={0.5} sx={{ minWidth: 0, flexWrap: 'wrap', rowGap: 0.5 }}>
                  {renderStatus?.(item)}
                </Stack>
                {actions && <RowActionMenu actions={actions(item)} />}
              </Stack>
            </Card>
          )
        })}
      </Box>
    )
  }

  return (
    <Box>
      {content}
      <ListPagination {...pagination} />
    </Box>
  )
}

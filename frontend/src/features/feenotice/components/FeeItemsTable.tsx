import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { FEE_ITEM_LABEL } from '@/features/feenotice/constants'
import type { FeeItem } from '@/features/feenotice/types'
import { formatCurrency, formatNumber } from '@/lib/format'

interface Props {
  items: FeeItem[]
  total: number
  paid?: number
  outstanding?: number
  dense?: boolean
}

/** Bảng các khoản của thông báo phí + dòng tổng (đã thu / còn nợ nếu có). */
export function FeeItemsTable({ items, total, paid, outstanding, dense }: Props) {
  return (
    <Table size="small" aria-label="Các khoản phí" sx={dense ? { '& td, & th': { py: 0.5 } } : undefined}>
      <TableHead>
        <TableRow>
          <TableCell width={40}>#</TableCell>
          <TableCell>Nhóm</TableCell>
          <TableCell>Khoản</TableCell>
          <TableCell align="right">Số lượng</TableCell>
          <TableCell align="right">Đơn giá</TableCell>
          <TableCell align="right">Thành tiền</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((i, idx) => (
          <TableRow key={`${i.type}-${idx}`}>
            <TableCell>{idx + 1}</TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>{FEE_ITEM_LABEL[i.type]}</TableCell>
            <TableCell>{i.description}</TableCell>
            <TableCell align="right">{formatNumber(i.quantity)}</TableCell>
            <TableCell align="right">{formatNumber(i.unitPrice)}</TableCell>
            <TableCell align="right" sx={{ color: i.amount < 0 ? 'error.main' : undefined, whiteSpace: 'nowrap' }}>
              {formatCurrency(i.amount)}
            </TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell colSpan={5} align="right">
            <b>Tổng cộng</b>
          </TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
            <b>{formatCurrency(total)}</b>
          </TableCell>
        </TableRow>
        {paid != null && (
          <TableRow>
            <TableCell colSpan={5} align="right">
              Đã thanh toán
            </TableCell>
            <TableCell align="right" sx={{ color: 'success.main', whiteSpace: 'nowrap' }}>
              {formatCurrency(paid)}
            </TableCell>
          </TableRow>
        )}
        {outstanding != null && (
          <TableRow>
            <TableCell colSpan={5} align="right">
              <b>Còn nợ</b>
            </TableCell>
            <TableCell align="right" sx={{ color: outstanding > 0 ? 'error.main' : undefined, whiteSpace: 'nowrap' }}>
              <b>{formatCurrency(outstanding)}</b>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

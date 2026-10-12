import Box from '@mui/material/Box'

interface FileKind {
  label: string
  color: string
}

const KINDS: Record<string, FileKind> = {
  pdf: { label: 'PDF', color: '#DC2626' },
  doc: { label: 'DOC', color: '#2563EB' },
  docx: { label: 'DOCX', color: '#2563EB' },
  xls: { label: 'XLS', color: '#15803D' },
  xlsx: { label: 'XLSX', color: '#15803D' },
  ppt: { label: 'PPT', color: '#EA580C' },
  pptx: { label: 'PPTX', color: '#EA580C' },
  image: { label: 'ẢNH', color: '#7C3AED' },
  file: { label: 'FILE', color: '#6B7280' },
}

const CONTENT_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
}

export function fileKind(name?: string, contentType?: string): FileKind {
  if (contentType?.startsWith('image/')) return KINDS.image
  if (contentType && CONTENT_TYPES[contentType]) return KINDS[CONTENT_TYPES[contentType]]
  const ext = name?.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return KINDS.image
  return KINDS[ext] ?? KINDS.file
}

interface FileIconProps {
  name?: string
  contentType?: string
  size?: number
}

/** Nhãn màu theo loại tệp (DOCX/PDF/XLSX/ảnh) như cột Mã ở danh sách tài liệu. */
export function FileIcon({ name, contentType, size = 28 }: FileIconProps) {
  const kind = fileKind(name, contentType)
  return (
    <Box
      aria-label={`Tệp ${kind.label}`}
      sx={{
        width: size,
        height: size * 1.2,
        flexShrink: 0,
        borderRadius: 1,
        bgcolor: `${kind.color}1A`,
        color: kind.color,
        border: `1px solid ${kind.color}55`,
        display: 'inline-flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        pb: 0.25,
        fontSize: Math.max(8, size * 0.28),
        fontWeight: 700,
        letterSpacing: -0.2,
      }}
    >
      {kind.label}
    </Box>
  )
}

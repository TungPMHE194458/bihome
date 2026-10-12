import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import Avatar, { type AvatarProps } from '@mui/material/Avatar'
import Box, { type BoxProps } from '@mui/material/Box'
import type { ReactNode } from 'react'
import { useAuthImage } from '@/lib/files'

interface AuthImageProps extends Omit<BoxProps, 'children'> {
  url?: string | null
  alt: string
  placeholder?: ReactNode
}

/** Ảnh lấy từ /files (cần token). Hiện placeholder khi chưa có ảnh hoặc đang tải. */
export function AuthImage({ url, alt, placeholder, sx, ...rest }: AuthImageProps) {
  const src = useAuthImage(url)
  if (!src) {
    return (
      <Box
        role="img"
        aria-label={alt}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
          color: 'grey.400',
          ...sx,
        }}
        {...rest}
      >
        {placeholder ?? <ImageOutlinedIcon fontSize="large" />}
      </Box>
    )
  }
  return <Box component="img" src={src} alt={alt} sx={{ objectFit: 'cover', ...sx }} {...rest} />
}

interface AuthAvatarProps extends Omit<AvatarProps, 'src'> {
  url?: string | null
  name?: string
}

export function AuthAvatar({ url, name, children, ...rest }: AuthAvatarProps) {
  const src = useAuthImage(url)
  return (
    <Avatar src={src} alt={name} {...rest}>
      {children ?? initials(name)}
    </Avatar>
  )
}

function initials(name?: string): string {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  return (parts.length > 1 ? parts[parts.length - 1][0] : parts[0][0])?.toUpperCase() ?? ''
}

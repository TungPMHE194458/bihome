/** Cắt ảnh vuông ở giữa và thu nhỏ (dùng cho ảnh đại diện) trước khi tải lên. */
export async function cropToSquare(file: File, size = 512): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2
  const target = Math.min(size, side)

  const canvas = document.createElement('canvas')
  canvas.width = target
  canvas.height = target
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.')
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Không xử lý được ảnh.'))), 'image/jpeg', 0.9),
  )
  const baseName = file.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
}

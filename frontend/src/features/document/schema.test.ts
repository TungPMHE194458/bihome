import { describe, expect, it } from 'vitest'
import {
  categorySchema,
  documentSchema,
  documentToRequest,
  emptyDocument,
  nameFromFile,
  normalizeTags,
} from '@/features/document/schema'

const file = { fileId: 7, name: 'noi_quy-toa-nha.pdf', size: 1024, contentType: 'application/pdf' }
const issues = (values: unknown) => {
  const r = documentSchema.safeParse(values)
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'))
}

describe('documentSchema', () => {
  it('requires name, category and a file when creating', () => {
    expect(issues(emptyDocument())).toEqual(['name', 'categoryId', 'file'])
    expect(issues({ ...emptyDocument(), name: 'Nội quy', categoryId: '3', file })).toEqual([])
  })

  it('does not require a file when editing and limits tags', () => {
    const editing = { ...emptyDocument(), name: 'Nội quy', categoryId: '3', requireFile: false }
    expect(issues(editing)).toEqual([])
    expect(issues({ ...editing, tags: Array.from({ length: 11 }, (_, i) => `t${i}`) })).toEqual(['tags'])
  })

  it('rejects codes with spaces or accents', () => {
    expect(issues({ ...emptyDocument(), name: 'A', categoryId: '3', file, code: 'nội quy' })).toEqual(['code'])
  })
})

describe('documentToRequest', () => {
  it('uppercases the code, normalizes tags and sends the uploaded file', () => {
    expect(
      documentToRequest({
        ...emptyDocument(),
        code: ' nq-01 ',
        name: ' Nội quy ',
        categoryId: '3',
        tags: [' Nội  quy', 'nội quy', 'PCCC'],
        file,
      }),
    ).toEqual({
      code: 'NQ-01',
      name: 'Nội quy',
      description: null,
      categoryId: 3,
      audience: 'ALL_RESIDENTS',
      tags: ['Nội quy', 'PCCC'],
      fileId: 7,
      version: undefined,
    })
  })

  it('leaves a blank code for the server to generate', () => {
    expect(documentToRequest({ ...emptyDocument(), name: 'A', categoryId: '1', file }).code).toBeNull()
  })
})

describe('helpers', () => {
  it('suggests a document name from the file name', () => {
    expect(nameFromFile(file)).toBe('noi quy toa nha')
  })

  it('dedupes tags ignoring case', () => {
    expect(normalizeTags(['A', 'a', ' b ', ''])).toEqual(['A', 'b'])
  })

  it('validates category colors', () => {
    expect(categorySchema.safeParse({ name: 'X', description: '', color: 'red', status: 'ACTIVE' }).success).toBe(false)
    expect(categorySchema.safeParse({ name: 'X', description: '', color: '#a1b2c3', status: 'ACTIVE' }).success).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { emptySurvey, move, newQuestion, surveySchema, surveyToRequest } from '@/features/survey/schema'

const issues = (values: unknown) => {
  const r = surveySchema.safeParse(values)
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'))
}

describe('surveySchema', () => {
  it('needs two distinct options for choice questions and a valid period', () => {
    const base = { ...emptySurvey(), title: 'Khảo sát' }
    const q = { ...newQuestion('SINGLE'), content: 'Vệ sinh' }
    expect(issues({ ...base, questions: [q] })).toEqual(['questions.0.options'])
    const ok = { ...q, options: [{ key: 'a', label: 'Tốt' }, { key: 'b', label: 'Chưa tốt' }] }
    expect(issues({ ...base, questions: [ok] })).toEqual([])
    expect(issues({ ...base, questions: [{ ...ok, options: [{ key: 'a', label: 'Tốt' }, { key: 'b', label: 'tốt' }] }] })).toEqual([
      'questions.0.options',
    ])
    expect(issues({ ...base, questions: [ok], endAt: base.startAt })).toEqual(['endAt'])
  })
})

describe('surveyToRequest', () => {
  it('drops blank options and options of non-choice questions, keeps order', () => {
    const v = {
      ...emptySurvey(),
      title: ' Khảo sát ',
      startAt: '2030-01-01T08:00',
      endAt: '2030-01-10T08:00',
      questions: [
        { key: 'x', type: 'RATING' as const, content: 'Hài lòng?', required: true, options: [{ key: 'o', label: 'thừa' }] },
        { key: 'y', id: 7, type: 'MULTIPLE' as const, content: 'Tiện ích', required: false, options: [{ key: 'a', id: 3, label: 'Gym' }, { key: 'b', label: ' ' }] },
      ],
    }
    const req = surveyToRequest(v, 2)
    expect(req.title).toBe('Khảo sát')
    expect(req.startAt).toBe('2030-01-01T08:00:00+07:00')
    expect(req.questions).toEqual([
      { id: undefined, type: 'RATING', content: 'Hài lòng?', required: true, options: [] },
      { id: 7, type: 'MULTIPLE', content: 'Tiện ích', required: false, options: [{ id: 3, label: 'Gym' }] },
    ])
  })

  it('moves items for drag and drop', () => {
    expect(move(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(move(['a', 'b'], 0, 5)).toEqual(['a', 'b'])
  })
})

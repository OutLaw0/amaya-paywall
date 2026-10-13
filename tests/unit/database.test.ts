import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), config: { supabaseUrl: 'https://example.supabase.co', supabaseSecretKey: 'placeholder' } }))
vi.mock('ofetch', () => ({ $fetch: mocks.fetch }))
vi.mock('#imports', () => ({ useRuntimeConfig: () => mocks.config }))
import { purchaseRepository } from '../../server/utils/database'
import type { PurchaseRow } from '../../server/utils/purchases'

const row: PurchaseRow = {
  id: '53cfb284-cab9-4dc6-9ced-4ea35a51357e',
  device_id: '53cfb284-cab9-4dc6-9ced-4ea35a51357e',
  request_id: 'd0e58c77-707f-4d77-a46c-4319db229e02',
  offer_id: 'yearly', created_at: '2026-10-13T12:00:00Z', expires_at: '2027-10-13T12:00:00Z',
}

beforeEach(() => { mocks.fetch.mockReset() })

describe('Supabase repository', () => {
  it('inserts with atomic conflict handling', async () => {
    mocks.fetch.mockResolvedValue([row])
    expect(await purchaseRepository().insertOnce(row)).toEqual(row)
    expect(mocks.fetch).toHaveBeenCalledWith(expect.stringContaining('/rest/v1/purchases'), expect.objectContaining({
      method: 'POST', query: { on_conflict: 'request_id' }, body: row,
      headers: expect.objectContaining({ Prefer: 'resolution=ignore-duplicates,return=representation' }),
    }))
  })

  it('loads existing row after a duplicate insert', async () => {
    mocks.fetch.mockResolvedValueOnce([]).mockResolvedValueOnce([row])
    expect(await purchaseRepository().insertOnce(row)).toEqual(row)
    expect(mocks.fetch).toHaveBeenCalledTimes(2)
  })

  it('sanitizes DB errors', async () => {
    mocks.fetch.mockRejectedValue(new Error('sensitive upstream details'))
    await expect(purchaseRepository().insertOnce(row)).rejects.toMatchObject({ statusCode: 503, statusMessage: 'Purchase service temporarily unavailable' })
  })

  it('filters restoration by device and unexpired date', async () => {
    mocks.fetch.mockResolvedValue([])
    expect(await purchaseRepository().latestActive(row.device_id, row.created_at)).toBeNull()
    expect(mocks.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      query: expect.objectContaining({ device_id: `eq.${row.device_id}`, expires_at: `gt.${row.created_at}` }),
    }))
  })

  it('fails explicitly when credentials are absent', () => {
    const saved = mocks.config.supabaseSecretKey
    mocks.config.supabaseSecretKey = ''
    expect(() => purchaseRepository()).toThrow('Purchase service is not configured')
    mocks.config.supabaseSecretKey = saved
  })
})

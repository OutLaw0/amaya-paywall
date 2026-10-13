import { describe, expect, it } from 'vitest'
import { buy, expiresAt, restore, validatePurchase } from '../../server/utils/purchases'
import type { PurchaseRepository, PurchaseRow } from '../../server/utils/purchases'

const deviceId = '53cfb284-cab9-4dc6-9ced-4ea35a51357e'
const requestId = 'd0e58c77-707f-4d77-a46c-4319db229e02'
const now = new Date('2026-01-31T12:34:56.789Z')

function memoryRepository() {
  const rows: PurchaseRow[] = []
  const repository: PurchaseRepository = {
    async insertOnce(row) {
      const existing = rows.find(item => item.request_id === row.request_id)
      if (existing) return existing
      rows.push(row)
      return row
    },
    async latestActive(device, timestamp) {
      return rows.filter(row => row.device_id === device && row.expires_at > timestamp)
        .sort((a, b) => b.expires_at.localeCompare(a.expires_at))[0] ?? null
    },
  }
  return { rows, repository }
}

describe('purchase service', () => {
  it.each(['monthly', 'yearly'] as const)('saves %s and returns only public fields', async (offerId) => {
    const { rows, repository } = memoryRepository()
    const purchase = await buy({ offerId, deviceId, requestId }, repository, now)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.device_id).toBe(deviceId)
    expect(purchase.offerId).toBe(offerId)
    expect(purchase.createdAt).toBe(now.toISOString())
    expect(purchase).not.toHaveProperty('device_id')
    expect(purchase).not.toHaveProperty('request_id')
  })

  it('returns the same purchase for concurrent retries', async () => {
    const { rows, repository } = memoryRepository()
    const request = { offerId: 'yearly', deviceId, requestId }
    const results = await Promise.all([buy(request, repository, now), buy(request, repository, now)])
    expect(rows).toHaveLength(1)
    expect(results[0]).toEqual(results[1])
  })

  it('rejects reuse of a request id for a different offer or device', async () => {
    const { repository } = memoryRepository()
    await buy({ offerId: 'yearly', deviceId, requestId }, repository, now)
    await expect(buy({ offerId: 'monthly', deviceId, requestId }, repository, now)).rejects.toMatchObject({ statusCode: 409 })
    await expect(buy({ offerId: 'yearly', deviceId: requestId, requestId }, repository, now)).rejects.toMatchObject({ statusCode: 409 })
  })

  it.each([null, {}, { offerId: 'unknown', deviceId, requestId }, { offerId: 'yearly', deviceId: 'invalid', requestId }, { offerId: 'monthly', deviceId, requestId: 'bad' }])('rejects malformed request %j', (request) => {
    expect(() => validatePurchase(request)).toThrow()
  })

  it('does not report success if storage fails', async () => {
    const { repository } = memoryRepository()
    repository.insertOnce = async () => { throw new Error('storage unavailable') }
    await expect(buy({ offerId: 'yearly', deviceId, requestId }, repository, now)).rejects.toThrow('storage unavailable')
  })

  it('restores active purchases only for the same device', async () => {
    const { repository } = memoryRepository()
    const purchase = await buy({ offerId: 'monthly', deviceId, requestId }, repository, now)
    expect(await restore({ deviceId }, repository, now)).toEqual(purchase)
    expect(await restore({ deviceId: requestId }, repository, now)).toBeNull()
    expect(await restore({ deviceId }, repository, new Date(purchase.expiresAt))).toBeNull()
  })

  it('clamps month-end and leap-day expiry, preserving UTC time', () => {
    expect(expiresAt(now, 'monthly').toISOString()).toBe('2026-02-28T12:34:56.789Z')
    expect(expiresAt(new Date('2024-01-31T12:00:00Z'), 'monthly').toISOString()).toBe('2024-02-29T12:00:00.000Z')
    expect(expiresAt(new Date('2024-02-29T12:00:00Z'), 'yearly').toISOString()).toBe('2025-02-28T12:00:00.000Z')
  })
})

import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createApp, toNodeListener } from 'h3'

const mocks = vi.hoisted(() => ({ insertOnce: vi.fn(), latestActive: vi.fn() }))
vi.mock('../../server/utils/database', () => ({ purchaseRepository: () => mocks }))
import offersRoute from '../../server/api/offers.get'
import purchaseRoute from '../../server/api/purchase.post'
import restoreRoute from '../../server/api/restore.post'

const app = createApp()
app.use('/api/offers', offersRoute)
app.use('/api/purchase', purchaseRoute)
app.use('/api/restore', restoreRoute)
const server = createServer(toNodeListener(app))
let url: string
beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) })
const post = (path: string, body: unknown) => fetch(`${url}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('HTTP routes', () => {
  it('GET offers returns two tariffs in integer kopecks', async () => {
    const response = await fetch(`${url}/api/offers`)
    expect(response.status).toBe(200)
    expect((await response.json()).offers.map((item: { price: number }) => item.price)).toEqual([29900, 199000])
  })
  it('rejects invalid purchase and restore with 400 before storage', async () => {
    expect((await post('/api/purchase', { offerId: 'unknown' })).status).toBe(400)
    expect((await post('/api/restore', { deviceId: 'bad' })).status).toBe(400)
    expect(mocks.insertOnce).not.toHaveBeenCalled()
  })
  it('returns saved purchase from POST and restores it', async () => {
    mocks.insertOnce.mockImplementation(async row => row)
    const response = await post('/api/purchase', { offerId: 'yearly', deviceId: '53cfb284-cab9-4dc6-9ced-4ea35a51357e', requestId: 'd0e58c77-707f-4d77-a46c-4319db229e02' })
    expect(response.status).toBe(200)
    expect((await response.json()).purchase.offerId).toBe('yearly')
    mocks.latestActive.mockResolvedValue(null)
    expect(await (await post('/api/restore', { deviceId: '53cfb284-cab9-4dc6-9ced-4ea35a51357e' })).json()).toEqual({ purchase: null })
  })
})

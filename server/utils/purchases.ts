import { randomUUID } from 'node:crypto'
import { createError } from 'h3'
import type { OfferId, Purchase, PurchaseRequest } from '../../shared/types/paywall'
import { offers } from './offers'

export interface PurchaseRow {
  id: string
  offer_id: OfferId
  device_id: string
  request_id: string
  created_at: string
  expires_at: string
}

export interface PurchaseRepository {
  insertOnce(row: PurchaseRow): Promise<PurchaseRow>
  latestActive(deviceId: string, now: string): Promise<PurchaseRow | null>
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateDeviceId(value: unknown): string {
  if (typeof value !== 'string' || !uuid.test(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid device identifier' })
  }
  return value
}

export function validatePurchase(value: unknown): PurchaseRequest {
  if (!value || typeof value !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid purchase request' })
  }
  const body = value as Record<string, unknown>
  const offer = offers.find(offer => offer.id === body.offerId)
  if (!offer || typeof body.requestId !== 'string' || !uuid.test(body.requestId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid offer or request identifier' })
  }
  return { offerId: offer.id, deviceId: validateDeviceId(body.deviceId), requestId: body.requestId }
}

// Clamp to the last day of the target month: January 31 → February 28/29.
export function expiresAt(date: Date, offerId: OfferId): Date {
  const result = new Date(date)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + (offerId === 'yearly' ? 12 : 1))
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}

export function publicPurchase(row: PurchaseRow): Purchase {
  return { id: row.id, offerId: row.offer_id, createdAt: row.created_at, expiresAt: row.expires_at }
}

export async function buy(body: unknown, repository: PurchaseRepository, now = new Date()): Promise<Purchase> {
  const request = validatePurchase(body)
  const row = await repository.insertOnce({
    id: randomUUID(),
    offer_id: request.offerId,
    device_id: request.deviceId,
    request_id: request.requestId,
    created_at: now.toISOString(),
    expires_at: expiresAt(now, request.offerId).toISOString(),
  })
  if (row.device_id !== request.deviceId || row.offer_id !== request.offerId) {
    throw createError({ statusCode: 409, statusMessage: 'Request identifier already used' })
  }
  return publicPurchase(row)
}

export async function restore(body: unknown, repository: PurchaseRepository, now = new Date()): Promise<Purchase | null> {
  const deviceId = validateDeviceId(body && typeof body === 'object' ? (body as Record<string, unknown>).deviceId : undefined)
  const row = await repository.latestActive(deviceId, now.toISOString())
  return row ? publicPurchase(row) : null
}

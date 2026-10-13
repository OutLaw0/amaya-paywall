import { createError } from 'h3'
import { $fetch } from 'ofetch'
import { useRuntimeConfig } from '#imports'
import type { PurchaseRepository, PurchaseRow } from './purchases'

export function purchaseRepository(): PurchaseRepository {
  const config = useRuntimeConfig()
  if (!config.supabaseUrl || !config.supabaseSecretKey) {
    throw createError({ statusCode: 503, statusMessage: 'Purchase service is not configured' })
  }
  const request = async (query: Record<string, string>, method: 'GET' | 'POST' = 'GET', body?: PurchaseRow) => {
    try {
      return await $fetch<PurchaseRow[]>(`${config.supabaseUrl}/rest/v1/purchases`, {
        method, query, body,
        headers: {
          apikey: config.supabaseSecretKey,
          ...(method === 'POST' ? { Prefer: 'resolution=ignore-duplicates,return=representation' } : {}),
        },
        timeout: 10000,
        retry: 0,
      })
    }
    catch {
      // Do not expose DB responses, connection details, or keys to the client/logs.
      throw createError({ statusCode: 503, statusMessage: 'Purchase service temporarily unavailable' })
    }
  }
  return {
    async insertOnce(row) {
      const rows = await request({ on_conflict: 'request_id' }, 'POST', row)
      if (rows[0]) return rows[0]
      const existing = await request({ request_id: `eq.${row.request_id}`, select: '*', limit: '1' })
      if (!existing[0]) throw createError({ statusCode: 503, statusMessage: 'Purchase could not be confirmed' })
      return existing[0]
    },
    async latestActive(deviceId, now) {
      const rows = await request({ device_id: `eq.${deviceId}`, expires_at: `gt.${now}`, order: 'expires_at.desc', limit: '1', select: '*' })
      return rows[0] ?? null
    },
  }
}

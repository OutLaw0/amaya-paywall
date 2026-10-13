import { computed, ref } from 'vue'
import { useFetch } from '#app'
import { $fetch } from 'ofetch'
import type { Offer, OfferId, Purchase, PurchaseRequest, PurchaseResponse, RestoreResponse } from '../../shared/types/paywall'

const deviceKey = 'amaya.device.v1'
const pendingKey = 'amaya.pending.v1'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function usePaywall() {
  const { data, status, error: offersError, refresh } = useFetch<{ offers: Offer[] }>('/api/offers', { server: false, retry: 0, timeout: 10000 })
  const selected = ref<OfferId>('yearly')
  const busy = ref<'purchase' | 'restore' | null>(null)
  const purchase = ref<Purchase | null>(null)
  const actionError = ref('')
  const notice = ref('')
  const offers = computed(() => data.value?.offers ?? [])
  const selectedOffer = computed(() => offers.value.find(offer => offer.id === selected.value))

  function deviceId(): string {
    try {
      const stored = localStorage.getItem(deviceKey)
      if (stored && uuidPattern.test(stored)) return stored
      const id = crypto.randomUUID()
      localStorage.setItem(deviceKey, id)
      return id
    }
    catch {
      throw new Error('storage')
    }
  }

  function pendingRequest(device: string): PurchaseRequest {
    try {
      const saved = JSON.parse(localStorage.getItem(pendingKey) ?? 'null') as Partial<PurchaseRequest> | null
      if (saved?.deviceId === device && saved.offerId === selected.value && typeof saved.requestId === 'string' && uuidPattern.test(saved.requestId)) {
        return saved as PurchaseRequest
      }
    }
    catch { /* Discard a malformed saved request. */ }
    const request = { deviceId: device, offerId: selected.value, requestId: crypto.randomUUID() }
    localStorage.setItem(pendingKey, JSON.stringify(request))
    return request
  }

  async function buy() {
    if (busy.value || purchase.value || !selectedOffer.value) return
    busy.value = 'purchase'
    actionError.value = ''
    notice.value = ''
    try {
      const request = pendingRequest(deviceId())
      const response = await $fetch<PurchaseResponse>('/api/purchase', { method: 'POST', body: request, timeout: 15000, retry: 0 })
      purchase.value = response.purchase
      // A cleanup failure must not hide an already confirmed purchase.
      try { localStorage.removeItem(pendingKey) } catch { /* Confirmation remains valid. */ }
    }
    catch (error) {
      actionError.value = error instanceof Error && error.message === 'storage'
        ? 'Разрешите хранение данных в браузере,\nчтобы сохранить покупку на этом устройстве.'
        : 'Не удалось завершить покупку.\nПопробуйте ещё раз.'
    }
    finally { busy.value = null }
  }

  async function restore() {
    if (busy.value) return
    busy.value = 'restore'
    actionError.value = ''
    notice.value = ''
    try {
      const response = await $fetch<RestoreResponse>('/api/restore', { method: 'POST', body: { deviceId: deviceId() }, timeout: 15000, retry: 0 })
      if (response.purchase) {
        selected.value = response.purchase.offerId
        purchase.value = response.purchase
      }
      else notice.value = 'На этом устройстве пока нет покупок.'
    }
    catch (error) {
      actionError.value = error instanceof Error && error.message === 'storage'
        ? 'Разрешите хранение данных в браузере,\nчтобы восстановить покупку.'
        : 'Не удалось восстановить покупки.\nНажмите «Восстановить покупки» ещё раз.'
    }
    finally { busy.value = null }
  }

  function select(id: OfferId) {
    if (busy.value) return
    selected.value = id
    actionError.value = ''
    notice.value = ''
  }

  return { offers, offersStatus: status, offersError, refresh, selected, selectedOffer, busy, purchase, actionError, notice, buy, restore, select }
}

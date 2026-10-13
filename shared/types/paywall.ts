export type OfferId = 'monthly' | 'yearly'

export interface Offer {
  id: OfferId
  title: string
  period: 'month' | 'year'
  price: number
  currency: 'RUB'
}

export interface PurchaseRequest {
  offerId: OfferId
  deviceId: string
  requestId: string
}

export interface Purchase {
  id: string
  offerId: OfferId
  createdAt: string
  expiresAt: string
}

export interface PurchaseResponse { purchase: Purchase }
export interface RestoreResponse { purchase: Purchase | null }

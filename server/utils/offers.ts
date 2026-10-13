import type { Offer } from '../../shared/types/paywall'

export const offers: readonly Offer[] = [
  { id: 'monthly', title: 'Месяц', period: 'month', price: 29900, currency: 'RUB' },
  { id: 'yearly', title: 'Год', period: 'year', price: 199000, currency: 'RUB' },
]

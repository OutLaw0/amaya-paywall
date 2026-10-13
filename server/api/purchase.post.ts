import { defineEventHandler, readBody } from 'h3'
import { purchaseRepository } from '../utils/database'
import { buy, validatePurchase } from '../utils/purchases'

export default defineEventHandler(async (event) => {
  const body = validatePurchase(await readBody(event))
  return { purchase: await buy(body, purchaseRepository()) }
})

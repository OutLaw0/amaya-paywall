import { defineEventHandler, readBody } from 'h3'
import { purchaseRepository } from '../utils/database'
import { restore, validateDeviceId } from '../utils/purchases'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const deviceId = validateDeviceId(body?.deviceId)
  return { purchase: await restore({ deviceId }, purchaseRepository()) }
})

import { defineEventHandler } from 'h3'
import { offers } from '../utils/offers'

export default defineEventHandler(() => ({ offers }))

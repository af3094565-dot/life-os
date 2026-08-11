import type { UserQuestListing } from '../data/seed'
import { questCreatorCut } from './economy'

/** Полезная нагрузка для ссылки «поделиться квестом» */
export type SharedQuestPayload = {
  v: 1
  shareCode: string
  title: string
  description: string
  emoji: string
  category: string
  price: number
  reward: number
  kind: 'streak' | 'list'
  durationDays: number
  timesPerWeek: number
  target: number
  listLabel?: string
  color: string
  authorName: string
  needsReminder?: boolean
  reminderDefault?: string
}

/** Чек продажи — друг отправляет автору, тот получает 50% */
export type SaleClaimPayload = {
  v: 1
  claimId: string
  shareCode: string
  title: string
  cut: number
  buyerName: string
  at: string
}

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(encoded: string): string | null {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
    const binary = atob(padded + pad)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

export function makeShareCode(): string {
  return `uq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function listingToSharePayload(listing: UserQuestListing): SharedQuestPayload {
  return {
    v: 1,
    shareCode: listing.shareCode,
    title: listing.title,
    description: listing.description,
    emoji: listing.emoji,
    category: listing.category,
    price: listing.price,
    reward: listing.reward,
    kind: listing.kind,
    durationDays: listing.durationDays,
    timesPerWeek: listing.timesPerWeek,
    target: listing.target,
    listLabel: listing.listLabel,
    color: listing.color,
    authorName: listing.authorName,
    needsReminder: listing.needsReminder,
    reminderDefault: listing.reminderDefault,
  }
}

export function encodeSharedQuest(payload: SharedQuestPayload): string {
  return toBase64Url(JSON.stringify(payload))
}

export function decodeSharedQuest(encoded: string): SharedQuestPayload | null {
  const raw = fromBase64Url(encoded)
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as SharedQuestPayload
    if (data.v !== 1 || !data.shareCode || !data.title || !data.price || !data.reward) {
      return null
    }
    if (data.kind !== 'streak' && data.kind !== 'list') return null
    return data
  } catch {
    return null
  }
}

export function sharedPayloadToListing(payload: SharedQuestPayload): UserQuestListing {
  return {
    id: `imported-${payload.shareCode}`,
    shareCode: payload.shareCode,
    title: payload.title,
    description: payload.description,
    emoji: payload.emoji || '⭐',
    category: payload.category || 'growth',
    price: payload.price,
    reward: payload.reward,
    kind: payload.kind,
    durationDays: payload.durationDays,
    timesPerWeek: payload.timesPerWeek,
    target: payload.target,
    listLabel: payload.listLabel,
    color: payload.color || '#e0e7ff',
    createdAt: new Date().toISOString(),
    isMine: false,
    authorName: payload.authorName || 'Друг',
    salesCount: 0,
    earnedDiamonds: 0,
    needsReminder: payload.needsReminder,
    reminderDefault: payload.reminderDefault,
  }
}

export function buildShareUrl(listing: UserQuestListing, origin = window.location.origin): string {
  const encoded = encodeSharedQuest(listingToSharePayload(listing))
  const url = new URL(origin + window.location.pathname)
  url.searchParams.set('quest', encoded)
  return url.toString()
}

export function makeSaleClaim(input: {
  shareCode: string
  title: string
  price: number
  buyerName: string
}): SaleClaimPayload {
  return {
    v: 1,
    claimId: `sale-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    shareCode: input.shareCode,
    title: input.title,
    cut: questCreatorCut(input.price),
    buyerName: input.buyerName,
    at: new Date().toISOString(),
  }
}

export function encodeSaleClaim(payload: SaleClaimPayload): string {
  return toBase64Url(JSON.stringify(payload))
}

export function decodeSaleClaim(encoded: string): SaleClaimPayload | null {
  const raw = fromBase64Url(encoded)
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as SaleClaimPayload
    if (data.v !== 1 || !data.claimId || !data.shareCode || !data.cut) return null
    return data
  } catch {
    return null
  }
}

export function buildSaleClaimUrl(
  payload: SaleClaimPayload,
  origin = window.location.origin,
): string {
  const url = new URL(origin + window.location.pathname)
  url.searchParams.set('questSale', encodeSaleClaim(payload))
  return url.toString()
}

export function readQuestDeepLink(search = window.location.search): {
  shared?: SharedQuestPayload
  sale?: SaleClaimPayload
} {
  try {
    const params = new URLSearchParams(search)
    const quest = params.get('quest')
    const sale = params.get('questSale')
    return {
      shared: quest ? decodeSharedQuest(quest) ?? undefined : undefined,
      sale: sale ? decodeSaleClaim(sale) ?? undefined : undefined,
    }
  } catch {
    return {}
  }
}

export function clearQuestDeepLink() {
  try {
    const url = new URL(window.location.href)
    url.searchParams.delete('quest')
    url.searchParams.delete('questSale')
    const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '') + url.hash
    window.history.replaceState({}, '', next)
  } catch {
    /* ignore */
  }
}

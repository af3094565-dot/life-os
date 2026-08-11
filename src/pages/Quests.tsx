import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  Check,
  Clock,
  Plus,
  Share2,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { AcceptQuestModal } from '../components/AcceptQuestModal'
import { AcceptUserQuestModal } from '../components/AcceptUserQuestModal'
import { BackBar } from '../components/BackBar'
import { CreateUserQuestModal } from '../components/CreateUserQuestModal'
import { EmptyState } from '../components/EmptyState'
import { Header } from '../components/Header'
import { NextActionCard } from '../components/NextActionCard'
import { SaleClaimShareModal } from '../components/SaleClaimShareModal'
import { ShareUserQuestModal } from '../components/ShareUserQuestModal'
import { SubscriptionPaywall } from '../components/SubscriptionPaywall'
import { Card, ProgressBar } from '../components/ui'
import {
  QUEST_CATALOG,
  QUEST_CATEGORY_LABELS,
  findQuestTemplate,
  questReward,
  type QuestCategory,
  type QuestTemplate,
} from '../data/questCatalog'
import type { QuestContract, UserQuestListing } from '../data/seed'
import type { LifeOSState } from '../hooks/useLifeOS'
import {
  DIAMOND,
  canAfford,
  formatDiamonds,
  questCostHint,
  questCreatorCut,
} from '../lib/economy'
import { formatRuDate } from '../lib/habitLogic'
import {
  contractProgress,
  formatDurationLabel,
  listLabelWord,
} from '../lib/questLogic'
import type { SaleClaimPayload } from '../lib/userQuestShare'

type Props = {
  state: LifeOSState
  userName: string
  hasSubscription: boolean
  onBuySubscription: () => void
  pendingShareCode?: string | null
  onPendingShareHandled?: () => void
  claimNotice?: string | null
  onClaimNoticeHandled?: () => void
  focusContractId?: string
  returnLabel?: string | null
  onBack?: () => void
}
type Tab = 'active' | 'catalog' | 'mine' | 'archive'

const TABS: { id: Tab; label: string }[] = [
  { id: 'active', label: 'Активные' },
  { id: 'catalog', label: 'Каталог' },
  { id: 'mine', label: 'Мои' },
  { id: 'archive', label: 'Архив' },
]

const COST_FILTERS = [0, 20, 30, 50] as const

export function QuestsPage({
  state,
  userName,
  hasSubscription,
  onBuySubscription,
  pendingShareCode,
  onPendingShareHandled,
  claimNotice,
  onClaimNoticeHandled,
  focusContractId,
  returnLabel,
  onBack,
}: Props) {
  const [tab, setTab] = useState<Tab>('catalog')
  const [category, setCategory] = useState<QuestCategory | 'all'>('all')
  const [costFilter, setCostFilter] = useState<(typeof COST_FILTERS)[number]>(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [accepting, setAccepting] = useState<QuestTemplate | null>(null)
  const [acceptingUser, setAcceptingUser] = useState<UserQuestListing | null>(null)
  const [creating, setCreating] = useState(false)
  const [sharing, setSharing] = useState<UserQuestListing | null>(null)
  const [saleClaim, setSaleClaim] = useState<SaleClaimPayload | null>(null)

  const active = state.activeContracts
  const myListings = useMemo(
    () => state.userListings.filter((l) => l.isMine),
    [state.userListings],
  )
  const friendListings = useMemo(
    () => state.userListings.filter((l) => !l.isMine),
    [state.userListings],
  )

  const archive = useMemo(
    () =>
      state.contracts
        .filter((c) => c.status !== 'active')
        .sort((a, b) =>
          (b.completedAt ?? b.acceptedAt).localeCompare(a.completedAt ?? a.acceptedAt),
        ),
    [state.contracts],
  )

  const activeTemplateIds = useMemo(
    () => new Set(active.map((c) => c.templateId)),
    [active],
  )

  const catalog = useMemo(() => {
    return QUEST_CATALOG.filter((q) => {
      if (category !== 'all' && q.category !== category) return false
      if (costFilter && q.cost !== costFilter) return false
      return true
    })
  }, [category, costFilter])

  useEffect(() => {
    if (!pendingShareCode) return
    const listing = state.userListings.find((l) => l.shareCode === pendingShareCode)
    if (!listing) return
    setTab(listing.isMine ? 'mine' : 'catalog')
    setAcceptingUser(listing)
    onPendingShareHandled?.()
  }, [pendingShareCode, state.userListings, onPendingShareHandled])

  useEffect(() => {
    if (!claimNotice) return
    setNotice(claimNotice)
    setTab('mine')
    onClaimNoticeHandled?.()
  }, [claimNotice, onClaimNoticeHandled])

  useEffect(() => {
    if (!focusContractId) return
    setTab('active')
    setExpandedId(focusContractId)
  }, [focusContractId])

  const accept = (template: QuestTemplate) => {
    setError('')
    setAccepting(template)
  }

  const confirmAccept = (reminderTime?: string) => {
    if (!accepting) return
    const result = state.acceptQuest(accepting.id, { reminderTime })
    if (!result.ok) {
      setError(result.reason ?? 'Не удалось принять квест')
      return
    }
    setAccepting(null)
    setTab('active')
  }

  const confirmAcceptUser = () => {
    if (!acceptingUser) return
    const result = state.acceptUserQuest(acceptingUser.id)
    if (!result.ok) {
      setError(result.reason ?? 'Не удалось принять квест')
      return
    }
    setAcceptingUser(null)
    setTab('active')
    if (result.saleClaim) {
      setSaleClaim(result.saleClaim)
    }
  }

  const shareListing = (listing: UserQuestListing) => {
    setError('')
    setSharing(listing)
  }

  const shareCatalog = (template: QuestTemplate) => {
    setError('')
    const result = state.publishCatalogQuest(template.id)
    if (!result.ok || !result.listing) {
      setError(result.reason ?? 'Не удалось подготовить ссылку')
      return
    }
    setSharing(result.listing)
    setNotice('Квест готов к отправке — с продажи тебе придёт 50%')
  }

  const shareContract = (contract: QuestContract) => {
    setError('')
    if (contract.listingId) {
      const listing = state.userListings.find((l) => l.id === contract.listingId)
      if (listing) {
        setSharing(listing)
        return
      }
    }
    if (contract.fromUserListing) {
      setError('Ссылка на этот квест больше недоступна')
      return
    }
    const result = state.publishCatalogQuest(contract.templateId)
    if (!result.ok || !result.listing) {
      setError(result.reason ?? 'Не удалось подготовить ссылку')
      return
    }
    setSharing(result.listing)
  }

  const focusContract =
    active.find((c) => c.id === focusContractId) ?? active[0] ?? null
  const focusHabit = focusContract?.habitId
    ? state.habitsAll.find((h) => h.id === focusContract.habitId)
    : null
  const focusProgress = focusContract
    ? contractProgress(focusContract, focusHabit)
    : null

  return (
    <div className="pb-24 md:pb-0">
      {onBack && returnLabel && <BackBar label={`← ${returnLabel}`} onBack={onBack} />}
      <Header
        greeting="Квесты"
        subtitle={
          hasSubscription
            ? 'Испытание, которое ты берёшь на себя'
            : 'Доступно в Pro'
        }
        streak={state.streak}
        diamonds={state.diamonds}
        visitStreak={state.visitStreak}
        diamondHistory={state.diamondHistory ?? []}
        userName={userName}
      />

      {!hasSubscription ? (
        <SubscriptionPaywall feature="quests" onBuy={onBuySubscription} />
      ) : (
      <>
      {focusContract && focusProgress ? (
        <NextActionCard
          className="mb-5"
          title="Продолжить квест"
          action={`⚔ ${focusContract.title}`}
          related={`${focusProgress.current} / ${focusProgress.target} · осталось выполнить сегодня`}
          relatedHint="Прогресс:"
          cta="К привычке"
          onAction={() => {
            setTab('active')
            setExpandedId(focusContract.id)
          }}
          secondaryLabel="Все квесты"
          onSecondary={() => setTab('catalog')}
          icon="⚔"
        />
      ) : (
        <Card className="mb-5 animate-fade-up">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <h3 className="text-base font-extrabold text-ink">Что такое квест?</h3>
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-muted">
                Это испытание на срок: платишь алмазы, выполняешь привычку или список дел —
                и получаешь награду. Можно взять из каталога или создать свой.
              </p>
            </div>
            <button
              type="button"
              data-tour="quests-create"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white"
            >
              <Plus size={16} /> Создать квест
            </button>
          </div>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-3.5 py-2 text-sm font-bold transition ${
              tab === t.id
                ? 'bg-brand text-white'
                : 'bg-surface text-muted ring-1 ring-line hover:text-ink'
            }`}
          >
            {t.label}
            {t.id === 'active' && active.length > 0 ? ` · ${active.length}` : ''}
            {t.id === 'mine' && myListings.length > 0 ? ` · ${myListings.length}` : ''}
          </button>
        ))}
      </div>

      {error && (
        <Card className="mb-4 border border-danger/20 !bg-red-50 animate-fade-up">
          <p className="text-sm font-semibold text-danger">{error}</p>
        </Card>
      )}

      {notice && (
        <Card className="mb-4 border border-emerald-200 !bg-emerald-50 animate-fade-up">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-emerald-800">{notice}</p>
            <button
              type="button"
              onClick={() => setNotice('')}
              className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>
          </div>
        </Card>
      )}

      {tab === 'active' && (
        <div className="grid gap-4">
          {active.length === 0 ? (
            <EmptyState
              emoji="⚔"
              title="Здесь будут твои испытания"
              description="Квест — вызов на срок с наградой. Выбери из каталога или создай свой за минуту."
              cta="Открыть каталог"
              onCta={() => setTab('catalog')}
              secondary="Создать квест"
              onSecondary={() => setCreating(true)}
            />
          ) : (
            active.map((c, i) => (
              <ContractCard
                key={c.id}
                contract={c}
                state={state}
                expanded={expandedId === c.id}
                onToggleExpand={() =>
                  setExpandedId((id) => (id === c.id ? null : c.id))
                }
                onShare={() => shareContract(c)}
                style={{ animationDelay: `${i * 40}ms` }}
              />
            ))
          )}
        </div>
      )}

      {tab === 'catalog' && (
        <>
          {friendListings.length > 0 && (
            <section className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <Users size={16} className="text-brand" />
                <h3 className="text-sm font-extrabold text-ink">От друзей</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {friendListings.map((listing, i) => (
                  <UserListingCard
                    key={listing.id}
                    listing={listing}
                    taken={activeTemplateIds.has(listing.id)}
                    diamonds={state.diamonds}
                    onAccept={() => {
                      setError('')
                      setAcceptingUser(listing)
                    }}
                    onShare={() => shareListing(listing)}
                    style={{ animationDelay: `${i * 30}ms` }}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="mb-4 flex flex-wrap gap-2">
            <FilterChip
              active={category === 'all'}
              onClick={() => setCategory('all')}
              label="Все"
            />
            {(Object.keys(QUEST_CATEGORY_LABELS) as QuestCategory[]).map((cat) => (
              <FilterChip
                key={cat}
                active={category === cat}
                onClick={() => setCategory(cat)}
                label={QUEST_CATEGORY_LABELS[cat]}
              />
            ))}
          </div>
          <div className="mb-5 flex flex-wrap gap-2">
            {COST_FILTERS.map((c) => (
              <FilterChip
                key={c}
                active={costFilter === c}
                onClick={() => setCostFilter(c)}
                label={c === 0 ? 'Любая цена' : `${DIAMOND} ${c} → ${c * 2}`}
              />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {catalog.map((q, i) => {
              const taken = activeTemplateIds.has(q.id)
              const affordable = canAfford(state.diamonds, q.cost)
              return (
                <article
                  key={q.id}
                  className="flex flex-col overflow-hidden rounded-2xl ring-1 ring-line animate-fade-up"
                  style={{
                    animationDelay: `${i * 30}ms`,
                    background: q.color,
                  }}
                >
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <span className="text-3xl">{q.emoji}</span>
                      <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-ink ring-1 ring-black/5">
                        {QUEST_CATEGORY_LABELS[q.category]}
                      </span>
                    </div>
                    <h3 className="text-lg font-extrabold leading-snug text-ink">
                      {q.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm font-medium leading-relaxed text-ink/70">
                      {q.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <MetaPill>{formatDurationLabel(q.durationDays)}</MetaPill>
                      <MetaPill>
                        {q.kind === 'list'
                          ? `${q.target} ${listLabelWord(q.listLabel, q.target)}`
                          : `${q.target} дн.`}
                      </MetaPill>
                      {q.kind === 'list' && <MetaPill>список</MetaPill>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-black/5 bg-white/50 px-5 py-3.5">
                    <div>
                      <p className="text-sm font-extrabold text-ink">
                        {DIAMOND} {q.cost}
                      </p>
                      <p className="text-[11px] font-bold text-success">
                        награда {questReward(q.cost)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => shareCatalog(q)}
                        className="inline-flex items-center gap-1 rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ink ring-1 ring-black/5"
                        aria-label="Поделиться"
                        title="Поделиться"
                      >
                        <Share2 size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={taken || !affordable}
                        title={
                          taken
                            ? 'Уже активен'
                            : !affordable
                              ? questCostHint(state.diamonds, q.cost)
                              : undefined
                        }
                        onClick={() => accept(q)}
                        className={`rounded-xl px-3.5 py-2 text-sm font-bold transition ${
                          taken
                            ? 'bg-ink/10 text-ink/40'
                            : affordable
                              ? 'bg-ink text-white hover:bg-ink/90'
                              : 'bg-ink/10 text-ink/40'
                        }`}
                      >
                        {taken ? 'Активен' : 'Принять'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}

      {tab === 'mine' && (
        <div className="grid gap-4">
          {myListings.length === 0 ? (
            <Card>
              <div className="py-8 text-center">
                <Share2 className="mx-auto mb-3 text-muted" size={28} />
                <p className="text-base font-extrabold text-ink">Пока нет своих квестов</p>
                <p className="mt-1 text-sm text-muted">
                  Создай квест, назначь цену и награду — и отправь друзьям
                </p>
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white"
                >
                  <Plus size={16} /> Создать квест
                </button>
              </div>
            </Card>
          ) : (
            myListings.map((listing, i) => (
              <UserListingCard
                key={listing.id}
                listing={listing}
                taken={activeTemplateIds.has(listing.id)}
                diamonds={state.diamonds}
                showOwnerStats
                onAccept={() => {
                  setError('')
                  setAcceptingUser(listing)
                }}
                onShare={() => shareListing(listing)}
                onDelete={() => {
                  if (confirm(`Удалить квест «${listing.title}»?`)) {
                    state.deleteUserQuest(listing.id)
                  }
                }}
                style={{ animationDelay: `${i * 40}ms` }}
              />
            ))
          )}
        </div>
      )}

      {tab === 'archive' && (
        <div className="grid gap-3">
          {archive.length === 0 ? (
            <Card>
              <p className="py-6 text-center text-sm font-medium text-muted">
                Архив пуст — завершённые и проигранные контракты появятся здесь
              </p>
            </Card>
          ) : (
            archive.map((c) => {
              const habit = state.habitsAll.find((h) => h.id === c.habitId)
              const progress = contractProgress(c, habit)
              return (
                <Card key={c.id} className="animate-fade-up">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{c.emoji}</span>
                      <div>
                        <p className="text-sm font-extrabold text-ink">{c.title}</p>
                        <p className="text-xs font-medium text-muted">
                          {progress.current}/{progress.target} · до {formatRuDate(c.deadline)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={c.status} reward={c.reward} />
                  </div>
                </Card>
              )
            })
          )}
        </div>
      )}

      <AcceptQuestModal
        template={accepting}
        open={!!accepting}
        onClose={() => setAccepting(null)}
        onConfirm={confirmAccept}
      />
      <AcceptUserQuestModal
        listing={acceptingUser}
        open={!!acceptingUser}
        onClose={() => setAcceptingUser(null)}
        onConfirm={confirmAcceptUser}
      />
      <CreateUserQuestModal
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(input) => {
          const result = state.createUserQuest(input)
          if (result.ok && result.listing) {
            setTab('mine')
            setSharing(result.listing)
            setNotice('Квест создан — поделись ссылкой с друзьями')
          }
          return result
        }}
      />
      <ShareUserQuestModal
        listing={sharing}
        open={!!sharing}
        onClose={() => setSharing(null)}
      />
      <SaleClaimShareModal
        claim={saleClaim}
        open={!!saleClaim}
        onClose={() => setSaleClaim(null)}
      />
      </>
      )}
    </div>
  )
}

function UserListingCard({
  listing,
  taken,
  diamonds,
  showOwnerStats,
  onAccept,
  onShare,
  onDelete,
  style,
}: {
  listing: UserQuestListing
  taken: boolean
  diamonds: number
  showOwnerStats?: boolean
  onAccept: () => void
  onShare: () => void
  onDelete?: () => void
  style?: CSSProperties
}) {
  const affordable = canAfford(diamonds, listing.price)
  const catLabel =
    QUEST_CATEGORY_LABELS[listing.category as QuestCategory] ?? listing.category

  return (
    <article
      className="flex flex-col overflow-hidden rounded-2xl ring-1 ring-line animate-fade-up"
      style={{ ...style, background: listing.color }}
    >
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="text-3xl">{listing.emoji}</span>
          <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-ink ring-1 ring-black/5">
            {listing.isMine ? 'Мой' : catLabel}
          </span>
        </div>
        <h3 className="text-lg font-extrabold leading-snug text-ink">{listing.title}</h3>
        <p className="mt-2 flex-1 text-sm font-medium leading-relaxed text-ink/70">
          {listing.description}
        </p>
        {!listing.isMine && (
          <p className="mt-2 text-xs font-bold text-ink/60">от {listing.authorName}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-1.5">
          <MetaPill>{formatDurationLabel(listing.durationDays)}</MetaPill>
          <MetaPill>
            {listing.kind === 'list'
              ? `${listing.target} ${listLabelWord(listing.listLabel, listing.target)}`
              : `${listing.target} дн.`}
          </MetaPill>
          {showOwnerStats && (
            <MetaPill>
              продаж {listing.salesCount} · +{listing.earnedDiamonds} {DIAMOND}
            </MetaPill>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 bg-white/50 px-5 py-3.5">
        <div>
          <p className="text-sm font-extrabold text-ink">
            {DIAMOND} {listing.price}
          </p>
          <p className="text-[11px] font-bold text-success">награда {listing.reward}</p>
          {listing.isMine && (
            <p className="text-[11px] font-semibold text-ink/60">
              с продажи +{questCreatorCut(listing.price)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-xl bg-white/70 p-2 text-ink/50 ring-1 ring-black/5 hover:text-danger"
              aria-label="Удалить"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onShare}
            className="inline-flex items-center gap-1 rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ink ring-1 ring-black/5"
          >
            <Share2 size={14} />
          </button>
          <button
            type="button"
            disabled={taken || !affordable}
            title={
              taken
                ? 'Уже активен'
                : !affordable
                  ? questCostHint(diamonds, listing.price)
                  : undefined
            }
            onClick={onAccept}
            className={`rounded-xl px-3.5 py-2 text-sm font-bold transition ${
              taken
                ? 'bg-ink/10 text-ink/40'
                : affordable
                  ? 'bg-ink text-white hover:bg-ink/90'
                  : 'bg-ink/10 text-ink/40'
            }`}
          >
            {taken ? 'Активен' : 'Принять'}
          </button>
        </div>
      </div>
    </article>
  )
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
        active
          ? 'bg-brand text-white'
          : 'bg-surface text-muted ring-1 ring-line hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}

function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-ink/80 ring-1 ring-black/5">
      {children}
    </span>
  )
}

function StatusBadge({
  status,
  reward,
}: {
  status: QuestContract['status']
  reward: number
}) {
  if (status === 'won') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
        <Trophy size={12} /> +{formatDiamonds(reward)}
      </span>
    )
  }
  if (status === 'lost') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-red-100">
        <X size={12} /> Срок вышел
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-xs font-bold text-muted ring-1 ring-line">
      Отменён
    </span>
  )
}

function ContractCard({
  contract,
  state,
  expanded,
  onToggleExpand,
  onShare,
  style,
}: {
  contract: QuestContract
  state: LifeOSState
  expanded: boolean
  onToggleExpand: () => void
  onShare: () => void
  style?: CSSProperties
}) {
  const habit = state.habitsAll.find((h) => h.id === contract.habitId)
  const progress = contractProgress(contract, habit)
  const showList = contract.kind === 'list'

  return (
    <div
      className="overflow-hidden rounded-2xl ring-1 ring-line animate-fade-up"
      style={style}
    >
      <div className="p-5" style={{ background: contract.color }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{contract.emoji}</span>
            <div>
              <h3 className="text-lg font-extrabold text-ink">{contract.title}</h3>
              <p className="mt-1 text-sm font-medium text-ink/70">{contract.description}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <MetaPill>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} /> {progress.daysLeft} дн. осталось
                  </span>
                </MetaPill>
                <MetaPill>до {formatRuDate(contract.deadline)}</MetaPill>
                <MetaPill>
                  ставка {DIAMOND} {contract.cost} → {contract.reward}
                </MetaPill>
                {contract.fromUserListing && <MetaPill>свой / от друга</MetaPill>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-1 rounded-xl bg-white/60 px-3 py-1.5 text-xs font-bold text-ink/70 ring-1 ring-black/5 hover:text-ink"
              title="Поделиться"
            >
              <Share2 size={14} /> Поделиться
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    `Отменить контракт «${contract.title}»? Алмазы не вернутся, привычка удалится.`,
                  )
                ) {
                  state.abandonQuest(contract.id)
                }
              }}
              className="rounded-xl bg-white/60 px-3 py-1.5 text-xs font-bold text-ink/60 ring-1 ring-black/5 hover:text-danger"
            >
              Отменить
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-bold text-ink">
              {progress.current} / {progress.target}
              {contract.kind === 'list'
                ? ` ${listLabelWord(contract.listLabel, progress.target)}`
                : ' дней'}
            </span>
            <span className="font-extrabold text-ink">{progress.pct}%</span>
          </div>
          <ProgressBar value={progress.pct} barClassName="bg-ink" className="!bg-white/50" />
        </div>

        {habit &&
          (contract.reminderTime ||
            findQuestTemplate(contract.templateId)?.needsReminder) && (
            <div className="mt-4 rounded-xl bg-white/60 px-3 py-2.5 ring-1 ring-black/5">
              <label className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-ink/70">
                <Clock size={12} /> Напоминание на дашборде с
              </label>
              <input
                type="time"
                value={habit.reminderTime ?? contract.reminderTime ?? '23:00'}
                onChange={(e) => state.setQuestReminder(habit.id, e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm font-semibold text-ink"
              />
            </div>
          )}
      </div>

      {showList && (
        <div className="border-t border-line bg-surface px-5 py-4">
          <button
            type="button"
            onClick={onToggleExpand}
            className="mb-3 flex w-full items-center justify-between text-left"
          >
            <span className="text-sm font-extrabold text-ink">
              Список {listLabelWord(contract.listLabel, 5)}
            </span>
            <span className="text-xs font-bold text-brand">
              {expanded ? 'Свернуть' : 'Редактировать'}
            </span>
          </button>

          {(expanded ? contract.listItems : contract.listItems.slice(0, 3)).map(
            (item, index) => (
              <div key={item.id} className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={!item.title.trim()}
                  onClick={() =>
                    state.updateQuestListItem(contract.id, item.id, {
                      done: !item.done,
                    })
                  }
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                    item.done
                      ? 'bg-success text-white'
                      : 'bg-canvas text-muted ring-1 ring-line'
                  } ${!item.title.trim() ? 'opacity-40' : ''}`}
                >
                  {item.done ? <Check size={14} /> : index + 1}
                </button>
                {expanded ? (
                  <input
                    value={item.title}
                    onChange={(e) =>
                      state.updateQuestListItem(contract.id, item.id, {
                        title: e.target.value,
                      })
                    }
                    placeholder={`${contract.listLabel ?? 'пункт'} ${index + 1}`}
                    className={`min-w-0 flex-1 rounded-xl bg-canvas px-3 py-2 text-sm font-medium outline-none ring-1 ring-line focus:ring-brand/40 ${
                      item.done ? 'text-muted line-through' : 'text-ink'
                    }`}
                  />
                ) : (
                  <span
                    className={`min-w-0 flex-1 truncate text-sm font-medium ${
                      item.done ? 'text-muted line-through' : 'text-ink'
                    }`}
                  >
                    {item.title.trim() || (
                      <span className="text-muted">
                        {contract.listLabel ?? 'пункт'} {index + 1} — не указано
                      </span>
                    )}
                  </span>
                )}
              </div>
            ),
          )}

          {!expanded && contract.listItems.length > 3 && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="mt-1 text-xs font-bold text-brand hover:underline"
            >
              Ещё {contract.listItems.length - 3}…
            </button>
          )}
        </div>
      )}

      <div className="border-t border-line bg-canvas/60 px-5 py-3 text-xs font-medium text-muted">
        Привычка «{habit?.emoji} {contract.habitTitle ?? habit?.name ?? '—'}»
        {contract.habitTagline ? ` — ${contract.habitTagline}` : ''} · отмечай дни в разделе
        Привычки
      </div>
    </div>
  )
}

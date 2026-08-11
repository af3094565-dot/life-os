import { useCallback, useEffect, useState } from 'react'
import { AccountPanel } from './components/AccountPanel'
import { BalanceWheelOfferModal } from './components/BalanceWheelOfferModal'
import { ProTourOfferModal } from './components/ProTourOfferModal'
import { Sidebar } from './components/Sidebar'
import { TourOverlay } from './components/TourOverlay'
import { TrainingOfferModal } from './components/TrainingOfferModal'
import { FREE_TOUR_STEPS, PRO_TOUR_STEPS, defaultTrainingPhase } from './data/tour'
import type { PageId } from './data/seed'
import { useAuth } from './hooks/useAuth'
import { useLifeOS } from './hooks/useLifeOS'
import { isTesterUser } from './lib/auth'
import { formatDiamonds } from './lib/economy'
import {
  clearQuestDeepLink,
  readQuestDeepLink,
} from './lib/userQuestShare'
import { AuthPage } from './pages/AuthPage'
import { Dashboard } from './pages/Dashboard'
import { DesktopPage } from './pages/Desktop'
import { GoalsPage } from './pages/Goals'
import { HabitsPage } from './pages/Habits'
import { LifeMapPage } from './pages/LifeMap'
import { PlannerPage } from './pages/Planner'
import { PlannerCalendarPage } from './pages/PlannerCalendar'
import { ProgressPage } from './pages/Progress'
import { QuestsPage } from './pages/Quests'
import { placeLifeMapOnMoodboard } from './components/desktop/moodboard/placeOnMoodboard'

export default function App() {
  const auth = useAuth()
  const [page, setPage] = useState<PageId>('dashboard')
  const state = useLifeOS(auth.user?.id ?? null)
  const [pendingShareCode, setPendingShareCode] = useState<string | null>(null)
  const [claimNotice, setClaimNotice] = useState<string | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [trainingOfferOpen, setTrainingOfferOpen] = useState(false)
  const [wheelOfferOpen, setWheelOfferOpen] = useState(false)
  const [proTourOfferOpen, setProTourOfferOpen] = useState(false)
  const [justRegistered, setJustRegistered] = useState(false)
  const [tourStepIndex, setTourStepIndex] = useState(0)
  /** После покупки Pro вне оффера колеса — предложить Pro-тур */
  const [awaitProTourAfterBuy, setAwaitProTourAfterBuy] = useState(false)

  const trainingPhase = defaultTrainingPhase(auth.user?.trainingPhase)
  const freeTourActive = trainingPhase === 'free_tour'
  const proTourActive = trainingPhase === 'pro_tour'

  useEffect(() => {
    if (!auth.isAuthenticated) return
    const link = readQuestDeepLink()
    if (!link.shared && !link.sale) return

    if (link.shared) {
      const result = state.importSharedQuest(link.shared)
      if (result.ok && result.listing) {
        setPage('quests')
        setPendingShareCode(result.listing.shareCode)
      }
    }

    if (link.sale) {
      const result = state.claimQuestSale(link.sale)
      setPage('quests')
      if (result.ok && result.cut != null) {
        setClaimNotice(
          `Продажа зачислена: +${formatDiamonds(result.cut)} за квест «${link.sale.title}»`,
        )
      } else {
        setClaimNotice(result.reason ?? 'Не удалось зачислить продажу')
      }
    }

    clearQuestDeepLink()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated])

  useEffect(() => {
    if (!auth.user) {
      setTrainingOfferOpen(false)
      setWheelOfferOpen(false)
      setProTourOfferOpen(false)
      setJustRegistered(false)
      setAwaitProTourAfterBuy(false)
      return
    }

    const phase = defaultTrainingPhase(auth.user.trainingPhase)

    if (justRegistered && phase === 'offer') {
      setTrainingOfferOpen(true)
      return
    }

    if (phase === 'wheel_offer') {
      setWheelOfferOpen(true)
      return
    }

    if (phase === 'pro_offer' && auth.user.hasSubscription) {
      setProTourOfferOpen(true)
    }
  }, [auth.user, justRegistered])

  useEffect(() => {
    if (!awaitProTourAfterBuy || !auth.user?.hasSubscription) return
    setAwaitProTourAfterBuy(false)
    const phase = defaultTrainingPhase(auth.user.trainingPhase)
    if (phase === 'completed' || phase === 'skipped' || phase === 'pro_tour') return
    if (phase === 'pro_offer' || phase === 'wheel_offer' || phase === 'free_tour') {
      auth.setTraining('pro_offer')
      setProTourOfferOpen(true)
      setWheelOfferOpen(false)
    }
  }, [awaitProTourAfterBuy, auth])

  const clearPendingShare = useCallback(() => setPendingShareCode(null), [])
  const clearClaimNotice = useCallback(() => setClaimNotice(null), [])

  const handleRegistered = useCallback(() => {
    setJustRegistered(true)
    setPage('dashboard')
  }, [])

  const startFreeTour = useCallback(() => {
    setTrainingOfferOpen(false)
    setJustRegistered(false)
    setTourStepIndex(0)
    auth.setTraining('free_tour')
    setPage('dashboard')
  }, [auth])

  const skipTraining = useCallback(() => {
    setTrainingOfferOpen(false)
    setJustRegistered(false)
    auth.setTraining('wheel_offer')
    setWheelOfferOpen(true)
  }, [auth])

  const completeFreeTour = useCallback(() => {
    auth.setTraining('wheel_offer')
    setWheelOfferOpen(true)
    setPage('dashboard')
  }, [auth])

  const skipFreeTour = useCallback(() => {
    auth.setTraining('wheel_offer')
    setWheelOfferOpen(true)
  }, [auth])

  const createWheel = useCallback(
    (addToMoodboard: boolean) => {
      auth.setLifeMapOffer('accepted')
      setWheelOfferOpen(false)
      if (!state.hasLifeMap) {
        state.createLifeMap()
        if (addToMoodboard) placeLifeMapOnMoodboard(state)
      }
      setPage('life-map')
      auth.setTraining('pro_offer')
      setProTourOfferOpen(true)
    },
    [auth, state],
  )

  const buyAndCreateWheel = useCallback(
    (addToMoodboard: boolean) => {
      auth.buySubscription()
      createWheel(addToMoodboard)
    },
    [auth, createWheel],
  )

  const deferWheel = useCallback(() => {
    auth.setLifeMapOffer('deferred')
    setWheelOfferOpen(false)
    // Если подписка уже есть — предложим Pro-тур отдельно
    if (auth.hasSubscription) {
      auth.setTraining('pro_offer')
      setProTourOfferOpen(true)
    } else {
      auth.setTraining('completed')
    }
  }, [auth])

  const startProTour = useCallback(() => {
    setProTourOfferOpen(false)
    setTourStepIndex(0)
    auth.setTraining('pro_tour')
    setPage('life-map')
  }, [auth])

  const skipProTour = useCallback(() => {
    setProTourOfferOpen(false)
    auth.setTraining('completed')
  }, [auth])

  const completeProTour = useCallback(() => {
    auth.setTraining('completed')
    setPage('dashboard')
  }, [auth])

  const buySubscription = useCallback(() => {
    const phase = defaultTrainingPhase(auth.user?.trainingPhase)
    const alreadyHad = auth.hasSubscription
    auth.buySubscription()
    setAccountOpen(false)
    if (alreadyHad) return

    if (phase === 'wheel_offer') {
      setAwaitProTourAfterBuy(true)
      return
    }
    // Купили вне тура — предложить Pro-обучение
    if (
      phase === 'completed' ||
      phase === 'skipped' ||
      phase === 'pro_offer'
    ) {
      auth.setTraining('pro_offer')
      setProTourOfferOpen(true)
      setWheelOfferOpen(false)
    }
  }, [auth])

  const restartTraining = useCallback(() => {
    setAccountOpen(false)
    setTourStepIndex(0)
    setProTourOfferOpen(false)
    setWheelOfferOpen(false)
    setTrainingOfferOpen(true)
    auth.setTraining('offer')
  }, [auth])

  const handleLogout = useCallback(() => {
    setAccountOpen(false)
    auth.logout()
  }, [auth])

  if (!auth.isAuthenticated || !auth.user) {
    return <AuthPage auth={auth} onRegistered={handleRegistered} />
  }

  const userName = auth.user.name

  return (
    <div className="flex min-h-screen bg-canvas">
      <div className="sticky top-0 hidden h-screen md:block">
        <Sidebar
          page={page}
          onNavigate={setPage}
          hasSubscription={auth.hasSubscription}
          onOpenAccount={() => setAccountOpen(true)}
          onLogout={handleLogout}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-line bg-surface px-3 py-2 md:hidden">
          <div className="flex items-center gap-1">
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
              {(
                [
                  ['dashboard', 'Дашборд', 'nav-dashboard'],
                  ['desktop', 'Рабочий стол', 'nav-desktop'],
                  ['planner', 'Планировщик', 'nav-planner'],
                  ['planner-calendar', 'Календарь', 'nav-calendar'],
                  ['habits', 'Привычки', 'nav-habits'],
                  ['goals', 'Цели', 'nav-goals'],
                  ['quests', 'Квесты', 'nav-quests'],
                  ['life-map', 'Карта', 'nav-life-map'],
                  ['progress', 'Прогресс', 'nav-progress'],
                ] as const
              ).map(([id, label, tour]) => (
                <button
                  key={id}
                  type="button"
                  data-tour={tour}
                  onClick={() => setPage(id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${
                    page === id ? 'bg-brand-soft text-brand' : 'text-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-danger hover:bg-red-50"
            >
              Выйти
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-auto p-4 md:p-7">
          {page === 'dashboard' && (
            <Dashboard
              state={state}
              onNavigate={setPage}
              userName={userName}
              isTester={isTesterUser(auth.user)}
              lifeMapDeferred={
                !state.hasLifeMap &&
                (auth.user.lifeMapOfferStatus === 'deferred' ||
                  auth.user.lifeMapOfferStatus === 'accepted')
              }
            />
          )}
          {page === 'desktop' && <DesktopPage state={state} userName={userName} onNavigate={setPage} />}
          {page === 'planner' && <PlannerPage state={state} userName={userName} onNavigate={setPage} />}
          {page === 'planner-calendar' && (
            <PlannerCalendarPage state={state} userName={userName} onNavigate={setPage} />
          )}
          {page === 'habits' && <HabitsPage state={state} userName={userName} />}
          {page === 'goals' && (
            <GoalsPage
              state={state}
              userName={userName}
              hasSubscription={auth.hasSubscription}
              onBuySubscription={buySubscription}
            />
          )}
          {page === 'quests' && (
            <QuestsPage
              state={state}
              userName={userName}
              hasSubscription={auth.hasSubscription}
              onBuySubscription={buySubscription}
              pendingShareCode={pendingShareCode}
              onPendingShareHandled={clearPendingShare}
              claimNotice={claimNotice}
              onClaimNoticeHandled={clearClaimNotice}
            />
          )}
          {page === 'life-map' && (
            <LifeMapPage
              state={state}
              userName={userName}
              hasSubscription={auth.hasSubscription}
              onBuySubscription={buySubscription}
              onLifeMapCreated={() => auth.setLifeMapOffer('done')}
            />
          )}
          {page === 'progress' && (
            <ProgressPage state={state} userName={userName} />
          )}
        </main>
      </div>

      <TrainingOfferModal
        open={trainingOfferOpen}
        userName={userName}
        onStart={startFreeTour}
        onSkip={skipTraining}
      />

      <BalanceWheelOfferModal
        open={wheelOfferOpen}
        userName={userName}
        hasSubscription={auth.hasSubscription}
        onBuyAndCreate={buyAndCreateWheel}
        onCreateOnly={createWheel}
        onDefer={deferWheel}
      />

      <ProTourOfferModal
        open={proTourOfferOpen}
        userName={userName}
        onStart={startProTour}
        onSkip={skipProTour}
      />

      {freeTourActive && (
        <TourOverlay
          steps={FREE_TOUR_STEPS}
          stepIndex={tourStepIndex}
          page={page}
          onNavigate={setPage}
          onStepIndex={setTourStepIndex}
          onComplete={completeFreeTour}
          onSkip={skipFreeTour}
        />
      )}

      {proTourActive && (
        <TourOverlay
          steps={PRO_TOUR_STEPS}
          stepIndex={tourStepIndex}
          page={page}
          onNavigate={setPage}
          onStepIndex={setTourStepIndex}
          onComplete={completeProTour}
          onSkip={skipProTour}
        />
      )}

      <AccountPanel
        open={accountOpen}
        user={auth.user}
        onClose={() => setAccountOpen(false)}
        onBuy={buySubscription}
        onLogout={handleLogout}
        onOpenLifeMap={() => setPage('life-map')}
        onRestartTraining={restartTraining}
        showLifeMapCta={
          !state.hasLifeMap &&
          (auth.user.lifeMapOfferStatus === 'deferred' ||
            auth.user.lifeMapOfferStatus === 'accepted')
        }
      />
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { AccountPanel } from './components/AccountPanel'
import { ActionToast, useActionToast } from './components/ActionToast'
import { BalanceWheelOfferModal } from './components/BalanceWheelOfferModal'
import { GoalFormModal } from './components/GoalFormModal'
import { HabitFormModal } from './components/HabitFormModal'
import { MobileNav } from './components/MobileNav'
import { ProTourOfferModal } from './components/ProTourOfferModal'
import { QuickAdd, QuickAddFab, type QuickAddKind } from './components/QuickAdd'
import { Sidebar } from './components/Sidebar'
import { TourOverlay } from './components/TourOverlay'
import { TrainingOfferModal } from './components/TrainingOfferModal'
import { FREE_TOUR_STEPS, PRO_TOUR_STEPS, defaultTrainingPhase } from './data/tour'
import type { PageId } from './data/seed'
import { useAuth } from './hooks/useAuth'
import { useLifeOS } from './hooks/useLifeOS'
import { useNavigation } from './hooks/useNavigation'
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
import { AchievementsPage } from './pages/Achievements'
import { AchievementUnlockModal } from './components/achievements/AchievementUnlockModal'
import { getAchievementDefinition } from './lib/achievements'
import { placeLifeMapOnMoodboard } from './components/desktop/moodboard/placeOnMoodboard'
import {
  submitGoalWithMoodboardOption,
  submitHabitWithMoodboardOption,
} from './components/desktop/moodboard/placeOnMoodboard'

export default function App() {
  const auth = useAuth()
  const nav = useNavigation('dashboard')
  const { page, navigate, goBack, canGoBack, backLabel, ctx, clearEntity } = nav
  const state = useLifeOS(auth.user?.id ?? null)
  const [pendingShareCode, setPendingShareCode] = useState<string | null>(null)
  const [claimNotice, setClaimNotice] = useState<string | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [trainingOfferOpen, setTrainingOfferOpen] = useState(false)
  const [wheelOfferOpen, setWheelOfferOpen] = useState(false)
  const [proTourOfferOpen, setProTourOfferOpen] = useState(false)
  const [justRegistered, setJustRegistered] = useState(false)
  const [tourStepIndex, setTourStepIndex] = useState(0)
  const [awaitProTourAfterBuy, setAwaitProTourAfterBuy] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [habitFormOpen, setHabitFormOpen] = useState(false)
  const [goalFormOpen, setGoalFormOpen] = useState(false)
  const { toast, showToast, clearToast } = useActionToast()
  const [achievementPopupId, setAchievementPopupId] = useState<string | null>(null)
  const [achievementBatch, setAchievementBatch] = useState<{
    count: number
    xp: number
    diamonds: number
    ids: string[]
  } | null>(null)

  const trainingPhase = defaultTrainingPhase(auth.user?.trainingPhase)
  const freeTourActive = trainingPhase === 'free_tour'
  const proTourActive = trainingPhase === 'pro_tour'
  const showAdvanced =
    trainingPhase === 'completed' ||
    trainingPhase === 'pro_tour' ||
    trainingPhase === 'pro_offer' ||
    auth.hasSubscription ||
    state.habitsAll.length >= 2

  const go = useCallback(
    (next: PageId, opts?: { entityId?: string; returnTo?: PageId; view?: string }) => {
      const entityType =
        next === 'goals'
          ? 'goal'
          : next === 'habits'
            ? 'habit'
            : next === 'quests'
              ? 'quest'
              : next === 'planner' || next === 'planner-calendar'
                ? 'task'
                : next === 'life-map'
                  ? 'life-area'
                  : undefined
      navigate(next, {
        entityId: opts?.entityId,
        entityType: opts?.entityId ? entityType : undefined,
        returnTo: opts?.returnTo ?? page,
        view: opts?.view,
      })
    },
    [navigate, page],
  )

  useEffect(() => {
    if (!auth.isAuthenticated) return
    const link = readQuestDeepLink()
    if (!link.shared && !link.sale) return

    if (link.shared) {
      const result = state.importSharedQuest(link.shared)
      if (result.ok && result.listing) {
        navigate('quests', { replace: true })
        setPendingShareCode(result.listing.shareCode)
      }
    }

    if (link.sale) {
      const result = state.claimQuestSale(link.sale)
      navigate('quests', { replace: true })
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

  useEffect(() => {
    if (!auth.isAuthenticated) return
    state.trackPageOpen(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, auth.isAuthenticated])

  useEffect(() => {
    const batch = state.achievements?.pendingBatch ?? []
    const pending = state.achievements?.pendingUnlocks ?? []
    if (batch.length >= 4) {
      const ids = [...batch]
      const xp = ids.reduce(
        (sum, id) => sum + (getAchievementDefinition(id)?.xpReward ?? 0),
        0,
      )
      const diamonds = ids.reduce(
        (sum, id) => sum + (getAchievementDefinition(id)?.diamondReward ?? 0),
        0,
      )
      setAchievementBatch({ count: ids.length, xp, diamonds, ids })
      setAchievementPopupId(null)
      state.ackAchievementUnlocks(ids)
      return
    }
    if (pending.length > 0 && !achievementPopupId && !achievementBatch) {
      const next = pending[0]
      setAchievementPopupId(next)
      state.ackAchievementUnlocks([next])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.achievements?.pendingUnlocks,
    state.achievements?.pendingBatch,
  ])

  const handleRegistered = useCallback(() => {
    setJustRegistered(true)
    navigate('dashboard', { replace: true })
  }, [navigate])

  const startFreeTour = useCallback(() => {
    setTrainingOfferOpen(false)
    setJustRegistered(false)
    setTourStepIndex(0)
    auth.setTraining('free_tour')
    navigate('dashboard', { replace: true })
  }, [auth, navigate])

  const skipTraining = useCallback(() => {
    setTrainingOfferOpen(false)
    setJustRegistered(false)
    auth.setTraining('wheel_offer')
    setWheelOfferOpen(true)
  }, [auth])

  const completeFreeTour = useCallback(() => {
    auth.setTraining('wheel_offer')
    setWheelOfferOpen(true)
    navigate('dashboard', { replace: true })
  }, [auth, navigate])

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
      navigate('life-map', { replace: true })
      auth.setTraining('pro_offer')
      setProTourOfferOpen(true)
    },
    [auth, state, navigate],
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
    navigate('life-map', { replace: true })
  }, [auth, navigate])

  const skipProTour = useCallback(() => {
    setProTourOfferOpen(false)
    auth.setTraining('completed')
  }, [auth])

  const completeProTour = useCallback(() => {
    auth.setTraining('completed')
    navigate('dashboard', { replace: true })
  }, [auth, navigate])

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

  const handleQuickPick = useCallback(
    (kind: QuickAddKind) => {
      if (kind === 'habit') {
        setHabitFormOpen(true)
        return
      }
      if (kind === 'goal') {
        if (!auth.hasSubscription) {
          go('goals')
          return
        }
        setGoalFormOpen(true)
        return
      }
      if (kind === 'task') {
        go('planner')
        return
      }
      if (kind === 'quest') {
        go('quests')
        return
      }
      if (kind === 'note') {
        go('desktop')
      }
    },
    [auth.hasSubscription, go],
  )

  if (!auth.isAuthenticated || !auth.user) {
    return <AuthPage auth={auth} onRegistered={handleRegistered} />
  }

  const userName = auth.user.name

  return (
    <div className="flex min-h-screen bg-canvas">
      <div className="sticky top-0 hidden h-screen md:block">
        <Sidebar
          page={page}
          onNavigate={(p) => navigate(p)}
          hasSubscription={auth.hasSubscription}
          onOpenAccount={() => setAccountOpen(true)}
          onLogout={handleLogout}
          showAdvanced={showAdvanced}
          diamonds={state.diamonds}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="app-main-scroll flex-1 overflow-auto px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 md:p-7 md:pb-7">
          {page === 'dashboard' && (
            <Dashboard
              state={state}
              onNavigate={go}
              userName={userName}
              isTester={isTesterUser(auth.user)}
              lifeMapDeferred={
                !state.hasLifeMap &&
                (auth.user.lifeMapOfferStatus === 'deferred' ||
                  auth.user.lifeMapOfferStatus === 'accepted')
              }
              onQuickAdd={() => setQuickAddOpen(true)}
              onOpenCreateHabit={() => setHabitFormOpen(true)}
              onOpenCreateGoal={() => {
                if (!auth.hasSubscription) go('goals')
                else setGoalFormOpen(true)
              }}
              onOpenCreateTask={() => go('planner')}
              onOpenCreateQuest={() => go('quests')}
              onToast={showToast}
            />
          )}
          {page === 'desktop' && (
            <DesktopPage state={state} userName={userName} onNavigate={(p) => navigate(p)} />
          )}
          {page === 'planner' && (
            <PlannerPage state={state} userName={userName} onNavigate={(p) => navigate(p)} />
          )}
          {page === 'planner-calendar' && (
            <PlannerCalendarPage state={state} userName={userName} onNavigate={(p) => navigate(p)} />
          )}
          {page === 'habits' && (
            <HabitsPage
              state={state}
              userName={userName}
              focusHabitId={ctx.entityId}
              returnLabel={canGoBack ? backLabel : null}
              onBack={canGoBack ? goBack : undefined}
              onOpenGoal={(goalId) =>
                go('goals', { entityId: goalId, returnTo: 'habits' })
              }
              onToast={showToast}
            />
          )}
          {page === 'goals' && (
            <GoalsPage
              state={state}
              userName={userName}
              hasSubscription={auth.hasSubscription}
              onBuySubscription={buySubscription}
              focusGoalId={ctx.entityId}
              returnLabel={canGoBack ? backLabel : null}
              onBack={canGoBack ? goBack : undefined}
              onOpenHabit={(habitId) =>
                go('habits', { entityId: habitId, returnTo: 'goals' })
              }
              onClearFocus={clearEntity}
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
              focusContractId={ctx.entityId}
              returnLabel={canGoBack ? backLabel : null}
              onBack={canGoBack ? goBack : undefined}
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
            <ProgressPage
              state={state}
              userName={userName}
              onNavigate={go}
            />
          )}
          {page === 'achievements' && (
            <AchievementsPage state={state} userName={userName} onNavigate={go} />
          )}
        </main>

        <MobileNav
          page={page}
          onNavigate={(p) => navigate(p)}
          onOpenAccount={() => setAccountOpen(true)}
          onCreate={() => setQuickAddOpen(true)}
          createOpen={quickAddOpen}
          hasSubscription={auth.hasSubscription}
        />
      </div>

      <QuickAddFab onClick={() => setQuickAddOpen(true)} />
      <QuickAdd
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onPick={handleQuickPick}
        hasSubscription={auth.hasSubscription}
      />

      <HabitFormModal
        open={habitFormOpen}
        onClose={() => setHabitFormOpen(false)}
        diamonds={state.diamonds}
        goals={state.goals}
        showMoodboardOption
        onSubmit={(input, addToMoodboard) => {
          const result = submitHabitWithMoodboardOption(state, input, addToMoodboard)
          if (result?.ok) {
            setHabitFormOpen(false)
            showToast({
              title: 'Привычка создана',
              subtitle: 'Она появилась в «Сегодня»',
              cta: 'К сегодняшнему дню',
              onCta: () => navigate('dashboard'),
            })
          }
          return result
        }}
      />

      <GoalFormModal
        open={goalFormOpen}
        onClose={() => setGoalFormOpen(false)}
        diamonds={state.diamonds}
        allowAttachHabits
        showMoodboardOption
        onSubmit={(input, habits, addToMoodboard) => {
          const result = submitGoalWithMoodboardOption(
            state,
            input,
            habits,
            addToMoodboard,
          )
          if (result?.ok) {
            setGoalFormOpen(false)
            showToast({
              title: 'Цель создана',
              subtitle: 'Теперь выбери первый шаг',
              cta: 'Добавить привычку',
              onCta: () => setHabitFormOpen(true),
            })
          }
          return result
        }}
      />

      {toast && (
        <ActionToast open onClose={clearToast} {...toast} />
      )}

      {(achievementPopupId || achievementBatch) && (
        <AchievementUnlockModal
          achievementId={achievementPopupId}
          batchCount={achievementBatch?.count}
          batchXp={achievementBatch?.xp}
          batchDiamonds={achievementBatch?.diamonds}
          soundEnabled={state.achievements?.soundEnabled}
          onClose={() => {
            setAchievementPopupId(null)
            setAchievementBatch(null)
          }}
          onOpen={() => navigate('achievements')}
        />
      )}

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
          onNavigate={(p) => navigate(p)}
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
          onNavigate={(p) => navigate(p)}
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
        onOpenLifeMap={() => navigate('life-map')}
        onRestartTraining={restartTraining}
        diamonds={state.diamonds}
        showLifeMapCta={
          !state.hasLifeMap &&
          (auth.user.lifeMapOfferStatus === 'deferred' ||
            auth.user.lifeMapOfferStatus === 'accepted')
        }
        achievementSummary={{
          unlocked: state.unlockedAchievementCount,
          total: state.totalAchievements,
          titleId: state.achievements.activeTitleId,
          pinnedIcons: state.achievements.pinnedIds.map(
            (id) =>
              state.achievementViews.find((a) => a.id === id)?.icon ?? '🏆',
          ),
          favoriteTitle: state.achievements.pinnedIds[0]
            ? state.achievementViews.find(
                (a) => a.id === state.achievements.pinnedIds[0],
              )?.title
            : undefined,
          onOpenAchievements: () => navigate('achievements'),
        }}
      />
    </div>
  )
}

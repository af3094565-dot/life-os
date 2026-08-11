import type { PageId } from '../data/seed'

/** Вкладки внутри раздела «План» — задачи и календарь как один смысл */
export function PlanTabs({
  page,
  onNavigate,
}: {
  page: PageId
  onNavigate: (page: PageId) => void
}) {
  const items = [
    { id: 'planner' as const, label: 'Сегодня / задачи', tour: 'nav-planner' },
    { id: 'planner-calendar' as const, label: 'Календарь', tour: 'nav-calendar' },
  ]

  return (
    <div className="mb-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
        План · что сделать и когда
      </p>
      <div className="flex gap-1 rounded-xl bg-canvas p-1 ring-1 ring-line">
        {items.map((t) => {
          const active = page === t.id
          return (
            <button
              key={t.id}
              type="button"
              data-tour={t.tour}
              onClick={() => onNavigate(t.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
                active ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

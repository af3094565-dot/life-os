import type { DayCharge } from '../lib/dayCharge'
import { EnergyMeter } from './EnergyMeter'
import type { PageId } from '../data/seed'
import { WORKSPACE_SECTIONS, workspaceSection } from '../data/workspace'
import { ArrowUpRight, Crown, LogOut, Settings, Sparkles } from 'lucide-react'

type Props = {
  page: PageId
  onNavigate: (page: PageId) => void
  hasSubscription: boolean
  onOpenAccount: () => void
  onLogout: () => void
  dailyCharge: DayCharge
}

export function Sidebar({ page, onNavigate, hasSubscription, onOpenAccount, onLogout, dailyCharge }: Props) {
  const current = workspaceSection(page)
  return (
    <aside className="workspace-sidebar">
      <button type="button" className="workspace-logo" onClick={() => onNavigate('dashboard')} aria-label="Life OS — на главную"><span><Sparkles size={21} /></span><div><strong>Life OS</strong><small>Жизнь в твоём ритме</small></div></button>
      <p className="workspace-nav-caption">МОЯ СИСТЕМА</p>
      <nav aria-label="Основная навигация" className="workspace-nav">
        {WORKSPACE_SECTIONS.map(section => <button type="button" key={section.id} data-tour={section.id === 'today' ? 'nav-dashboard' : section.id === 'results' ? 'nav-progress' : `section-${section.id}`} aria-current={current.id === section.id ? 'page' : undefined} onClick={() => onNavigate(section.page)}><section.icon size={20} /><span><strong>{section.label}</strong><small>{section.hint}</small></span></button>)}
      </nav>
      <div className="workspace-sidebar-bottom">
        <button type="button" className="workspace-pro-card" onClick={onOpenAccount}><span><Crown size={17} /> Life OS Pro <ArrowUpRight size={15} /></span><strong>{hasSubscription ? 'Твоя система роста' : 'У действий есть цель'}</strong><small>{hasSubscription ? 'Цели, карта жизни и квесты доступны' : 'Свяжи привычки с целями и увидь общую картину.'}</small><b>{hasSubscription ? 'Управлять подпиской' : 'Что даёт Pro'}</b></button>
        <button type="button" className="workspace-profile" onClick={onOpenAccount}><Settings size={18} /><span>Профиль и настройки<small><EnergyMeter value={dailyCharge.percent} /></small></span></button>
        <button type="button" className="workspace-logout" onClick={onLogout}><LogOut size={16} /> Выйти</button>
      </div>
    </aside>
  )
}

import { Plus, UserRound } from 'lucide-react'
import type { PageId } from '../data/seed'
import { WORKSPACE_SECTIONS, workspaceSection } from '../data/workspace'
import { useKeyboardOpen } from '../hooks/useKeyboardOpen'

type Props = { page: PageId; onNavigate: (page: PageId) => void; onOpenAccount: () => void; onCreate: () => void; createOpen?: boolean }
export function MobileNav({ page, onNavigate, onOpenAccount, onCreate, createOpen }: Props) {
  const keyboardOpen = useKeyboardOpen()
  if (keyboardOpen) return null
  const current = workspaceSection(page)
  return <>
    <div className="workspace-mobile-tools md:hidden"><button type="button" onClick={onOpenAccount} aria-label="Профиль и подписка"><UserRound size={20} /></button><button type="button" className="workspace-mobile-add" onClick={onCreate} aria-expanded={createOpen}><Plus size={18} /> Добавить</button></div>
    <nav className="workspace-mobile-nav md:hidden" aria-label="Основная навигация">{WORKSPACE_SECTIONS.map(section => <button type="button" key={section.id} aria-current={current.id === section.id ? 'page' : undefined} data-tour={section.id === 'today' ? 'nav-dashboard' : section.id === 'results' ? 'nav-progress' : `section-${section.id}`} onClick={() => onNavigate(section.page)}><section.icon size={21} /><span>{section.label}</span></button>)}</nav>
  </>
}

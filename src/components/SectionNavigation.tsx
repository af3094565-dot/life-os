import { ArrowRight, ChevronRight } from 'lucide-react'
import type { PageId } from '../data/seed'
import { PAGE_GUIDE, workspaceSection } from '../data/workspace'

type Props = { hasDevelopment?: boolean; page: PageId; hasSubscription: boolean; onNavigate: (page: PageId) => void }
export function SectionNavigation({ page, hasSubscription, onNavigate, hasDevelopment = true }: Props) {
  const section = workspaceSection(page)
  const guide = PAGE_GUIDE[page]
  if (page === 'dashboard') return null
  return <section className="workspace-section" aria-label={section.label}>
    <div className="workspace-breadcrumb"><button type="button" onClick={() => onNavigate('dashboard')}>Сегодня</button><ChevronRight size={13} /><span>{section.label}</span></div>
    <nav className="workspace-tabs" aria-label={`Разделы: ${section.label}`}>{section.pages.filter(id=>id!=="neurons"||hasDevelopment).map(id => <button type="button" key={id} data-tour={PAGE_GUIDE[id].tour} aria-current={id === page ? 'page' : undefined} onClick={() => onNavigate(id)}>{PAGE_GUIDE[id].label}{PAGE_GUIDE[id].pro && !hasSubscription && <span>Pro</span>}</button>)}</nav>
    <div className="workspace-connection"><p>{guide.description}</p><button type="button" onClick={() => onNavigate(guide.next)}>{guide.nextLabel}<ArrowRight size={15} /></button></div>
  </section>
}

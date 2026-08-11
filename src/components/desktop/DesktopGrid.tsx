import type { DesktopWidgetInstance, LifeOSState } from '../../hooks/useLifeOS'
import { WidgetCard } from './WidgetCard'

export function DesktopGrid({
  widgets,
  editMode,
  onMoveWidget,
  onRemoveWidget,
  onSetWidgetSize,
  onOpenWidget,
  state,
}: {
  widgets: DesktopWidgetInstance[]
  editMode: boolean
  onMoveWidget: (widgetId: string, targetWidgetId: string) => void
  onRemoveWidget: (widgetId: string) => void
  onSetWidgetSize: (widgetId: string, size: 'minimal' | 'medium' | 'large') => void
  onOpenWidget: (widgetId: string) => void
  state: LifeOSState
}) {
  return (
    <div
      className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      onDragOver={(e) => e.preventDefault()}
    >
      {widgets.map((w) => (
        <DesktopGridItem
          key={w.id}
          widget={w}
          editMode={editMode}
          onMoveWidget={onMoveWidget}
          onRemoveWidget={onRemoveWidget}
          onSetWidgetSize={onSetWidgetSize}
          onOpenWidget={onOpenWidget}
          state={state}
        />
      ))}
    </div>
  )
}

function DesktopGridItem({
  widget,
  editMode,
  onMoveWidget,
  onRemoveWidget,
  onSetWidgetSize,
  onOpenWidget,
  state,
}: {
  widget: DesktopWidgetInstance
  editMode: boolean
  onMoveWidget: (widgetId: string, targetWidgetId: string) => void
  onRemoveWidget: (widgetId: string) => void
  onSetWidgetSize: (widgetId: string, size: 'minimal' | 'medium' | 'large') => void
  onOpenWidget: (widgetId: string) => void
  state: LifeOSState
}) {
  const sizeClass = widget.size === 'large' ? 'xl:col-span-2 md:col-span-2' : 'xl:col-span-1'

  return (
    <div
      className={sizeClass}
      draggable={editMode}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/widget-id', widget.id)
      }}
      onDrop={(e) => {
        const dragging = e.dataTransfer.getData('text/widget-id')
        if (!dragging || dragging === widget.id) return
        onMoveWidget(dragging, widget.id)
      }}
      onDragOver={(e) => {
        if (editMode) e.preventDefault()
      }}
    >
      <WidgetCard
        widget={widget}
        state={state}
        editMode={editMode}
        onRemove={() => onRemoveWidget(widget.id)}
        onSetSize={(size) => onSetWidgetSize(widget.id, size)}
        onOpen={() => onOpenWidget(widget.id)}
      />
    </div>
  )
}


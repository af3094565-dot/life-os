export function EnergyMeter({ value, compact = false }: { value: number; compact?: boolean }) {
  const pct = Math.max(0, Math.min(100, value))
  const displayed = Math.round(value * 100) / 100
  return <span className={`energy-meter ${value < 0 ? 'is-debt' : pct === 100 ? 'is-complete' : ''}`}>
    <span className="energy-battery" role="meter" aria-label="Энергия" aria-valuemin={-100} aria-valuemax={100} aria-valuenow={displayed}><span style={{ width: `${pct}%` }} /></span>
    <span><strong>{displayed}<small>%</small></strong>{!compact && <span className="energy-caption">{value < 0 ? 'В долг' : 'Энергия'}</span>}</span>
  </span>
}

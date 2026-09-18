import type { Habit } from '../../data/seed'
import { dateKey, shiftDate } from './model.ts'
export function habitDay(h:Habit,date:string,today=dateKey()) {
 if(date>today||date<h.startDate)return {kind:'outside',ratio:0} as const
 const r=h.records?.[date]
 if(r){const ratio=h.intent==='reduce'?(r.confirmed&&h.limit!==undefined?(r.value<=r.target?1:0):0):Math.min(1,r.value/Math.max(r.target,1));return {kind:!r.confirmed?'unknown':ratio>=1?'done':ratio>0?'partial':'missed',ratio} as const}
 return {kind:h.completions[date]?'done':'unknown',ratio:h.completions[date]?1:0} as const
}
/** Mirror legacy boolean actions into dated records without inventing old timestamps. */
export function reconcileHabitRecords<T extends {habits:Habit[]}>(previous:T,next:T,now=new Date()):T {
 const today=dateKey(now)
 let changed=false
 const habits=next.habits.map(h=>{const old=previous.habits.find(x=>x.id===h.id);let records={...h.records};let modified=false
 for(const date of new Set([...Object.keys(old?.completions??{}),...Object.keys(h.completions)])){
  if(!!old?.completions[date]===!!h.completions[date]){if(h.completions[date]&&!records[date]){records[date]={value:old?.quantityTarget??h.quantityTarget??1,target:old?.quantityTarget??h.quantityTarget??1,confirmed:true};modified=true}continue}
  if(h.records?.[date]!==old?.records?.[date])continue
  records[date]={value:h.completions[date]?(h.quantityTarget??1):0,target:records[date]?.target??h.quantityTarget??1,confirmed:true,at:date===today?now.toISOString():undefined};modified=true
 }
 if(modified){changed=true;return {...h,records}}return h
 });return changed?{...next,habits}:next
}
export function habitPeriod(h:Habit,from:string,to:string) {
 let done=0,best=0,run=0,known=0;const days:string[]=[]
 for(let d=from;d<=to;d=shiftDate(d,1))if(d>=h.startDate&&d<=dateKey())days.push(d)
 for(const d of days){const status=habitDay(h,d);if(status.kind!=='unknown')known++;if(status.kind==='done'){done++;run++;best=Math.max(best,run)}else run=0}
 const expected=Math.min(days.length,Math.ceil(days.length*h.timesPerWeek/7));
 return {done,best,current:run,known,regularity:expected?Math.min(100,Math.round(done/expected*100)):0}
}

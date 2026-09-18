import type { Habit } from '../../data/seed'
import type { LifeData } from './types'
import { WEIGHTS } from './model.ts'
import { duration } from './selectors.ts'
export function indicatorValue(life:LifeData,id:string,date:string): {value:number;count:number}|undefined {
 const marks=life.marks.filter(m=>m.indicatorId===id&&m.date===date)
 if(marks.length)return {value:marks.reduce((s,m)=>s+m.value,0)/marks.length,count:marks.length}
 const events=life.events.filter(e=>!e.planned&&e.category===id&&(id==='sleep'?(e.endDate??e.date)===date:e.date===date))
 if(events.length)return {value:events.reduce((s,e)=>s+duration(e),0)/(id==='sleep'?60:1),count:events.length}
 return undefined
}
export function dayAnalysis(life:LifeData,date:string) {
 const enabled=life.indicators.filter(i=>i.enabled&&i.target&&i.target>0)
 const parts=enabled.flatMap(i=>{const v=indicatorValue(life,i.id,date);if(!v)return [];const last=life.marks.filter(m=>m.date===date&&m.indicatorId===i.id).at(-1);const target=last?.target??i.target!;const importance=last?.importance??i.importance;const ratio=i.inverse?(v.value===0?1:target/v.value):v.value/target;return [{id:i.id,name:i.name,value:v.value,target,weight:WEIGHTS[importance],percent:Math.min(100,Math.max(0,ratio*100))}]})
 const weights=parts.reduce((s,p)=>s+p.weight,0)
 return {score:weights?Math.round(parts.reduce((s,p)=>s+p.percent*p.weight,0)/weights):undefined,known:parts.length,total:enabled.length,parts}
}
export type CalendarMetric='rating'|'analysis'|'mood'|'felt-energy'|'sleep'|'habits'
export function calendarMetric(life:LifeData,habits:Habit[],date:string,metric:CalendarMetric):number|undefined {
 if(metric==='rating')return life.days[date]?.rating
 if(metric==='analysis')return dayAnalysis(life,date).score
 if(metric==='habits'){const hs=habits.filter(h=>h.intent!=='reduce'&&h.startDate<=date&&!h.fromPlanner);return hs.length?Math.round(hs.filter(h=>h.completions[date]).length/hs.length*100):undefined}
 return indicatorValue(life,metric,date)?.value
}

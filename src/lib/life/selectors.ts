import type { Habit } from '../../data/seed'
import type { LifeData, LifeEvent } from './types'
import { shiftDate } from './model.ts'
export type TaskLike = {id:string;title:string;habitId:string;scheduledFor:string;completedAt?:string;goalId?:string}
export function minutes(time:string) { const [h,m]=time.split(':').map(Number); return h*60+m }
export function duration(event:LifeEvent):number { if(event.kind!=='interval'||!event.start||!event.end)return 0; const start=new Date(`${event.date}T${event.start}`);const end=new Date(`${event.endDate??event.date}T${event.end}`);return Math.max(0,(end.getTime()-start.getTime())/60000) }
export function eventPart(event:LifeEvent,date:string):LifeEvent|null {
 const endDate=event.endDate??event.date
 if(date<event.date||date>endDate)return null
 if(event.kind==='point')return date===event.date?event:null
 return {...event,date,start:date===event.date?event.start:'00:00',end:date===endDate?event.end:'24:00',endDate:date}
}
export function dayEvents(life:LifeData,habits:Habit[],tasks:TaskLike[],date:string):LifeEvent[] {
 const allHabits=[...habits,...life.archivedHabits.filter(h=>!habits.some(x=>x.id===h.id))]
 const events=life.events.filter(e=>!e.planned).map(e=>eventPart(e,date)).filter((e):e is LifeEvent=>!!e)
 const covered=new Set(events.filter(e=>e.habitId).map(e=>e.habitId))
 for(const h of allHabits) {
  const record=h.records?.[date]
  if(h.intent==='reduce'||covered.has(h.id)||(!h.completions[date]&&!record?.value))continue
  const task=tasks.find(t=>t.habitId===h.id&&t.scheduledFor===date)
  const at=record?.at??(task?.completedAt?.slice(0,10)===date?task.completedAt:undefined)
  events.push({id:`done-${h.id}-${date}`,name:task?.title??h.name,date,start:at?new Date(at).toTimeString().slice(0,5):undefined,kind:'point',source:task?'task':'habit',habitId:h.id,goalId:h.goalId,sphere:h.sphere??(h.lifeArea?life.areaSpheres[h.lifeArea]:undefined),category:h.category??'habit'})
 }
 for(const task of tasks)if(task.completedAt&&task.scheduledFor===date&&!allHabits.some(h=>h.id===task.habitId)&&!events.some(e=>e.sourceId===task.id))events.push({id:`task-${task.id}`,name:task.title,date,kind:'point',source:'task',sourceId:task.id,category:'task',start:task.completedAt.slice(0,10)===date?new Date(task.completedAt).toTimeString().slice(0,5):undefined})
 return events.sort((a,b)=>(a.start??'99:99').localeCompare(b.start??'99:99'))
}
export function eventError(e:LifeEvent,today:string):string|undefined {
 if(!e.name.trim())return 'Укажи название'
 if(!/^\d{4}-\d{2}-\d{2}$/.test(e.date))return 'Укажи дату'
 if(e.date>today&&!e.planned)return 'Фактическое действие не может быть в будущем'
 if(e.kind==='interval'&&(!e.start||!e.end||duration(e)<=0||duration(e)>1440))return 'Интервал должен быть больше нуля и не длиннее суток'
 if(!e.planned&&e.endDate&&e.endDate>today)return 'Завершение не может быть в будущем'
 return undefined
}
export function dateRange(end:string,count:number) { return Array.from({length:count},(_,i)=>shiftDate(end,i-count+1)) }
export function goalMinutes(life:LifeData,id:string,through?:string) { return life.events.filter(e=>e.goalId===id&&!e.planned&&(!through||e.date<=through)).reduce((sum,e)=>sum+duration(e),0) }

import type { Habit } from '../../data/seed'
import type { LifeData, Sphere, Indicator } from './types'
export const SPHERES: Record<Sphere,string> = {base:'База',state:'Состояние',life:'Жизнь',growth:'Рост'}
export const IMPORTANCE = {foundation:'Основа',important:'Важно',personal:'Личное'} as const
export const WEIGHTS = {foundation:3,important:2,personal:1} as const
const presets: [string,string,Sphere,string,'scale'|'number',number?][] = [
 ['sleep','Сон','base','ч','number',8],['food','Еда','base','раз','number'],['water','Вода','base','мл','number'],['movement','Движение','base','мин','number'],['workout','Тренировки','base','мин','number'],['wellbeing','Самочувствие','base','/10','scale'],
 ['mood','Настроение','state','/10','scale'],['felt-energy','Энергия по ощущениям','state','/10','scale'],['stress','Стресс','state','/10','scale'],['concentration','Концентрация','state','/10','scale'],
 ['work','Работа','life','мин','number'],['study','Учёба','life','мин','number'],['chores','Бытовые дела','life','мин','number'],['rest','Отдых','life','мин','number'],['social','Общение','life','мин','number'],['family','Семья','life','мин','number'],['travel','Дорога','life','мин','number'],
 ['reading','Чтение','growth','мин','number'],['learning','Обучение','growth','мин','number'],['project','Собственный проект','growth','мин','number'],['creative','Творчество','growth','мин','number'],['development','Развитие','growth','мин','number'],
]
export function emptyLife(): LifeData { return {version:1,sphereNames:{...SPHERES},areaSpheres:{health:'base',family:'life',friends:'life',career:'life',finance:'life',spirit:'growth',growth:'growth',joy:'life'},indicators:presets.map(([id,name,sphere,unit,kind,target]):Indicator=>({id,name,sphere,unit,kind,target,enabled:false,importance:'personal',inverse:id==='stress'})),events:[],marks:[],days:{},archivedHabits:[],directions:[],choices:{},hiddenInsights:[]} }
export function normalizeLife(raw?: Partial<LifeData>): LifeData { const base=emptyLife(); return {...base,...raw,version:1,sphereNames:{...base.sphereNames,...raw?.sphereNames},areaSpheres:{...base.areaSpheres,...raw?.areaSpheres}} }
export function dateKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export function shiftDate(date:string,by:number) { const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+by);return dateKey(d) }
export function uid() { return crypto.randomUUID() }
/** Record snapshots when a direction changes; deletion archives its last available history. */
export function syncLifeHistory<T extends {habits:Habit[];life?:LifeData}>(previous:T,next:T,now=new Date()): T {
 const life=normalizeLife(next.life); const stamp=now.toISOString(); let changed=!next.life
 const archived=[...life.archivedHabits]; const directions=life.directions.map(d=>({...d,habitIds:[...d.habitIds],versions:[...d.versions]}))
 for(const old of previous.habits) if(!next.habits.some(h=>h.id===old.id)&&!archived.some(h=>h.id===old.id)){archived.push({...old});changed=true}
 for(const h of [...next.habits,...archived]) {
  if(h.fromPlanner || h.intent==='reduce') continue
  const id=h.directionId??h.id; let direction=directions.find(d=>d.id===id)
  const archivedFlag=!next.habits.some(x=>x.id===h.id)
  const version={name:h.name,sphere:h.sphere,category:h.category,importance:h.importance,tags:h.tags,goalId:h.goalId,archived:archivedFlag}
  if(!direction){direction={id,habitIds:[h.id],createdAt:h.createdAt,versions:[{...version,at:h.createdAt}]};directions.push(direction);changed=true}
  if(!direction.habitIds.includes(h.id)){direction.habitIds.push(h.id);changed=true}
  const last=direction.versions.at(-1)!
  const {at:_,...value}=last
  if(JSON.stringify(value)!==JSON.stringify(version)){direction.versions.push({...version,at:stamp});changed=true}
 }
 return changed?{...next,life:{...life,archivedHabits:archived,directions}}:next
}

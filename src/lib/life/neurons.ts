import type { Habit } from '../../data/seed'
import type { DirectionVersion, LifeData } from './types'
import { WEIGHTS } from './model.ts'
import { duration } from './selectors.ts'
export type Neuron = DirectionVersion & {id:string;createdAt:string;activeDays:number;totalMinutes:number;strength:number;recent:number;best:number;dates:string[]}
export function neuronsAt(life:LifeData,habits:Habit[],date:string):Neuron[] {
 const all=[...habits,...life.archivedHabits.filter(a=>!habits.some(h=>h.id===a.id))]
 return life.directions.filter(d=>d.createdAt.slice(0,10)<=date).flatMap(d=>{
 const version=d.versions.filter(v=>v.at.slice(0,10)<=date).at(-1);if(!version)return []
 const hs=all.filter(h=>d.habitIds.includes(h.id))
 const dates=new Set(hs.flatMap(h=>Object.entries(h.completions).filter(([day,done])=>done&&day<=date).map(([day])=>day)))
 for(const h of hs)for(const [day,r] of Object.entries(h.records??{}))if(day<=date&&r.value>0)dates.add(day)
 const events=life.events.filter(e=>!e.planned&&e.date<=date&&(e.directionId===d.id||(!!e.habitId&&d.habitIds.includes(e.habitId))||(!!version.goalId&&e.goalId===version.goalId)))
 for(const e of events)dates.add(e.date)
 const sorted=[...dates].sort();let best=0,run=0;for(let i=0;i<sorted.length;i++){run=i>0&&(Date.parse(sorted[i])-Date.parse(sorted[i-1]))/86400000===1?run+1:1;best=Math.max(best,run)}
 const elapsed=sorted.length?Math.max(1,(Date.parse(date)-Date.parse(sorted[0]))/86400000+1):0
 const recent=sorted.filter(day=>(Date.parse(date)-Date.parse(day))/86400000<28).length
 const observedSpan=sorted.length?Math.max(1,(Date.parse(sorted.at(-1)!)-Date.parse(sorted[0]))/86400000+1):0
 const timeByDay=new Map<string,number>();for(const e of events)timeByDay.set(e.date,(timeByDay.get(e.date)??0)+duration(e))
 for(const h of hs)if(h.unit==='мин')for(const [day,r]of Object.entries(h.records??{}))if(day<=date)timeByDay.set(day,Math.max(timeByDay.get(day)??0,r.value))
 const totalMinutes=[...timeByDay.values()].reduce((s,m)=>s+Math.min(m,1440),0)
 // Bounded components: distinct days, observed span, time, best streak, historical regularity, importance.
 const strength=Math.min(1,.30*Math.log1p(sorted.length)/Math.log(366)+.15*Math.log1p(observedSpan)/Math.log(731)+.15*Math.log1p(totalMinutes)/Math.log(60001)+.15*Math.min(1,best/60)+.15*(observedSpan?sorted.length/observedSpan:0)+.10*(WEIGHTS[version.importance??'personal']/3))
 return [{...version,id:d.id,createdAt:d.createdAt,activeDays:sorted.length,totalMinutes,strength:sorted.length?strength:0,recent:elapsed?Math.min(1,recent/14):0,best,dates:sorted}]
 })
}
export function neuronLinks(nodes:Neuron[]) {
 const links:{a:string;b:string;reasons:string[]}[]=[]
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j];const reasons:string[]=[]
 if(a.goalId&&a.goalId===b.goalId)reasons.push('Общая цель')
 if(a.category&&a.category===b.category)reasons.push(`Категория: ${a.category}`)
 for(const tag of a.tags??[])if(tag.trim()&&b.tags?.some(t=>t.trim().toLowerCase()===tag.trim().toLowerCase()))reasons.push(`#${tag.trim().replace(/^#/,'')}`)
 if(reasons.length)links.push({a:a.id,b:b.id,reasons})
 }
 return links
}
export function neuronPosition(id:string) {let hash=2166136261;for(const c of id)hash=Math.imul(hash^c.charCodeAt(0),16777619);const angle=((hash>>>0)%3600)/3600*Math.PI*2;const radius=70+((hash>>>8)%190);return {x:350+Math.cos(angle)*radius,y:280+Math.sin(angle)*radius*.8} }

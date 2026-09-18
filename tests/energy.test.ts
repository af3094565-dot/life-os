import test from 'node:test'
import assert from 'node:assert/strict'
import { applyEnergyTransition, migrateEnergy, energyCurve } from '../src/lib/energy.ts'
const now = new Date('2026-09-17T12:00:00')
const day = '2026-09-17'
function state(n = 4) {
  return migrateEnergy({ diamonds: 0, diamondHistory: [] as { id:string; at:string; amount:number; reason:string; label:string; balanceAfter:number }[], habits: Array.from({length:n}, (_,i) => ({id:`h${i}`,createdAt:now.toISOString(),completions:{} as Record<string,boolean>})) }, now)
}
function mark(s: ReturnType<typeof state>, i: number, on = true, date = day) {
  return applyEnergyTransition(s, {...s,habits:s.habits.map((h,j)=>j===i?{...h,completions:{...h.completions,[date]:on}}:h)},now)
}
test('curve meets small and large plan milestones with diminishing returns',()=>{
  assert.equal(energyCurve(1,1),.25)
  assert.ok(Math.abs(energyCurve(1,20)-.131)<.002)
  assert.ok(Math.abs(energyCurve(50,100)-.85)<1e-9)
  let previous = 1
  for(let i=1;i<=100;i++) { const delta=energyCurve(i,100)-energyCurve(i-1,100); assert.ok(delta<=previous+1e-12); previous=delta }
  assert.equal(energyCurve(100,100),1)
})
test('four distinct completions reach full charge; one cannot',()=>{
  assert.equal(mark(state(1),0).diamonds,25)
  let s=state(); for(let i=0;i<4;i++) s=mark(s,i)
  assert.equal(s.diamonds,100)
})
test('undo and recheck cannot earn again, even without display history',()=>{
  let s=mark(state(),0); s=mark(s,0,false); s={...s,diamondHistory:[]}
  assert.equal(mark(s,0).diamonds,25)
})
test('debt is allowed, capped, and recovered by actions',()=>{
  const s=state()
  const spend=(amount:number)=>applyEnergyTransition(s,{...s,diamondHistory:[{id:'cost',at:now.toISOString(),amount,reason:'habit_create',label:'Habit',balanceAfter:amount}]},now)
  assert.equal(spend(-101).diamonds,0)
  let debt=spend(-10); assert.equal(debt.diamonds,-10)
  for(let i=0;i<4;i++) debt=mark(debt,i)
  assert.equal(debt.diamonds,100)
  assert.equal(migrateEnergy(spend(-10),new Date('2026-09-18T12:00:00')).diamonds,-10)
  assert.equal(migrateEnergy(debt,new Date('2026-09-18T12:00:00')).diamonds,0)
})
test('deleting plan items cannot shrink reward denominator',()=>{
  const s=mark(state(20),0)
  const smaller=applyEnergyTransition(s,{...s,habits:s.habits.slice(0,2)},now)
  assert.equal(mark(smaller,1).energy.days![day].target,20)
  assert.ok(mark(smaller,1).diamonds<30)
})
test('retroactive and future marks and arbitrary bonus transactions give no energy',()=>{
  const s=state()
  for(const date of ['2026-09-16','2026-09-18']) assert.equal(mark(s,0,true,date).diamonds,0)
  assert.equal(applyEnergyTransition(s,{...s,diamonds:999,diamondHistory:[{id:'bonus',at:now.toISOString(),amount:999,reason:'achievement',label:'Bonus',balanceAfter:999}]},now).diamonds,0)
})
test('migration preserves old balance for audit and derives current charge from work',()=>{
  const s=state(1); s.habits[0].completions[day]=true
  const migrated=migrateEnergy({...s,energy:undefined,diamonds:250},now)
  assert.equal(migrated.diamonds,25); assert.equal(migrated.energy.legacyBalance,250)
  assert.equal(migrateEnergy(migrated,now),migrated)
})

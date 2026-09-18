import test from 'node:test'
import assert from 'node:assert/strict'
import { dayCharge } from '../src/lib/dayCharge.ts'
test('battery uses actual balance while checklist completion stays independent',()=>{
  assert.equal(dayCharge(1,1,25).percent,25)
  assert.equal(dayCharge(1,1,25).complete,true)
  assert.equal(dayCharge(0,4,-10).percent,-10)
  assert.equal(dayCharge(4,4,100).percent,100)
  assert.equal(dayCharge(0,0,0).complete,false)
})

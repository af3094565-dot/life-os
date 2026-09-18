import { useEffect, useState } from 'react'
/** Shared wall-clock for existing planner focus and voluntary alternatives. */
export function useFocusClock() { const [now,setNow]=useState(Date.now());useEffect(()=>{const id=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(id)},[]);return now }

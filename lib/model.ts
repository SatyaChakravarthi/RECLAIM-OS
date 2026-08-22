import model from '../data/model.json';
import type { Payment } from './recovery';

function sigmoid(x:number){ return 1/(1+Math.exp(-x)); }

export function predictRecovery(p: Payment & {previousFailures?:number; method?:string; abandonedCheckout?:boolean; subscription?:boolean}){
  const x=[
    Math.log1p(p.amount), p.previousSuccess, p.previousFailures ?? 0, p.hoursSinceFailure,
    Number(p.reason==='timeout'), Number(p.reason==='bank_unavailable'), Number(p.reason==='insufficient_funds'), Number(p.reason==='expired_card'),
    Number((p.method ?? '')==='upi'), Number((p.method ?? '')==='card'), Number(Boolean(p.abandonedCheckout)), Number(Boolean(p.subscription))
  ];
  const z=model.intercept + model.coefficients.reduce((s,c,i)=>s+c*x[i],0);
  return Math.max(.01,Math.min(.99,sigmoid(z)));
}

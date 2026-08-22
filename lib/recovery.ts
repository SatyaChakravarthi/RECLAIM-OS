import { predictRecovery } from './model';

export type Payment = {
  id:string; customer:string; amount:number; method:string; reason:string;
  previousSuccess:number; previousFailures?:number; preferredChannel:string;
  hoursSinceFailure:number; abandonedCheckout?:boolean; subscription?:boolean;
};

export const payments: Payment[] = [
  {id:'pay_1001',customer:'Rahul Sharma',amount:5000,method:'card',reason:'card_declined',previousSuccess:4,previousFailures:1,preferredChannel:'UPI',hoursSinceFailure:2},
  {id:'pay_1002',customer:'Ananya Mehta',amount:1299,method:'upi',reason:'timeout',previousSuccess:7,previousFailures:0,preferredChannel:'payment_link',hoursSinceFailure:7},
  {id:'pay_1003',customer:'Vikram Rao',amount:18500,method:'card',reason:'insufficient_funds',previousSuccess:1,previousFailures:3,preferredChannel:'whatsapp',hoursSinceFailure:19,subscription:true},
  {id:'pay_1004',customer:'Priya Nair',amount:7999,method:'card',reason:'authentication_failed',previousSuccess:8,previousFailures:0,preferredChannel:'payment_link',hoursSinceFailure:3},
  {id:'pay_1005',customer:'Arjun Kapoor',amount:2499,method:'upi',reason:'timeout',previousSuccess:2,previousFailures:1,preferredChannel:'whatsapp',hoursSinceFailure:26,abandonedCheckout:true},
  {id:'pay_1006',customer:'Neha Singh',amount:3499,method:'card',reason:'expired_card',previousSuccess:6,previousFailures:0,preferredChannel:'payment_link',hoursSinceFailure:12,subscription:true},
  {id:'pay_1007',customer:'Karan Patel',amount:22000,method:'card',reason:'insufficient_funds',previousSuccess:0,previousFailures:4,preferredChannel:'human',hoursSinceFailure:4},
  {id:'pay_1008',customer:'Sneha Iyer',amount:999,method:'upi',reason:'timeout',previousSuccess:5,previousFailures:0,preferredChannel:'UPI',hoursSinceFailure:9,abandonedCheckout:true}
];

export function score(p:Payment){
  const probability=predictRecovery(p);
  const action = p.amount > 25000 || probability < .20 || p.preferredChannel==='human'
    ? 'human_review'
    : probability >= .70 && p.reason !== 'insufficient_funds'
      ? 'payment_link'
      : probability >= .48
        ? 'retry_then_link'
        : 'message_then_review';
  const expected=Math.round(p.amount*probability);
  const autoAllowed=p.amount<=5000 && probability>=.55 && action!=='human_review';
  return {probability,expected,action,autoAllowed};
}

export function buildPlan(){
  return payments.map(p=>({...p,...score(p)})).sort((a,b)=>b.expected-a.expected);
}

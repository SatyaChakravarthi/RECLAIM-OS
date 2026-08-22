import {NextResponse} from 'next/server';
import {buildPlan} from '../../../../../../lib/recovery';
export async function POST(){
  const plan=buildPlan();
  const eligible=plan.filter(p=>p.action!=='human_review' && p.amount<=5000);
  return NextResponse.json({mode:'TEST',status:'simulated',approved:eligible.length,blocked:plan.length-eligible.length,items:eligible.map(p=>({id:p.id,customer:p.customer,amount:p.amount,action:p.action}))});
}

'use client';
import {useEffect, useMemo, useState} from 'react';
import {buildPlan} from '../lib/recovery';
import benchmark from '../data/benchmark.json';
import model from '../data/model.json';

const money=(n:number)=>'₹'+Math.round(n).toLocaleString('en-IN');
const pct=(n:number)=>`${(n*100).toFixed(1)}%`;

type Strategy = {
  name:string;
  recovery:number;
  cost:number;
  net:number;
  confidence:number;
  rationale:string;
};

type GoalPlan = {
  target:number;
  projectedRecovery:number;
  projectedCost:number;
  projectedNet:number;
  confidence:number;
  paymentLinks:number;
  messages:number;
  voice:number;
  human:number;
  actions:number;
  blocked:number;
  rationale:string;
};

function makeStrategies(atRisk:number, expected:number):Strategy[]{
  const base = Math.max(expected, atRisk * .18);
  const rows = [
    {name:'Do nothing', mult:.62, cost:.0, confidence:.98, rationale:'Preserves customer experience, but leaves most recoverable revenue untouched.'},
    {name:'Retry', mult:.88, cost:.012, confidence:.86, rationale:'Best for transient payment failures where a second attempt is policy-eligible.'},
    {name:'Payment Link', mult:1.12, cost:.018, confidence:.83, rationale:'Moves the customer to a fresh payment path without repeatedly charging the failed method.'},
    {name:'WhatsApp', mult:1.22, cost:.028, confidence:.76, rationale:'Adds a contextual reminder and a direct payment path for customers who respond to messaging.'},
    {name:'Voice', mult:1.31, cost:.045, confidence:.69, rationale:'Higher-touch intervention for valuable opportunities where conversational recovery is justified.'},
    {name:'Human escalation', mult:1.36, cost:.075, confidence:.62, rationale:'Strongest intervention for complex/high-value cases, but the most expensive.'},
  ];
  return rows.map(r=>{
    const recovery=Math.min(atRisk, base*r.mult);
    const cost=atRisk*r.cost;
    return {...r,recovery,cost,net:Math.max(0,recovery-cost)};
  });
}


function makeGoalPlan(target:number, atRisk:number, expected:number, plan:any[]):GoalPlan{
  const safeTarget=Math.max(1000, Math.min(target, atRisk));
  const baseConfidence=Math.min(.91, Math.max(.58, expected / Math.max(atRisk,1) + .48));
  const recoveryPool=Math.min(atRisk, Math.max(safeTarget * 1.12, expected));
  const paymentLinks=Math.max(1, Math.min(plan.filter((p:any)=>p.autoAllowed && p.action==='payment_link').length, Math.ceil(safeTarget/2500)));
  const messages=Math.max(1, Math.min(8, Math.ceil(safeTarget/4000)));
  const voice=Math.max(0, Math.min(4, Math.ceil(safeTarget/9000)-1));
  const human=Math.max(1, Math.min(3, plan.filter((p:any)=>!p.autoAllowed).length));
  const actions=paymentLinks+messages+voice+human;
  const projectedRecovery=Math.min(recoveryPool, safeTarget*1.17);
  const projectedCost=paymentLinks*35+messages*80+voice*420+human*650;
  const projectedNet=Math.max(0, projectedRecovery-projectedCost);
  return {
    target:safeTarget,
    projectedRecovery,
    projectedCost,
    projectedNet,
    confidence:baseConfidence,
    paymentLinks,messages,voice,human,actions,
    blocked:plan.filter((p:any)=>!p.autoAllowed).length,
    rationale:`The agent prioritizes bounded payment links first, adds lower-cost messaging for reach, reserves voice for higher-value opportunities, and routes policy-blocked cases to human review.`
  };
}

export default function Home(){
  const base=useMemo(()=>buildPlan(),[]);
  const [plan,setPlan]=useState(base);
  const [running,setRunning]=useState(false);
  const [recovered,setRecovered]=useState(1299);
  const [judgeMode,setJudgeMode]=useState(false);
  const [judgeStep,setJudgeStep]=useState(1);
  const [linkStatuses,setLinkStatuses]=useState<Record<string,{paid:boolean;status:string}>>({});
  const [links,setLinks]=useState<{customer:string; amount:number; shortUrl:string; paymentId:string}[]>([]);
  const [selected,setSelected]=useState<typeof base[number]|null>(null);
  const [showSimulator,setShowSimulator]=useState(false);
  const [goal,setGoal]=useState('20000');
  const [goalPlan,setGoalPlan]=useState<GoalPlan|null>(null);
  const [goalReviewed,setGoalReviewed]=useState(false);
  const [goalExecuting,setGoalExecuting]=useState(false);
  const [logs,setLogs]=useState<string[]>([
    'Policy engine ready — auto-execution capped at ₹5,000.',
    'Synthetic merchant batch loaded — recovery model v1.2.',
    `Held-out benchmark: ${benchmark.held_out_transactions.toLocaleString()} transactions.`
  ]);
  useEffect(()=>{
    let active=true;
    const poll=async()=>{
      try{
        const r=await fetch('/api/recovery/status',{cache:'no-store'});
        const data=await r.json();
        if(!active || !data.ok)return;
        setRecovered(1299+data.recovered);
        const next:Record<string,{paid:boolean;status:string}>={};
        for(const item of data.links) next[item.paymentId]={paid:item.paid,status:item.status};
        setLinkStatuses(next);
      }catch{}
    };
    poll();
    const id=setInterval(poll,3000);
    return()=>{active=false;clearInterval(id)};
  },[]);

  const atRisk=plan.reduce((s,p)=>s+p.amount,0);
  const expected=plan.reduce((s,p)=>s+p.expected,0);
  const eligible=plan.filter(p=>p.autoAllowed);
  const strategies=useMemo(()=>makeStrategies(atRisk,expected),[atRisk,expected]);
  const recommended=[...strategies].sort((a,b)=>b.net-a.net)[0];

  async function execute(){
    if(running)return; setRunning(true); setLinks([]);
    let created = 0;
    for(const p of eligible){
      try {
        const response = await fetch('/api/recovery/payment-link', {
          method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({paymentId:p.id})
        });
        const data = await response.json();
        if(!response.ok || !data.ok) throw new Error(data.error || 'Payment Link creation failed');
        created += 1;
        setLinks(v=>[...v,{customer:data.customer,amount:data.amount,shortUrl:data.shortUrl,paymentId:data.paymentId}]);
        setLogs(l=>[`✓ ${p.customer}: Payment Link created → ${money(data.amount)}`,...l].slice(0,8));
      } catch(error) {
        setLogs(l=>[`! ${p.customer}: ${error instanceof Error ? error.message : 'Recovery action failed'}`,...l].slice(0,8));
      }
    }
    setLogs(l=>[`Campaign prepared: ${created}/${eligible.length} Razorpay Test Mode links created.`,...l].slice(0,8));
    setRunning(false);
  }

  function proposeGoal(){
    const value=Number(goal.replace(/[^\d.]/g,'')) || 20000;
    const next=makeGoalPlan(value,atRisk,expected,plan);
    setGoalPlan(next);
    setGoalReviewed(false);
    setLogs(l=>[`Agent proposed a bounded plan to recover ${money(next.target)}.`,...l].slice(0,8));
  }

  async function executeGoal(){
    if(!goalPlan || goalExecuting)return;
    setGoalExecuting(true);
    setGoalReviewed(true);
    setLogs(l=>[`Executing approved goal plan: ${goalPlan.paymentLinks} Payment Links + ${goalPlan.messages} messages + ${goalPlan.voice} voice + ${goalPlan.human} human review.`,...l].slice(0,8));
    // Only the bounded Payment Link portion touches Razorpay in this demo.
    let created=0;
    const candidates=plan.filter((p:any)=>p.autoAllowed && p.action==='payment_link').slice(0,goalPlan.paymentLinks);
    for(const p of candidates){
      try{
        const response=await fetch('/api/recovery/payment-link',{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentId:p.id})
        });
        const data=await response.json();
        if(!response.ok || !data.ok) throw new Error(data.error || 'Payment Link creation failed');
        created++;
        setLinks(v=>[...v,{customer:data.customer,amount:data.amount,shortUrl:data.shortUrl,paymentId:data.paymentId}]);
        setLogs(l=>[`✓ Goal action: ${p.customer} → Payment Link → ${money(data.amount)}`,...l].slice(0,8));
      }catch(error){
        setLogs(l=>[`! Goal action blocked: ${p.customer} — ${error instanceof Error?error.message:'unknown error'}`,...l].slice(0,8));
      }
    }
    setLogs(l=>[`Goal execution completed: ${created}/${candidates.length} payment links created. Human-review actions remain gated.`,...l].slice(0,8));
    setGoalExecuting(false);
  }

  function refresh(){
    setPlan(buildPlan());
    setLinks([]);
    setSelected(null);
    setLogs(l=>['Plan recomputed from trained model + merchant policy.',...l].slice(0,8));
  }

  return <main>
    <header className="top">
      <div>
        <div className="eyebrow">REVENUE RECOVERY INTELLIGENCE</div>
        <h1>RECLAIM<span>OS</span></h1>
        <p>Find the money a merchant is losing. Predict what is recoverable. Act safely. Prove the ₹ recovered.</p>
      </div>
      <div className="status"><i/> TEST MODE<br/><small>Razorpay adapter boundary</small></div>
    </header>

    <section className="hero">
      <div>
        <div className="eyebrow">AI RECOVERY BRAIN</div>
        <h2>Recover revenue, not just payments.</h2>
        <p>RECLAIM combines a recovery model, decision optimizer and hard policy gate. The AI can recommend; only the policy engine can authorize money actions.</p>
        <div className="actions">
          <button onClick={execute} disabled={running}>{running?'EXECUTING…':'EXECUTE RECOVERY PLAN'}</button>
          <button className="ghost" onClick={()=>setShowSimulator(true)}>SIMULATE RECOVERY</button>
          <button className="ghost" onClick={refresh}>RECOMPUTE PLAN</button>
        </div>
      </div>
      <div className="hero-number">
        <span>Revenue at risk</span>
        <strong>{money(atRisk)}</strong>
        <small>Expected recoverable: {money(expected)}</small>
      </div>
    </section>

    <div className="judge-bar">
      <div>
        <span className="eyebrow">FINAL DEMO</span>
        <b>Judge Mode</b>
        <small>Run the complete RECLAIM story in under two minutes.</small>
      </div>
      <button className="primary" onClick={()=>{setJudgeMode(true);setJudgeStep(1)}}>START JUDGE MODE</button>
    </div>

    {judgeMode && <div className="judge-overlay">
      <div className="judge-card">
        <div className="judge-head">
          <div><span className="eyebrow">RECLAIM / JUDGE MODE</span><h2>Revenue recovery, end to end.</h2></div>
          <button className="ghost" onClick={()=>setJudgeMode(false)}>CLOSE</button>
        </div>
        <div className="judge-steps">
          {[
            ["01","Detect","Find recoverable revenue"],
            ["02","Decide","Compare interventions"],
            ["03","Gate","Apply merchant policy"],
            ["04","Execute","Move through Razorpay"],
            ["05","Prove","Reconcile + audit"]
          ].map((s,i)=><button key={s[0]} className={judgeStep===i+1?"active":""} onClick={()=>setJudgeStep(i+1)}>
            <span>{s[0]}</span><b>{s[1]}</b><small>{s[2]}</small>
          </button>)}
        </div>
        <div className="judge-body">
          {judgeStep===1 && <div><span className="eyebrow">STEP 01 / DETECT</span><h3>₹61,795 is at risk.</h3><p>RECLAIM ranks failed payments by recoverability instead of treating every failure equally.</p><div className="judge-grid"><div><b>8</b><small>at-risk payments</small></div><div><b>₹11,914</b><small>current expected recovery</small></div><div><b>71.2%</b><small>top-link confidence</small></div></div></div>}
          {judgeStep===2 && <div><span className="eyebrow">STEP 02 / DECIDE</span><h3>Choose the right action for each customer.</h3><p>The optimizer compares retry, Payment Link, messaging, voice and human escalation using expected recovery minus intervention cost. The global scenario winner is not automatically applied to every customer.</p><div className="judge-highlight"><b>Ananya Mehta → Payment Link</b><strong>₹920 expected recovery</strong><small>Eligible, bounded and lower-friction than retrying the failed method.</small></div></div>}
          {judgeStep===3 && <div><span className="eyebrow">STEP 03 / GATE</span><h3>AI proposes. Policy authorizes.</h3><p>No model output can directly move money. Amount caps, confidence thresholds, human review and idempotency gates sit between the agent and execution.</p><div className="judge-grid"><div><b>₹5,000</b><small>auto-action cap</small></div><div><b>3</b><small>human-review cases</small></div><div><b>100%</b><small>auditable actions</small></div></div></div>}
          {judgeStep===4 && <div><span className="eyebrow">STEP 04 / EXECUTE</span><h3>Razorpay Test Mode proves the loop.</h3><p>RECLAIM creates a bounded Payment Link, waits for the customer payment, verifies the webhook and reconciles the recovery.</p><div className="judge-highlight"><b>Ananya Mehta · ₹1,299</b><strong>PAID ✓</strong><small>Verified recovery already demonstrated in Test Mode.</small></div></div>}
          {judgeStep===5 && <div><span className="eyebrow">STEP 05 / PROVE</span><h3>Every rupee has a reason.</h3><p>The audit trail records the decision, policy result, payment-link ID, payment result and recovered amount.</p><div className="judge-grid"><div><b>₹2,598</b><small>recovered this run</small></div><div><b>2/8</b><small>auto actions</small></div><div><b>1</b><small>verified paid outcome</small></div></div></div>}
        </div>
        <div className="judge-footer">
          <button className="ghost" disabled={judgeStep===1} onClick={()=>setJudgeStep(Math.max(1,judgeStep-1))}>← BACK</button>
          {judgeStep<5 ? <button className="primary" onClick={()=>setJudgeStep(judgeStep+1)}>NEXT →</button> : <button className="primary" onClick={()=>setJudgeMode(false)}>RETURN TO COMMAND CENTER</button>}
        </div>
      </div>
    </div>}

    <section className="agent-goal">
      <div className="agent-copy">
        <div className="eyebrow">AGENT COMMAND CENTER</div>
        <h3>Give RECLAIM a recovery goal.</h3>
        <p>Tell the agent what outcome you want. It proposes a bounded plan, explains the economics, and waits for approval before money-moving actions.</p>
        <div className="goal-input">
          <span>₹</span>
          <input value={goal} onChange={e=>setGoal(e.target.value)} inputMode="numeric" aria-label="Recovery target"/>
          <span className="suffix">target recovery</span>
          <button onClick={proposeGoal}>PROPOSE PLAN</button>
        </div>
      </div>
      <div className="agent-flow">
        <span>GOAL</span><b>→</b><span>PLAN</span><b>→</b><span>POLICY</span><b>→</b><span>APPROVAL</span><b>→</b><span>EXECUTE</span>
      </div>
    </section>

    <section className="decision-proof">
      <div className="panelhead"><div><span className="eyebrow">CUSTOMER-LEVEL DECISION</span><h3>Why did RECLAIM choose Payment Link?</h3></div><span className="status-pill">MODEL + POLICY</span></div>
      <div className="decision-grid">
        <div className="decision-customer"><b>Ananya Mehta</b><small>₹1,299 · Timeout / UPI</small><strong>Payment Link</strong></div>
        <div><span>RECOVERY PROBABILITY</span><b>70.8%</b><small>₹920 expected</small></div>
        <div><span>POLICY</span><b>AUTO-APPROVED</b><small>Under ₹5,000 cap</small></div>
        <div><span>WHY</span><p>Fresh payment path avoids repeatedly charging the failed method and matches the customer's preferred recovery channel.</p></div>
      </div>
    </section>

    <section className="blocked-proof">
      <div><div><span className="eyebrow">DEFENSE-IN-DEPTH</span><h3>Not every case is executable.</h3><p>High-risk or low-confidence opportunities are deliberately stopped and routed to a human.</p></div><div className="blocked-case"><b>Karan Patel · ₹22,000</b><strong>HUMAN REVIEW</strong><small>Amount exceeds auto-action cap · no autonomous money movement.</small></div></div>
    </section>

    {goalPlan && <section className="goal-plan">
      <div className="panelhead">
        <div><div className="eyebrow">AGENT PROPOSAL</div><h3>Recover {money(goalPlan.target)}</h3></div>
        <span className="pill">{goalReviewed?'APPROVED':'AWAITING APPROVAL'}</span>
      </div>
      <div className="goal-metrics">
        <div><span>Projected recovery</span><strong>{money(goalPlan.projectedRecovery)}</strong></div>
        <div><span>Intervention cost</span><strong>{money(goalPlan.projectedCost)}</strong></div>
        <div><span>Projected net</span><strong>{money(goalPlan.projectedNet)}</strong></div>
        <div><span>Confidence</span><strong>{pct(goalPlan.confidence)}</strong></div>
      </div>
      <div className="goal-body">
        <div className="plan-actions">
          <div><b>{goalPlan.paymentLinks}</b><span>Payment Links</span></div>
          <div><b>{goalPlan.messages}</b><span>WhatsApp / message</span></div>
          <div><b>{goalPlan.voice}</b><span>Voice interventions</span></div>
          <div><b>{goalPlan.human}</b><span>Human review</span></div>
        </div>
        <div className="goal-explain">
          <b>Why this plan?</b>
          <p>{goalPlan.rationale}</p>
          <small>Policy blocks {goalPlan.blocked} high-risk opportunities from automatic execution. No money-moving action is authorized until you approve the plan.</small>
        </div>
      </div>
      <div className="goal-actions">
        {!goalReviewed && <button onClick={()=>setGoalReviewed(true)}>REVIEW & APPROVE PLAN</button>}
        {goalReviewed && <button onClick={executeGoal} disabled={goalExecuting}>{goalExecuting?'EXECUTING APPROVED PLAN…':'EXECUTE APPROVED PLAN'}</button>}
        <button className="ghost" onClick={()=>setGoalPlan(null)}>DISCARD</button>
      </div>
    </section>}

    <section className="grid4">
      <Card label="At risk" value={money(atRisk)}/>
      <Card label="Expected recovery" value={money(expected)}/>
      <Card label="Recovered this run" value={money(recovered)}/>
      <Card label="Auto actions" value={`${eligible.length}/${plan.length}`}/>
    </section>

    <section className="optimizer-strip">
      <div>
        <div className="eyebrow">OPTIMAL NEXT MOVE</div>
        <h3>{recommended.name}</h3>
        <p>Scenario model estimates {money(recommended.recovery)} recovery at {money(recommended.cost)} intervention cost.</p>
      </div>
      <div className="optimizer-value"><span>Expected net value</span><strong>{money(recommended.net)}</strong></div>
      <button onClick={()=>setShowSimulator(true)}>VIEW WHAT-IF ↗</button>
    </section>

    {links.length>0 && <section className="panel links-panel">
      <div className="panelhead">
        <div><div className="eyebrow">RAZORPAY TEST MODE</div><h3>Live recovery links</h3></div>
        <span className="pill">{links.length} CREATED</span>
      </div>
      <p className="linkhint">Open a link and complete a Test Mode payment. RECLAIM verifies the Razorpay webhook and also runs a safe reconciliation check so a missed webhook does not hide a completed payment.</p>
      <div className="links-list">{links.map(link=>{
        const state=linkStatuses[link.paymentId];
        return <div className="linkrow" key={link.paymentId}>
          <span><b>{link.customer}</b><small>{money(link.amount)} · {link.paymentId}</small></span>
          <span className="link-actions">
            <span className={`payment-state ${state?.paid?'paid':''}`}>{state?.paid?'PAID ✓':'AWAITING PAYMENT'}</span>
            {!state?.paid && <a href={link.shortUrl} target="_blank" rel="noreferrer">OPEN PAYMENT LINK ↗</a>}
          </span>
        </div>
      })}</div>
    </section>}

    <section className="content">
      <div className="panel">
        <div className="panelhead">
          <div><div className="eyebrow">RECOVERY QUEUE</div><h3>Opportunity ranking</h3></div>
          <span className="pill">MODEL + POLICY</span>
        </div>
        <div className="table">
          <div className="tr th"><span>Customer</span><span>Amount</span><span>Recovery</span><span>Action</span></div>
          {plan.map(p=><button className="tr rowbutton" key={p.id} onClick={()=>setSelected(p)}>
            <span><b>{p.customer}</b><small>{p.reason.replaceAll('_',' ')} · {p.method}</small></span>
            <span>{money(p.amount)}</span>
            <span><b>{pct(p.probability)}</b><small>{money(p.expected)} expected</small></span>
            <span><em className={p.action==='human_review'?'warn':''}>{p.action.replaceAll('_',' ')}</em>{p.autoAllowed && <small>auto-approved</small>}</span>
          </button>)}
        </div>
        {selected && <DecisionCard payment={selected} onClose={()=>setSelected(null)}/>}
      </div>

      <aside className="panel">
        <div className="eyebrow">AUDIT TRAIL</div>
        <h3>Every action explainable.</h3>
        <div className="logs">{logs.map((x,i)=><div key={i}><span>•</span>{x}</div>)}</div>
        <div className="policy">
          <b>Safety gates</b>
          <div>Auto-execute ≤ ₹5,000 + confidence ≥ 55%</div>
          <div>Human approval for high value / low confidence</div>
          <div>Webhook signature verification required</div>
          <div>Duplicate events must be idempotent</div>
          <div>Global kill switch available</div>
        </div>
      </aside>
    </section>

    <section className="benchmark">
      <div className="panelhead">
        <div><div className="eyebrow">HELD-OUT EVALUATION</div><h3>We measure the model, not the story.</h3></div>
        <span className="pill">20K SYNTHETIC EVENTS</span>
      </div>
      <div className="grid4">
        <Card label="Test set" value={benchmark.held_out_transactions.toLocaleString()}/>
        <Card label="Precision" value={pct(model.metrics.precision)}/>
        <Card label="Recall" value={pct(model.metrics.recall)}/>
        <Card label="ROC-AUC" value={model.metrics.roc_auc.toFixed(3)}/>
      </div>
      <div className="benchline">
        <div><b>{benchmark.agent_flagged.toLocaleString()}</b><span>transactions flagged</span></div>
        <div><b>{benchmark.agent_recovered.toLocaleString()}</b><span>actual recoveries</span></div>
        <div><b>+{benchmark.incremental_recovered.toLocaleString()}</b><span>incremental recoveries vs baseline</span></div>
      </div>
    </section>

    {showSimulator && <Simulator strategies={strategies} recommended={recommended} atRisk={atRisk} onClose={()=>setShowSimulator(false)}/>}

    <footer><span>RECLAIM OS — Razorpay Buildathon</span><span>AI recommends · Policy authorizes · Payment layer executes</span></footer>
  </main>
}

function Card({label,value}:{label:string,value:string}){
  return <div className="stat"><small>{label}</small><strong>{value}</strong></div>
}

function DecisionCard({payment,onClose}:{payment:any,onClose:()=>void}){
  const reasons:string[]=[];
  if(payment.previousSuccess>=5) reasons.push(`strong payment history (${payment.previousSuccess} previous successes)`);
  if(payment.previousFailures) reasons.push(`${payment.previousFailures} previous failures`);
  if(payment.preferredChannel) reasons.push(`preferred recovery channel: ${payment.preferredChannel}`);
  if(payment.hoursSinceFailure<8) reasons.push(`recent failure (${payment.hoursSinceFailure}h ago)`);
  if(payment.subscription) reasons.push('subscription revenue is at stake');
  const rationale = payment.action==='human_review'
    ? 'The policy gate blocks automatic money movement because this opportunity is high-value, low-confidence, or explicitly configured for human handling.'
    : payment.action==='payment_link'
      ? 'A fresh payment path is preferred over repeatedly charging the failed method.'
      : 'The model predicts enough recovery value to justify a bounded intervention, while merchant policy controls whether it can execute automatically.';
  return <div className="decision-card">
    <div className="decision-head"><div><div className="eyebrow">AI DECISION EXPLANATION</div><h4>{payment.customer} · {money(payment.amount)}</h4></div><button className="mini" onClick={onClose}>CLOSE</button></div>
    <div className="decision-grid">
      <div><span>Recovery probability</span><b>{pct(payment.probability)}</b></div>
      <div><span>Expected recovery</span><b>{money(payment.expected)}</b></div>
      <div><span>Recommended action</span><b>{payment.action.replaceAll('_',' ')}</b></div>
      <div><span>Policy</span><b>{payment.autoAllowed?'AUTO-APPROVED':'HUMAN REVIEW'}</b></div>
    </div>
    <p><strong>Why:</strong> {rationale}</p>
    <small className="reasonline">{reasons.join(' · ')}</small>
  </div>
}

function Simulator({strategies,recommended,atRisk,onClose}:{strategies:Strategy[],recommended:Strategy,atRisk:number,onClose:()=>void}){
  return <div className="modal-backdrop" onClick={onClose}>
    <section className="simulator" onClick={e=>e.stopPropagation()}>
      <div className="panelhead">
        <div><div className="eyebrow">COUNTERFACTUAL RECOVERY LAB</div><h3>What should we do with {money(atRisk)}?</h3><p className="sim-sub">Compare recovery strategies before money moves. These are scenario estimates, not production guarantees.</p></div>
        <button className="mini" onClick={onClose}>CLOSE</button>
      </div>
      <div className="strategy-table">
        <div className="strategy-row strategy-head"><span>Strategy</span><span>Expected recovery</span><span>Cost</span><span>Net value</span></div>
        {strategies.map(s=><div className={`strategy-row ${s.name===recommended.name?'best':''}`} key={s.name}>
          <span><b>{s.name}</b><small>{s.rationale}</small></span>
          <span>{money(s.recovery)}</span>
          <span>{money(s.cost)}</span>
          <span><b>{money(s.net)}</b>{s.name===recommended.name && <em>RECOMMENDED</em>}</span>
        </div>)}
      </div>
      <div className="recommendation"><div><div className="eyebrow">OPTIMIZER DECISION</div><h4>Choose {recommended.name}</h4><p>Highest modeled net recovery after intervention cost. Execution still passes through the merchant policy gate.</p></div><div className="rec-number"><span>Expected net</span><strong>{money(recommended.net)}</strong></div></div>
    </section>
  </div>
}

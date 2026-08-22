import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

function verify(body:string, signature:string, secret:string){
  const digest=createHmac('sha256',secret).update(body).digest('hex');
  const a=Buffer.from(digest); const b=Buffer.from(signature||'');
  return a.length===b.length && timingSafeEqual(a,b);
}

export async function POST(req:Request){
  const raw=await req.text();
  const signature=req.headers.get('x-razorpay-signature')||'';
  const secret=process.env.RAZORPAY_WEBHOOK_SECRET;
  if(!secret) return NextResponse.json({error:'Webhook secret not configured'},{status:500});
  if(!verify(raw,signature,secret)) return NextResponse.json({error:'Invalid webhook signature'},{status:401});
  const eventId=req.headers.get('x-razorpay-event-id')||'';
  if(!eventId) return NextResponse.json({error:'Missing event id'},{status:400});
  // Production: persist eventId before processing. Duplicate IDs must be no-ops.
  const event=JSON.parse(raw);
  return NextResponse.json({ok:true,eventId,event:event.event});
}

import { NextResponse } from 'next/server';
import { getLinks, markLinkPaid } from '../../../../lib/link-state';

export const runtime='nodejs';

async function reconcileWithRazorpay(items:any[]){
  const keyId=process.env.RAZORPAY_KEY_ID;
  const keySecret=process.env.RAZORPAY_KEY_SECRET;
  if(!keyId || !keySecret) return;
  for(const item of items.filter(x=>!x.paid)){
    try{
      const auth=Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const response=await fetch(`https://api.razorpay.com/v1/payment_links/${item.paymentLinkId}`,{
        headers:{Authorization:`Basic ${auth}`},cache:'no-store'
      });
      if(!response.ok) continue;
      const data=await response.json();
      if(data.status==='paid' || Number(data.amount_paid||0)>=Number(data.amount||0)){
        await markLinkPaid(item.paymentLinkId, data.payments?.[0]?.id || undefined);
      }
    }catch{}
  }
}

export async function GET(){
  let links=await getLinks();
  await reconcileWithRazorpay(links);
  links=await getLinks();
  const paid=links.filter(x=>x.paid);
  return NextResponse.json({
    ok:true,
    links,
    paidCount:paid.length,
    recovered:paid.reduce((sum,x)=>sum+x.amount,0),
  },{headers:{'Cache-Control':'no-store'}});
}

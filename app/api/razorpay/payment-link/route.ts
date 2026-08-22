import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';

function basicAuth(){
  const key=process.env.RAZORPAY_KEY_ID;
  const secret=process.env.RAZORPAY_KEY_SECRET;
  if(!key || !secret) throw new Error('Razorpay Test Mode credentials are not configured');
  return 'Basic '+Buffer.from(`${key}:${secret}`).toString('base64');
}

export async function POST(req:Request){
  try{
    const body=await req.json();
    const amount=Number(body.amount);
    if(!Number.isInteger(amount) || amount<=0 || amount>5000000) return NextResponse.json({error:'Invalid bounded amount'}, {status:400});
    const auth=basicAuth();
    const response=await fetch('https://api.razorpay.com/v1/payment_links',{method:'POST',headers:{Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify({amount,currency:'INR',accept_partial:false,description:String(body.description||'RECLAIM recovery payment'),customer:{name:String(body.customerName||'Customer'),email:String(body.email||'')},notify:{sms:false,email:false}})});
    const data=await response.json();
    return NextResponse.json(data,{status:response.status});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Payment-link creation failed'},{status:500});}
}

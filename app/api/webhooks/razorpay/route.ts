import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { markLinkPaid } from '../../../../lib/link-state';

export const runtime = 'nodejs';

function verifySignature(rawBody: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';
  const eventId = request.headers.get('x-razorpay-event-id') || '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ ok: false, error: 'Webhook secret is not configured.' }, { status: 500 });
  }

  if (!signature || !verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ ok: false, error: 'Invalid webhook signature.' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const paymentLinkId=payload?.payload?.payment_link?.entity?.id || payload?.payload?.payment_link?.id || '';
  const razorpayPaymentId=payload?.payload?.payment?.entity?.id || '';
  const isPaid=payload?.event==='payment_link.paid' || payload?.event==='payment.paid';
  const updated=isPaid && paymentLinkId ? await markLinkPaid(paymentLinkId,razorpayPaymentId) : false;

  console.log('[RECLAIM webhook verified]', {
    eventId,
    event:payload?.event,
    paymentLinkId,
    paymentId:razorpayPaymentId,
    stateUpdated:updated,
  });

  return NextResponse.json({ ok:true,eventId,received:true,stateUpdated:updated });
}

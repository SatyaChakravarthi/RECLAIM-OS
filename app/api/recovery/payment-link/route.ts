import { NextResponse } from 'next/server';
import { payments, score } from '../../../../lib/recovery';
import { registerLink } from '../../../../lib/link-state';

export const runtime = 'nodejs';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const paymentId = typeof body?.paymentId === 'string' ? body.paymentId : '';
    const payment = payments.find((p) => p.id === paymentId);

    if (!payment) return jsonError('Unknown recovery opportunity.');

    const decision = score(payment);
    if (!decision.autoAllowed) {
      return jsonError('Policy engine blocked automatic execution for this opportunity.', 403);
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return jsonError('Razorpay test credentials are missing on the server.', 500);
    }

    const referenceId = `reclaim_${payment.id}_${Date.now()}`.slice(0, 40);

    const response = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(payment.amount * 100),
        currency: 'INR',
        accept_partial: false,
        reference_id: referenceId,
        description: `RECLAIM recovery for ${payment.customer}`,
        customer: { name: payment.customer },
        reminder_enable: false,
        notes: {
          reclaim_payment_id: payment.id,
          recovery_probability: decision.probability.toFixed(4),
          recovery_action: decision.action,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Razorpay Payment Link error:', data);
      return NextResponse.json(
        { ok: false, error: data?.error?.description || 'Razorpay rejected the Payment Link request.' },
        { status: response.status },
      );
    }

    await registerLink({
      paymentLinkId:data.id,
      paymentId:payment.id,
      customer:payment.customer,
      amount:payment.amount,
      shortUrl:data.short_url,
      status:data.status || 'created',
      paid:false,
      updatedAt:new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      paymentId: payment.id,
      customer: payment.customer,
      amount: payment.amount,
      expected: decision.expected,
      paymentLinkId: data.id,
      shortUrl: data.short_url,
      status: data.status,
      referenceId,
    });
  } catch (error) {
    console.error('Payment Link route error:', error);
    return jsonError('Could not create the Razorpay Payment Link.', 500);
  }
}

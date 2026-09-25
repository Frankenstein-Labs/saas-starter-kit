import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyWebhookSignature } from '@/lib/integrations/github';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res
      .status(405)
      .json({ error: { message: `Method ${req.method} Not Allowed` } });
  }

  const signature = req.headers['x-hub-signature-256'] as string;
  const event = req.headers['x-github-event'] as string;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (secret) {
    const rawBody =
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const isValid = verifyWebhookSignature(rawBody, signature, secret);
    if (!isValid) {
      return res
        .status(401)
        .json({ error: { message: 'Invalid webhook signature' } });
    }
  }

  const payload =
    typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  return res
    .status(200)
    .json({ received: true, event, action: payload?.action ?? null });
}

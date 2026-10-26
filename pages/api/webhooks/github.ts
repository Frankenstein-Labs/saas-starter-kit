import type { NextApiRequest, NextApiResponse } from 'next';
import { githubClient } from '@/lib/integrations/github';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } });
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['x-hub-signature-256'] as string;

    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).json({ error: { message: 'GitHub Webhook Secret not configured' } });
    }

    const isValid = githubClient.verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return res.status(401).json({ error: { message: 'Invalid webhook signature' } });
    }

    const event = req.headers['x-github-event'] as string;
    const body = JSON.parse(rawBody.toString('utf8'));

    // Process GitHub webhook events
    if (event === 'ping') {
      return res.status(200).json({ message: 'pong' });
    }

    if (event === 'installation' || event === 'push' || event === 'repository') {
      // Return received confirmation
      return res.status(200).json({ status: 'success', event, action: body.action });
    }

    return res.status(200).json({ status: 'ignored', event });
  } catch (error: any) {
    return res.status(500).json({ error: { message: error.message || 'Webhook handler error' } });
  }
}

import { NextApiRequest, NextApiResponse } from 'next';
import { GitHubAppProvider } from '@/lib/integrations/github';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', (err) => reject(err));
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: { message: 'Method Not Allowed' } });
  }

  const rawBody = await getRawBody(req);
  const signature = req.headers['x-hub-signature-256'] as string;
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res
      .status(500)
      .json({ error: { message: 'Webhook secret is not configured' } });
  }

  const provider = new GitHubAppProvider({
    teamId: 'system',
    provider: 'github',
    appConfig: {
      appId: process.env.GITHUB_APP_ID || '',
      privateKey: process.env.GITHUB_PRIVATE_KEY || '',
      webhookSecret,
    },
  });

  const isValid = provider.verifyWebhookSignature(rawBody, signature);

  if (!isValid) {
    return res.status(401).json({ error: { message: 'Invalid signature' } });
  }

  const event = req.headers['x-github-event'] as string;
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: { message: 'Invalid JSON payload' } });
  }

  // Handle relevant GitHub App events
  switch (event) {
    case 'installation':
    case 'installation_repositories':
    case 'push':
      // Event processed
      break;
    default:
      break;
  }

  return res.status(200).json({ received: true, event, action: payload.action || null });
}

import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    status: 'working',
    message: 'Pages API route works!',
    timestamp: new Date().toISOString(),
  });
}

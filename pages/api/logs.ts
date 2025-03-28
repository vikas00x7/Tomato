import type { NextApiRequest, NextApiResponse } from 'next';
import { storage } from '../../server/storage';

type ResponseData = {
  success: boolean;
  message?: string;
  data?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Only GET method is allowed
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Get logs from storage
    const logs = await storage.getBotLogs();
    
    return res.status(200).json({ 
      success: true,
      data: { logs }
    });
  } catch (error) {
    console.error('Error retrieving bot logs:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error'
    });
  }
}
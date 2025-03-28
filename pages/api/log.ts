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
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const {
      ipAddress,
      userAgent,
      fingerprint,
      botScore,
      isBot,
      path,
      headers,
      requestData,
      redirectedTo
    } = req.body;

    // Validate required fields
    if (!ipAddress || !userAgent || !path) {
      return res.status(400).json({ 
        success: false, 
        message: 'Required fields missing: ipAddress, userAgent, and path are required' 
      });
    }

    // Log the bot request
    const logEntry = await storage.logBotRequest({
      ipAddress,
      userAgent,
      fingerprint: fingerprint || null,
      botScore: botScore || 0,
      isBot: isBot || false,
      path,
      headers: headers || {},
      requestData: requestData || {},
      redirectedTo: redirectedTo || null
    });

    return res.status(200).json({ 
      success: true,
      message: 'Bot log entry created successfully',
      data: { id: logEntry.id }
    });
  } catch (error) {
    console.error('Error logging bot request:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error'
    });
  }
}
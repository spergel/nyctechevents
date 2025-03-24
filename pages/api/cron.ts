import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import path from 'path';

// Validate request has the correct secret
const validateRequest = (req: NextApiRequest) => {
  const authHeader = req.headers.authorization;
  
  if (!process.env.CRON_SECRET) {
    console.error('CRON_SECRET is not set in the environment variables');
    return false;
  }
  
  if (!authHeader) {
    console.error('Authorization header is missing');
    return false;
  }
  
  return authHeader === process.env.CRON_SECRET;
};

// Run a script with optional arguments
const runScript = (scriptPath: string, args: string = ''): Promise<string> => {
  return new Promise((resolve, reject) => {
    const command = `python ${scriptPath} ${args}`;
    console.log(`Running command: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing script: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.error(`Script stderr: ${stderr}`);
      }
      console.log(`Script stdout: ${stdout}`);
      resolve(stdout);
    });
  });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Cron job triggered');
  
  // Validate the request
  if (!validateRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Run the scraper script to update events data
    console.log('Running event scraper with --append flag...');
    await runScript('tech/run_all.py', '--append');
    
    // Generate tweets for manual posting
    console.log('Generating tweets for manual posting...');
    await runScript('tech/tweet_generator.py');
    
    // Check if email sender is configured
    const emailSenderConfigured = Boolean(process.env.EMAIL_SENDER && process.env.EMAIL_PASSWORD);
    
    if (emailSenderConfigured) {
      // Set default recipient email if not in environment
      const recipientEmail = process.env.TWEET_RECIPIENT_EMAIL || 'spergel.joshua@gmail.com';
      
      // Send email notification with the generated tweets
      console.log(`Sending email notification to ${recipientEmail}...`);
      try {
        // Set this as an environment variable for the script to use
        process.env.TWEET_RECIPIENT_EMAIL = recipientEmail;
        await runScript('tech/tweet_notifier.py');
        console.log('Email notification sent successfully');
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the entire cron job if just the email fails
      }
    } else {
      console.log('Email credentials not configured. Skipping email notification.');
      console.log('Tweet HTML is available at /api/latest-tweets?format=raw');
    }
    
    // Get the current datetime for the response
    const now = new Date();
    const formattedDate = now.toISOString();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Cron job completed successfully',
      timestamp: formattedDate,
      details: 'Events scraped and tweets generated for manual posting',
      tweetsUrl: '/api/latest-tweets'
    });
  } catch (error) {
    console.error('Error running cron job:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
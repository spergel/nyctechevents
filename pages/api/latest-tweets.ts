import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Find the latest tweets HTML file
    const tweetsDir = path.join(process.cwd(), 'scraper', 'tech', 'tweets');
    console.log('Looking for tweets in:', tweetsDir);
    
    // Make sure the directory exists
    if (!fs.existsSync(tweetsDir)) {
      console.log('Tweets directory not found:', tweetsDir);
      return res.status(404).json({ error: 'Tweets directory not found' });
    }
    
    // Get all HTML files in the tweets directory
    const allFiles = fs.readdirSync(tweetsDir);
    const htmlFiles = allFiles
      .filter(file => file.startsWith('tweets_') && file.endsWith('.html'))
      .map(file => path.join(tweetsDir, file));
    
    console.log('Found HTML files:', htmlFiles);
    
    if (htmlFiles.length === 0) {
      console.log('No HTML files found in directory:', tweetsDir);
      return res.status(404).json({ error: 'No tweet files found' });
    }
    
    // Sort by modification time (newest first)
    htmlFiles.sort((a: string, b: string) => {
      return fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime();
    });
    
    // Get the latest file
    const latestHtmlFile = htmlFiles[0];
    console.log('Latest HTML file:', latestHtmlFile);
    
    // Get file stats
    const stats = fs.statSync(latestHtmlFile);
    
    // Set cache headers - cache for 1 hour since tweets are updated daily
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    
    // Check if format=raw is specified in query parameters
    const format = req.query.format as string;
    
    if (format === 'raw') {
      // Return raw HTML content
      const content = fs.readFileSync(latestHtmlFile, 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(content);
    }
    
    // Return file info and creation time
    return res.status(200).json({
      filename: path.basename(latestHtmlFile),
      created: stats.mtime,
      size: stats.size,
      url: `/api/latest-tweets?format=raw`,
      message: 'Add ?format=raw to view the HTML content directly',
      lastUpdated: stats.mtime.toISOString(),
      age: Math.floor((Date.now() - stats.mtime.getTime()) / 1000) // Age in seconds
    });
  } catch (error) {
    console.error('Error fetching latest tweets:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch latest tweets', 
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
} 
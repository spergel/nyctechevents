# Vercel Setup Guide for NYC Events Twitter Automation

This guide explains how to set up the NYC Events Twitter automation system on Vercel.

## Environment Variables

Set the following environment variables in your Vercel project:

1. **Twitter API credentials** (for future use if you upgrade to paid tier):
   - `TWITTER_API_KEY`
   - `TWITTER_API_SECRET`
   - `TWITTER_ACCESS_TOKEN`
   - `TWITTER_ACCESS_TOKEN_SECRET`

2. **Email notification credentials** (optional):
   - `EMAIL_SENDER` - The email address to send from (e.g., your Gmail)
   - `EMAIL_PASSWORD` - The password or app password for the sender email
   - `SMTP_SERVER` - SMTP server (default: smtp.gmail.com)
   - `SMTP_PORT` - SMTP port (default: 587)
   - `TWEET_RECIPIENT_EMAIL` - Where to send the tweet notifications (defaults to spergel.joshua@gmail.com)

3. **Cron job security**:
   - `CRON_SECRET` - A secret string to secure your cron endpoint

## Accessing Tweets - Two Options

You have two ways to access your generated tweets:

### Option 1: Email Notifications
Set up the email environment variables as described above to receive email notifications with the tweets.

### Option 2: API Endpoint (No Email Required)
Access the latest tweets directly from your browser:

1. **JSON info**: Visit `https://your-vercel-app.vercel.app/api/latest-tweets`
2. **Direct HTML view**: Visit `https://your-vercel-app.vercel.app/api/latest-tweets?format=raw`

You can bookmark the second URL on your phone/desktop for quick access to today's tweets.

## Gmail Setup for Notifications (Option 1 only)

If using Gmail for notifications:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account > Security > App Passwords
   - Select "Mail" and your device
   - Generate and copy the password
   - Use this as your `EMAIL_PASSWORD` environment variable

## Vercel Cron Job Setup

The project is configured to run a daily cron job:

1. Vercel automatically detects the cron schedule in `vercel.json`
2. It will call the `/api/cron` endpoint with the `CRON_SECRET` as authorization
3. The endpoint will:
   - Scrape new events with the `--append` flag to preserve existing events
   - Generate tweets in HTML format
   - Send an email with the formatted tweets (if email is configured)
   - Automatically clean up old tweet files to avoid clutter

## Manual Twitter Posting Workflow

Since Twitter's free API tier doesn't allow automated posting, here's the manual workflow:

1. The cron job runs daily and generates tweets
2. Access the tweets through email or the API endpoint
3. For each tweet:
   - Click "Copy" to copy the tweet text
   - Click "Open Twitter" to open Twitter in a new tab
   - Paste and post the tweet
   - For replies, click the previous tweet, then "Reply"

## Checking Logs

If something isn't working:

1. Go to your Vercel dashboard
2. Navigate to your project
3. Click on "Deployments"
4. Select the latest deployment
5. Click on "Functions"
6. Look for `/api/cron` and check its logs

## Testing the Cron Job Manually

To test the cron job manually:

```bash
curl -X POST https://your-vercel-app.vercel.app/api/cron \
  -H "Authorization: your-cron-secret"
```

Replace `your-vercel-app.vercel.app` with your actual Vercel URL and `your-cron-secret` with your `CRON_SECRET`.

## Upgrading to Automated Posting

If you decide to upgrade to Twitter's Basic tier ($100/month):

1. Update your Twitter Developer account to the Basic tier
2. Edit `pages/api/cron.ts` to use `twitter_poster.py` instead of `tweet_generator.py`
3. Remove the email notification step if desired 
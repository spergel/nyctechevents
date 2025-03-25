# NYC Events Twitter Workflow

This directory contains automatically generated tweets from the NYC Events website scraper. These tweets are formatted and ready for manual posting to Twitter.

## How It Works

1. The automated scraper runs daily via a cron job
2. It collects events from various sources and updates the website data
3. The `tweet_generator.py` script formats tomorrow's events into a thread of tweets
4. The tweets are saved in this directory with a timestamp in the filename (both text and HTML versions)

## Twitter API Limitations

We've thoroughly tested Twitter's API and discovered that **despite documentation suggesting otherwise**, Twitter's free API tier **does not allow programmatic posting of tweets** in practice. 

According to Twitter's documentation, the free tier should allow:
- Posting tweets with Twitter API v2
- Media Upload with Twitter API v1.1

However, our tests consistently receive `403 Forbidden` errors with messages like:
```
403 Forbidden
453 - You currently have access to a subset of X API V2 endpoints and limited v1.1 endpoints (e.g. media post, oauth) only. If you need access to this endpoint, you may need a different access level.
```

Even media uploads alone are rejected with the same error.

## Posting Instructions

Since automatic posting isn't possible without upgrading to Twitter's Basic tier ($100/month), here's how to post manually:

1. Find the latest tweet file in this directory (named like `tweets_YYYYMMDD_HHMMSS.html`)
2. Open the HTML file in your browser (it should open automatically when generated)
3. Use the convenient interface to:
   - Copy each tweet with one click
   - Open Twitter in a new tab with one click
   - Paste and post the tweet
   - For replies, click the previous tweet, then click "Reply" before pasting

The HTML interface makes this process as quick and painless as possible.

## Future Options

If automatic posting becomes essential:

1. **Upgrade to Twitter Basic Tier** ($100/month) to unlock full API access
2. **Switch to a different platform** like Mastodon, which has more open API policies
3. **Explore Twitter-compatible alternatives** that might have different rate limits or policies

## Generated Tweet Format

- **Tweet 1**: Introduction with the date
- **Tweets 2-6**: Individual events with details:
  - Event name
  - Time
  - Location (if available)
  - Brief description
  - Shortened URL for more information 
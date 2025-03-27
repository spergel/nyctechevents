# NYC Events Scraper

This directory contains scrapers for collecting NYC tech events from various sources.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Create a `.env.local` file in the root directory with the following variables:
   ```
   GOOGLE_API_KEY=your_google_api_key_here
   ```

## Google Calendar API Key Setup

To properly set up the Google Calendar API key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. Create an API key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated key
5. Configure API key restrictions:
   - Click on the newly created API key
   - Under "API restrictions", select "Restrict key"
   - Add "Google Calendar API" to the allowed APIs list
   - Save

If you see the error "Requests to this API calendar method calendar.v3.Events.List are blocked":
- Verify the Calendar API is enabled for your project
- Make sure your API key doesn't have restrictions blocking the Calendar API
- Try disabling and re-enabling the Google Calendar API in your project

## Setting Up GitHub Actions

For the GitHub workflow to use your API key:

1. Go to your GitHub repository settings
2. Navigate to "Secrets and variables" > "Actions"
3. Click "New repository secret"
4. Add a secret named `GOOGLE_API_KEY` with your Google API key as the value

## Available Scrapers

The scraper currently collects events from:
- Google Calendars (requires API key)
- ICS Calendars
- Pioneer Works
- Gary's Guide
- Interference Archive
- Index Space
- Fabrik

## Running the Scraper

To run all scrapers:
```bash
python -m scraper.tech.run_all
```

To generate tweets from collected events:
```bash
python -m scraper.tech.tweet_generator
``` 
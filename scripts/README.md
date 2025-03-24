# Data Update Scripts

This directory contains scripts for updating the application data, including the last updated timestamp that appears in the ConsoleLayout interface.

## Scripts Overview

- `update-data.js` - The main Node.js script that updates the last_updated field in substackposts.json
- `run-update.bat` - Windows batch file for running the update script (used by the task scheduler)

## Setting Up the Scheduled Task on Windows

To have the last_updated field automatically update on a regular basis, follow these steps to create a scheduled task:

### Step 1: Open Task Scheduler

1. Press `Win + R`, type `taskschd.msc` and press Enter
2. This will open the Windows Task Scheduler

### Step 2: Create a Basic Task

1. In the right sidebar, click on "Create Basic Task..."
2. Enter a name (e.g., "NYC Events Data Update") and description
3. Click Next

### Step 3: Configure the Trigger

1. Select when you want the task to run (e.g., Daily)
2. Follow the wizard to set up the schedule (e.g., every day at 12:00 AM)
3. Click Next

### Step 4: Configure the Action

1. Select "Start a program" as the action
2. Click Next
3. In the "Program/script" field, browse to the `run-update.bat` file in the scripts directory of the project
4. In the "Start in" field, enter the full path to the project's root directory
5. Click Next

### Step 5: Finish

1. Review your settings and click Finish

## Alternative: Setting Up a Cron Job on Linux/Mac

If you're running the project on Linux or Mac, you can set up a cron job instead:

1. Open a terminal
2. Type `crontab -e` to edit your cron jobs
3. Add a line like this to run the update daily at midnight:
   ```
   0 0 * * * cd /path/to/project && node scripts/update-data.js >> logs/update.log 2>&1
   ```
4. Save and exit

## Manual Update

To manually update the last_updated timestamp, simply run:

```
node scripts/update-data.js
```

This will update the timestamp in the JSON file, which will be reflected in the UI the next time the page loads. 
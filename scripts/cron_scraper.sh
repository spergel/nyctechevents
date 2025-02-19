#!/bin/bash

# Navigate to the script directory
cd "$(dirname "$0")"

# Activate virtual environment if you have one
# source /path/to/your/venv/bin/activate

# Run the Luma scrapers
echo "Starting Luma scrapers at $(date)" >> scraper.log
python luma_scrapers.py >> scraper.log 2>&1

# Run the Gary's Guide scraper
echo "Starting Gary's Guide scraper at $(date)" >> scraper.log
python garys_guide_scraper.py >> scraper.log 2>&1

# Log the completion
echo "All scrapers completed at $(date)" >> scraper.log
echo "----------------------------------------" >> scraper.log 
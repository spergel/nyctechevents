#!/bin/bash

# Navigate to the project root directory (adjust this path if needed)
cd "$(dirname "$0")/.." || exit 1

# Set NODE_ENV to production
export NODE_ENV=production

# Log start time
echo "Running data update at $(date)"

# Run the update script
node scripts/update-data.js >> logs/update.log 2>&1

# Add a success message with timestamp
echo "Update completed at $(date)" >> logs/update.log

# Exit with the status of the last command
exit $? 
const fs = require('fs');
const path = require('path');

// Path to the data files
const dataDirectory = path.join(__dirname, '..', 'public', 'data');
const substackPostsPath = path.join(dataDirectory, 'substackposts.json');

/**
 * Updates the last_updated field in the specified JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {Promise<void>}
 */
async function updateLastUpdated(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`);
      return null;
    }
    
    // Read the existing file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    // Store previous value for logging
    const previousUpdate = data.last_updated;
    
    // Update the last_updated field with the current UTC timestamp
    data.last_updated = new Date().toISOString();
    
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`Updated last_updated timestamp in ${path.basename(filePath)}`);
    console.log(`  From: ${previousUpdate}`);
    console.log(`  To:   ${data.last_updated}`);
    
    return data.last_updated;
  } catch (error) {
    console.error(`Error updating last_updated timestamp in ${path.basename(filePath)}:`, error);
    throw error;
  }
}

/**
 * Future function to fetch and update Substack posts
 * @returns {Promise<void>}
 */
async function fetchSubstackPosts() {
  // This is a placeholder for future implementation
  console.log('Updating Substack posts data...');
  
  // For now, we'll just update the timestamp
  return updateLastUpdated(substackPostsPath);
}

/**
 * Main function to run all updates
 */
async function runUpdates() {
  try {
    console.log('Starting data updates at', new Date().toISOString());
    
    // Update Substack posts
    await fetchSubstackPosts();
    
    // Could add more update functions here in the future
    
    console.log('All updates completed successfully');
  } catch (error) {
    console.error('Error during updates:', error);
    process.exit(1);
  }
}

// Run the updates if this file is executed directly
if (require.main === module) {
  runUpdates();
}

// Export functions for potential use in other scripts
module.exports = {
  updateLastUpdated,
  fetchSubstackPosts,
  runUpdates
}; 
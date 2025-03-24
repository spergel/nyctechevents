const fs = require('fs');
const path = require('path');

// Path to the substackposts.json file
const filePath = path.join(__dirname, '..', 'public', 'data', 'substackposts.json');

// Function to update the last_updated field
function updateLastUpdated() {
  try {
    // Read the existing file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Update the last_updated field with the current UTC timestamp
    data.last_updated = new Date().toISOString();
    
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log('Successfully updated last_updated timestamp to:', data.last_updated);
  } catch (error) {
    console.error('Error updating last_updated timestamp:', error);
  }
}

// Run the update function
updateLastUpdated(); 
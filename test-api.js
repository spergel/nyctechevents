// Simple script to test accessing the API endpoint
const fetch = require('node-fetch');

async function testApi() {
  try {
    const response = await fetch('http://localhost:3001/api/latest-tweets');
    console.log('Response status:', response.status);
    
    const data = await response.json().catch(e => {
      console.error('Error parsing JSON:', e);
      return null;
    });
    
    console.log('Response data:', data);
    
    // Now try with format=raw
    console.log('\nTesting with format=raw...');
    const rawResponse = await fetch('http://localhost:3001/api/latest-tweets?format=raw');
    console.log('Raw response status:', rawResponse.status);
    
    // For raw, just get the text length since it's HTML
    const rawText = await rawResponse.text().catch(e => {
      console.error('Error getting raw text:', e);
      return '';
    });
    
    console.log('Raw HTML length:', rawText.length);
    console.log('First 100 chars:', rawText.substring(0, 100));
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testApi(); 
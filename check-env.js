// Simple script to check if environment variables are loaded correctly
console.log('Checking environment variables...');

// Check if the Mapbox token is available
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
console.log('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN exists:', !!mapboxToken);

if (mapboxToken) {
  // Only show a small part of the token for security
  console.log('Token prefix:', mapboxToken.substring(0, 5) + '...');
  console.log('Token length:', mapboxToken.length);
} else {
  console.log('Mapbox token is missing!');
  console.log('Make sure you have a .env.local file with NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token');
}

// List all environment variables that start with NEXT_PUBLIC_
console.log('\nAll NEXT_PUBLIC_ environment variables:');
Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')).forEach(key => {
  console.log(`- ${key}: ${key === 'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN' ? '[MASKED]' : process.env[key]}`);
});

console.log('\nCheck complete!'); 
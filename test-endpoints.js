// Test script to find which US Property Data endpoint works with your subscription
// Run with: node test-endpoints.js

const API_KEY = '3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9';
const API_HOST = 'us-real-estate.p.rapidapi.com';

const endpoints = [
  {
    name: 'Option 1: /for-sale',
    url: 'https://us-real-estate.p.rapidapi.com/for-sale?city=Austin&state_code=TX&limit=5',
    description: 'Basic for-sale endpoint with city and state'
  },
  {
    name: 'Option 2: /v2/for-sale',
    url: 'https://us-real-estate.p.rapidapi.com/v2/for-sale?city=Austin&state_code=TX&limit=5',
    description: 'V2 for-sale endpoint'
  },
  {
    name: 'Option 3: /properties/list-for-sale',
    url: 'https://us-real-estate.p.rapidapi.com/properties/list-for-sale?city=Austin&state_code=TX&limit=5',
    description: 'Properties list-for-sale endpoint'
  },
  {
    name: 'Option 4: /properties/v2/list-for-sale',
    url: 'https://us-real-estate.p.rapidapi.com/properties/v2/list-for-sale?city=Austin&state_code=TX&limit=5',
    description: 'Properties V2 list-for-sale endpoint'
  },
  {
    name: 'Option 5: /search',
    url: 'https://us-real-estate.p.rapidapi.com/search?location=Austin%2C%20TX&status=for_sale&limit=5',
    description: 'Search endpoint with location'
  }
];

async function testEndpoint(endpoint) {
  console.log(`\n🧪 Testing: ${endpoint.name}`);
  console.log(`📝 ${endpoint.description}`);
  console.log(`🔗 URL: ${endpoint.url}`);
  
  try {
    const response = await fetch(endpoint.url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': API_HOST
      }
    });

    console.log(`📥 Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Failed: ${response.status} - ${errorText.substring(0, 100)}`);
      return null;
    }

    const data = await response.json();
    console.log('✅ SUCCESS! This endpoint works!');
    
    // Check response structure
    if (data.data?.home_search?.results) {
      console.log(`📊 Found ${data.data.home_search.results.length} homes`);
      console.log('📦 Response format: data.data.home_search.results');
    } else if (data.results) {
      console.log(`📊 Found ${data.results.length} homes`);
      console.log('📦 Response format: data.results');
    } else if (Array.isArray(data)) {
      console.log(`📊 Found ${data.length} homes`);
      console.log('📦 Response format: Array');
    } else {
      console.log('📦 Response structure:', Object.keys(data));
    }

    // Show sample data
    console.log('\n📄 Sample response (first 500 chars):');
    console.log(JSON.stringify(data, null, 2).substring(0, 500) + '...');

    return { endpoint, data };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 Testing US Property Data API Endpoints...');
  console.log('=' .repeat(60));

  const results = [];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    if (result) {
      results.push(result);
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between requests
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  if (results.length === 0) {
    console.log('❌ No endpoints worked!');
    console.log('\n💡 Next steps:');
    console.log('1. Check your RapidAPI subscription is active');
    console.log('2. Go to https://rapidapi.com/developer/dashboard');
    console.log('3. Check which endpoints are included in your plan');
    console.log('4. Try a different Real Estate API if needed');
  } else {
    console.log(`✅ Found ${results.length} working endpoint(s)!\n`);
    
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.endpoint.name}`);
      console.log(`   URL: ${result.endpoint.url.split('?')[0]}`);
    });

    console.log('\n🎯 RECOMMENDED:');
    console.log(`Use: ${results[0].endpoint.name}`);
    console.log(`Endpoint: ${results[0].endpoint.url.split('?')[0]}`);
    
    console.log('\n📋 Tell me:');
    console.log(`"${results[0].endpoint.name} works!"`);
    console.log('And I\'ll update the code for you!');
  }
}

// Run the tests
runAllTests().catch(console.error);

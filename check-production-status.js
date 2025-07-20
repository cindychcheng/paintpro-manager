#!/usr/bin/env node

/**
 * Script to check Railway production status and volume configuration
 * Run this to verify if volumes are working correctly
 */

const https = require('https');

async function checkProductionStatus() {
  console.log('🔍 Checking Railway production status...\n');
  
  // You'll need to replace this with your actual Railway app URL
  const url = 'https://web-production-fd11.up.railway.app/api/health';
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('✅ Production API Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Check if we can get database stats
    const statsUrl = 'https://web-production-fd11.up.railway.app/api/clients';
    const statsResponse = await fetch(statsUrl);
    const statsData = await statsResponse.json();
    
    console.log('\n📊 Current Database Status:');
    if (statsData.success && statsData.data) {
      console.log(`   👥 Clients: ${statsData.data.length}`);
    } else {
      console.log('   ❌ Could not retrieve client data');
      console.log('   Response:', JSON.stringify(statsData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error checking production status:', error.message);
    console.log('\n💡 This might mean:');
    console.log('   1. The service is still deploying');
    console.log('   2. There\'s a configuration issue');
    console.log('   3. The volume is not mounted correctly');
  }
}

// Simple fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

checkProductionStatus();
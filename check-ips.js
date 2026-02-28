const { MongoClient } = require('mongodb');
const fs = require('fs');

const uri = process.env.MONGODB_URI || fs.readFileSync('.env.local', 'utf8').match(/MONGODB_URI=(.*)/)[1];
const client = new MongoClient(uri);

async function checkIPs() {
  try {
    await client.connect();
    const db = client.db('waf_db');
    
    const ips = await db.collection('attacks').aggregate([
      {
        $group: {
          _id: '$transaction.client_ip',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();
    
    console.log('\nIPs in database:');
    ips.forEach(ip => {
      console.log(`  ${ip._id}: ${ip.count} attacks`);
    });
    console.log(`\nTotal unique IPs: ${ips.length}`);
    
  } finally {
    await client.close();
  }
}

checkIPs();

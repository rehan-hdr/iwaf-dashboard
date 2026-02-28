import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getAuthenticatedUser, handleApiError } from '@/lib/auth';

export async function GET() {
  try {
    const { role } = await getAuthenticatedUser();
    const client = await clientPromise;
    const db = client.db('waf_db');
    
    // Get data from attacks collection
    const collection = db.collection('attacks');
    
    // Fetch some data (limiting to 10 documents as an example)
    const data = await collection.find({}).limit(10).toArray();
    
    console.log('MongoDB Data:', JSON.stringify(data, null, 2));
    console.log('Total documents fetched:', data.length);
    
    return NextResponse.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    return handleApiError(error);
  }
}

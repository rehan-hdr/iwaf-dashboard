import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getAuthenticatedUser, handleApiError } from '@/lib/auth';

export async function GET() {
  try {
    await getAuthenticatedUser();

    const client = await clientPromise;
    const db = client.db('waf_db');
    const suggestions = await db
      .collection('ml_rule_suggestions')
      .find({})
      .sort({ analyzed_at: -1 })
      .toArray();

    const serialized = suggestions.map((s) => ({
      ...s,
      _id: s._id.toString(),
    }));

    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    return handleApiError(error);
  }
}

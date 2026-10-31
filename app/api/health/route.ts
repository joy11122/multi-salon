import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
export const dynamic='force-dynamic';
export async function GET(){try{const db=await getDb();await db.command({ping:1});return NextResponse.json({status:'ok',database:'connected',timestamp:new Date().toISOString()});}catch(error){console.error('health_check_failed',error);return NextResponse.json({status:'degraded',database:'unavailable',timestamp:new Date().toISOString()},{status:503});}}

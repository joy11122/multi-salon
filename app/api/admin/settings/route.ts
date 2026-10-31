import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db/client';
import { requireRole } from '@/lib/auth-guards';
import { SALON_ID } from '@/lib/utils';
const day=z.object({open:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),close:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),closed:z.boolean()});
const schema=z.object({name:z.string().trim().min(2).max(100),phone:z.string().trim().max(30),address:z.string().trim().max(300),openingHours:z.array(day).length(7)});
export async function GET(){const guard=await requireRole(['ADMIN']);if('response'in guard)return guard.response;try{const settings=await(await getDb()).collection('settings').findOne({_id:'salon' as never});return NextResponse.json({settings:settings||null});}catch{return NextResponse.json({error:'Could not load settings.'},{status:500});}}
export async function PATCH(request:Request){const guard=await requireRole(['ADMIN']);if('response'in guard)return guard.response;try{const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||'Invalid settings.'},{status:400});const {openingHours,...profile}=parsed.data;for(const hours of openingHours){if(!hours.closed&&hours.open>=hours.close)return NextResponse.json({error:'Closing time must be later than opening time.'},{status:400});}await(await getDb()).collection('settings').updateOne({_id:'salon' as never},{$set:{...profile,openingHours,salonId:SALON_ID,updatedAt:new Date()}},{upsert:true});return NextResponse.json({success:true});}catch(error){console.error('settings_update_failed',error);return NextResponse.json({error:'Could not save settings.'},{status:500});}}

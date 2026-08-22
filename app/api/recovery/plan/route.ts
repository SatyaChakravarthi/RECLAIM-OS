import {NextResponse} from 'next/server';
import {buildPlan} from '../../../../../../lib/recovery';
export async function GET(){return NextResponse.json({plan:buildPlan(),generatedAt:new Date().toISOString()});}

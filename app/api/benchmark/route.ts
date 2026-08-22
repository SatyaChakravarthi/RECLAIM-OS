import { NextResponse } from 'next/server';
import benchmark from '../../../data/benchmark.json';
import model from '../../../data/model.json';
export async function GET(){ return NextResponse.json({benchmark,model:model.metrics}); }

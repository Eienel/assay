import { NextResponse } from 'next/server';
import { snapshot } from '@/lib/ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await snapshot());
}

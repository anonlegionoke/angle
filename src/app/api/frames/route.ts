import { NextResponse } from 'next/server';

const WORKER_URL = process.env.WORKER_URL;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const res = await fetch(`${WORKER_URL}/thumbnails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Error calling FastAPI /thumbnails:', error);
    return NextResponse.json({ error: 'Failed to generate thumbnails' }, { status: 500 });
  }
}
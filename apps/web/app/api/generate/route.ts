import { NextResponse } from 'next/server';
import { GenerateRequestSchema, GenerateResponseSchema, type GenerateResponse } from '@/types/schemas';
import { z } from 'zod';

const TEE_SERVICE_URL = process.env.TEE_SERVICE_URL || 'http://localhost:3001';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, version = 'lite' } = GenerateRequestSchema.parse(body);

    const cleanTopic = topic.trim();
    if (cleanTopic.length < 3) {
      return NextResponse.json(
        { error: 'Topic must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (version === 'pro') {
      return NextResponse.json(
        { error: 'Pro version not yet supported via TEE service. Use Lite version.' },
        { status: 400 }
      );
    }

    const userAddress = '0x0000000000000000000000000000000000000000';

    const response = await fetch(`${TEE_SERVICE_URL}/challenge/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userAddress, topic: cleanTopic }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to generate roadmap from TEE service' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const validated = GenerateResponseSchema.parse(data);
    
    return NextResponse.json(validated);
  } catch (error) {
    console.error('API Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
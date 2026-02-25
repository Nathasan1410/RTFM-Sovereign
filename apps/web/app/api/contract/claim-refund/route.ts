import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/contract/claim-refund
 * 
 * Proxies refund claiming requests to the TEE server.
 * Claims refund on-chain via the SkillStaking contract after successful attestation.
 * 
 * @body {string} sessionId - Session UUID from TEE server
 * 
 * @returns {Object} 200 - Success response with transaction hash and refund amount
 * @returns {Object} 400 - Validation error
 * @returns {Object} 503 - TEE server error
 * @returns {Object} 500 - Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    // Validate request body
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing or invalid sessionId', 
          code: 'INVALID_SESSION_ID' 
        },
        { status: 400 }
      );
    }

    // Get TEE server URL from environment
    const TEE_URL = process.env.NEXT_PUBLIC_TEE_URL || 'http://localhost:3001';

    // Forward request to TEE server
    const teeResponse = await fetch(`${TEE_URL}/contract/claim-refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });

    const result = await teeResponse.json();

    // Return the response from TEE server
    return NextResponse.json(result, { 
      status: teeResponse.status 
    });
  } catch (error) {
    console.error('API /contract/claim-refund error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR' 
      },
      { status: 500 }
    );
  }
}

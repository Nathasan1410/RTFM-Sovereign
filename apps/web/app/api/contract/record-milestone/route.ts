import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/contract/record-milestone
 * 
 * Proxies milestone recording requests to the TEE server.
 * Records a milestone completion on-chain via the SkillStaking contract.
 * 
 * @body {string} sessionId - Session UUID from TEE server
 * @body {number} milestoneId - Milestone ID to record (1-5)
 * 
 * @returns {Object} 200 - Success response with transaction hash
 * @returns {Object} 400 - Validation error
 * @returns {Object} 503 - TEE server error
 * @returns {Object} 500 - Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, milestoneId } = body;

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

    if (milestoneId === undefined || milestoneId === null) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing milestoneId', 
          code: 'MISSING_MILESTONE_ID' 
        },
        { status: 400 }
      );
    }

    const milestoneIdNum = parseInt(milestoneId);
    if (isNaN(milestoneIdNum) || milestoneIdNum < 1 || milestoneIdNum > 5) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid milestoneId (must be 1-5)', 
          code: 'INVALID_MILESTONE_ID' 
        },
        { status: 400 }
      );
    }

    // Get TEE server URL from environment
    const TEE_URL = process.env.NEXT_PUBLIC_TEE_URL || 'http://localhost:3001';

    // Forward request to TEE server
    const teeResponse = await fetch(`${TEE_URL}/contract/record-milestone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        sessionId, 
        milestoneId: milestoneIdNum 
      }),
    });

    const result = await teeResponse.json();

    // Return the response from TEE server
    return NextResponse.json(result, { 
      status: teeResponse.status 
    });
  } catch (error) {
    console.error('API /contract/record-milestone error:', error);
    
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

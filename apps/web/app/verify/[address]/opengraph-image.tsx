import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export default async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  const { searchParams } = new URL(request.url);
  const skill = searchParams.get('skill') || 'Unknown Skill';
  const score = searchParams.get('score') || '0';
  const address = params.address;
  const truncatedAddress = `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #7c3aed 100%)',
          padding: '60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '32px',
          }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#a78bfa',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}
          >
            VERIFIED SKILL CREDENTIAL
          </div>

          <div
            style={{
              fontSize: '64px',
              fontWeight: '800',
              color: '#ffffff',
              textAlign: 'center',
              lineHeight: '1.1',
            }}
          >
            {score}
            <span style={{ fontSize: '32px', color: '#a78bfa' }}>/100</span>
          </div>

          <div
            style={{
              fontSize: '24px',
              fontWeight: '500',
              color: '#e2e8f0',
              textAlign: 'center',
              textTransform: 'capitalize',
            }}
          >
            {skill}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '16px',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
              }}
            />
            <div
              style={{
                fontSize: '14px',
                color: '#94a3b8',
              }}
            >
              {truncatedAddress}
            </div>
          </div>

          <div
            style={{
              marginTop: '24px',
              padding: '12px 24px',
              backgroundColor: 'rgba(124, 58, 237, 0.2)',
              border: '2px solid #7c3aed',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#c4b5fd',
            }}
          >
            RTFM-Sovereign
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { companyToDomain, LOGO_SOURCES } from '@/lib/logoFetcher';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const company = searchParams.get('company');

  if (!company) {
    return NextResponse.json({ error: 'Company parameter required' }, { status: 400 });
  }

  const domain = companyToDomain(company);

  // Try each logo source until we find one that works
  for (const source of LOGO_SOURCES) {
    try {
      const logoUrl = source.getUrl(domain);
      const response = await fetch(logoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LogoFetcher/1.0)',
        },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');

        // Check if it's actually an image
        if (contentType && contentType.startsWith('image/')) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Check if the image has reasonable size (not a tiny placeholder)
          if (buffer.length > 100) {
            return new NextResponse(buffer, {
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
                'X-Logo-Source': source.name,
                'X-Logo-Domain': domain,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching from ${source.name}:`, error);
      // Continue to next source
    }
  }

  // No logo found from any source
  return NextResponse.json(
    {
      error: 'Logo not found',
      domain,
      triedSources: LOGO_SOURCES.map(s => s.name),
    },
    { status: 404 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const { companies } = await request.json();

    if (!Array.isArray(companies)) {
      return NextResponse.json({ error: 'Companies must be an array' }, { status: 400 });
    }

    const results = await Promise.all(
      companies.map(async (company: string) => {
        const domain = companyToDomain(company);

        for (const source of LOGO_SOURCES) {
          try {
            const logoUrl = source.getUrl(domain);
            const response = await fetch(logoUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; LogoFetcher/1.0)',
              },
            });

            if (response.ok) {
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.startsWith('image/')) {
                return {
                  company,
                  domain,
                  success: true,
                  source: source.name,
                };
              }
            }
          } catch {
            // Continue to next source
          }
        }

        return {
          company,
          domain,
          success: false,
        };
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error processing companies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { companyToDomain, LOGO_SOURCES, FALLBACK_SOURCES, LogoSource } from '@/lib/logoFetcher';

async function tryFetchLogo(source: LogoSource, domain: string): Promise<{ arrayBuffer: ArrayBuffer; contentType: string; size: number } | null> {
  try {
    const logoUrl = source.getUrl(domain);
    const response = await fetch(logoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*',
      },
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type');

    // Check if it's actually an image
    if (!contentType || !contentType.startsWith('image/')) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();

    // Check minimum size to filter out tiny icons/placeholders
    const minSize = source.minSize || 100;
    if (arrayBuffer.byteLength < minSize) {
      return null;
    }

    return { arrayBuffer, contentType, size: arrayBuffer.byteLength };
  } catch (error) {
    console.error(`Error fetching from ${source.name}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const company = searchParams.get('company');
  const includeFallback = searchParams.get('fallback') !== 'false';

  if (!company) {
    return NextResponse.json({ error: 'Company parameter required' }, { status: 400 });
  }

  const domain = companyToDomain(company);

  // First, try all primary logo sources (these provide full logos)
  for (const source of LOGO_SOURCES) {
    const result = await tryFetchLogo(source, domain);
    if (result) {
      return new Response(result.arrayBuffer, {
        headers: {
          'Content-Type': result.contentType,
          'Cache-Control': 'public, max-age=86400',
          'X-Logo-Source': source.name,
          'X-Logo-Domain': domain,
          'X-Logo-Type': 'full',
        },
      });
    }
  }

  // If no full logo found and fallback is enabled, try fallback sources (icons/favicons)
  if (includeFallback) {
    for (const source of FALLBACK_SOURCES) {
      const result = await tryFetchLogo(source, domain);
      if (result) {
        return new Response(result.arrayBuffer, {
          headers: {
            'Content-Type': result.contentType,
            'Cache-Control': 'public, max-age=86400',
            'X-Logo-Source': source.name,
            'X-Logo-Domain': domain,
            'X-Logo-Type': 'icon',
          },
        });
      }
    }
  }

  // No logo found from any source
  return NextResponse.json(
    {
      error: 'Logo not found',
      domain,
      triedSources: [...LOGO_SOURCES, ...(includeFallback ? FALLBACK_SOURCES : [])].map(s => s.name),
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

        // Try primary sources first
        for (const source of LOGO_SOURCES) {
          const result = await tryFetchLogo(source, domain);
          if (result) {
            return {
              company,
              domain,
              success: true,
              source: source.name,
              type: 'full',
            };
          }
        }

        // Try fallback sources
        for (const source of FALLBACK_SOURCES) {
          const result = await tryFetchLogo(source, domain);
          if (result) {
            return {
              company,
              domain,
              success: true,
              source: source.name,
              type: 'icon',
            };
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

import { NextRequest, NextResponse } from 'next/server';
import { companyToDomain } from '@/lib/logoFetcher';

// Logo sources in order of preference
const LOGO_SOURCES = [
  {
    name: 'Clearbit',
    getUrl: (domain: string) => `https://logo.clearbit.com/${domain}`,
  },
  {
    name: 'Uplead',
    getUrl: (domain: string) => `https://logo.uplead.com/${domain}`,
  },
  {
    name: 'Google Favicon',
    getUrl: (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
  },
  {
    name: 'DuckDuckGo',
    getUrl: (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  },
  {
    name: 'Favicon Kit',
    getUrl: (domain: string) => `https://api.faviconkit.com/${domain}/256`,
  },
];

async function fetchFromSource(sourceIndex: number, domain: string): Promise<{ arrayBuffer: ArrayBuffer; contentType: string; source: string } | null> {
  if (sourceIndex >= LOGO_SOURCES.length) {
    return null;
  }

  const source = LOGO_SOURCES[sourceIndex];

  try {
    const logoUrl = source.getUrl(domain);
    const response = await fetch(logoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();

    // Minimum size check - at least 1KB
    if (arrayBuffer.byteLength < 1000) {
      return null;
    }

    return { arrayBuffer, contentType, source: source.name };
  } catch (error) {
    console.error(`Error fetching from ${source.name}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const company = searchParams.get('company');
  const sourceIndexParam = searchParams.get('source'); // 0, 1, 2... to try specific source

  if (!company) {
    return NextResponse.json({ error: 'Company parameter required' }, { status: 400 });
  }

  const domain = companyToDomain(company);
  const sourceIndex = sourceIndexParam ? parseInt(sourceIndexParam, 10) : 0;

  // If specific source requested, try just that one
  if (sourceIndexParam !== null) {
    const result = await fetchFromSource(sourceIndex, domain);
    if (result) {
      return new Response(result.arrayBuffer, {
        headers: {
          'Content-Type': result.contentType,
          'Cache-Control': 'public, max-age=86400',
          'X-Logo-Source': result.source,
          'X-Logo-Domain': domain,
          'X-Source-Index': sourceIndex.toString(),
          'X-Total-Sources': LOGO_SOURCES.length.toString(),
        },
      });
    }
    return NextResponse.json(
      { error: 'Logo not found from this source', domain, company, sourceIndex },
      { status: 404 }
    );
  }

  // Try all sources in order
  for (let i = 0; i < LOGO_SOURCES.length; i++) {
    const result = await fetchFromSource(i, domain);
    if (result) {
      return new Response(result.arrayBuffer, {
        headers: {
          'Content-Type': result.contentType,
          'Cache-Control': 'public, max-age=86400',
          'X-Logo-Source': result.source,
          'X-Logo-Domain': domain,
          'X-Source-Index': i.toString(),
          'X-Total-Sources': LOGO_SOURCES.length.toString(),
        },
      });
    }
  }

  return NextResponse.json(
    { error: 'Logo not found', domain, company },
    { status: 404 }
  );
}

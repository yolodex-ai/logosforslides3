import { NextRequest, NextResponse } from 'next/server';
import { companyToDomain, companyToWikipediaTitle, ICON_SOURCES, LogoSource } from '@/lib/logoFetcher';

interface WikipediaResponse {
  query?: {
    pages?: {
      [key: string]: {
        thumbnail?: {
          source: string;
        };
        pageimage?: string;
      };
    };
  };
}

async function fetchWikipediaLogo(company: string): Promise<{ arrayBuffer: ArrayBuffer; contentType: string } | null> {
  try {
    const wikiTitle = companyToWikipediaTitle(company);

    // First, get the page image info from Wikipedia API
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiTitle)}&prop=pageimages&format=json&pithumbsize=800&origin=*`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'LogoFinder/1.0 (https://logosforslides.com; contact@example.com)',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data: WikipediaResponse = await response.json();

    if (!data.query?.pages) {
      return null;
    }

    // Get the first page result
    const pages = Object.values(data.query.pages);
    const page = pages[0];

    if (!page?.thumbnail?.source) {
      return null;
    }

    // Fetch the actual image
    const imageUrl = page.thumbnail.source;
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'LogoFinder/1.0 (https://logosforslides.com)',
      },
    });

    if (!imageResponse.ok) {
      return null;
    }

    const contentType = imageResponse.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return null;
    }

    const arrayBuffer = await imageResponse.arrayBuffer();

    // Minimum size check - Wikipedia logos should be substantial
    if (arrayBuffer.byteLength < 1000) {
      return null;
    }

    return { arrayBuffer, contentType };
  } catch (error) {
    console.error('Error fetching Wikipedia logo:', error);
    return null;
  }
}

async function tryFetchIcon(source: LogoSource, domain: string): Promise<{ arrayBuffer: ArrayBuffer; contentType: string } | null> {
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
    const minSize = source.minSize || 100;
    if (arrayBuffer.byteLength < minSize) {
      return null;
    }

    return { arrayBuffer, contentType };
  } catch (error) {
    console.error(`Error fetching from ${source.name}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const company = searchParams.get('company');
  const preferIcon = searchParams.get('icon') === 'true';

  if (!company) {
    return NextResponse.json({ error: 'Company parameter required' }, { status: 400 });
  }

  const domain = companyToDomain(company);

  // If not preferring icons, try Wikipedia first for full wordmark logos
  if (!preferIcon) {
    const wikiResult = await fetchWikipediaLogo(company);
    if (wikiResult) {
      return new Response(wikiResult.arrayBuffer, {
        headers: {
          'Content-Type': wikiResult.contentType,
          'Cache-Control': 'public, max-age=86400',
          'X-Logo-Source': 'Wikipedia',
          'X-Logo-Domain': domain,
          'X-Logo-Type': 'wordmark',
        },
      });
    }
  }

  // Fall back to icon sources
  for (const source of ICON_SOURCES) {
    const result = await tryFetchIcon(source, domain);
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

  return NextResponse.json(
    {
      error: 'Logo not found',
      domain,
      company,
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

        // Try Wikipedia first
        const wikiResult = await fetchWikipediaLogo(company);
        if (wikiResult) {
          return {
            company,
            domain,
            success: true,
            source: 'Wikipedia',
            type: 'wordmark',
          };
        }

        // Try icon sources
        for (const source of ICON_SOURCES) {
          const result = await tryFetchIcon(source, domain);
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

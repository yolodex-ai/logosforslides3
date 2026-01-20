import { NextRequest, NextResponse } from 'next/server';
import { companyToDomain } from '@/lib/logoFetcher';

// Fetch logo directly from company website by parsing HTML
async function fetchFromWebsite(domain: string): Promise<{ arrayBuffer: ArrayBuffer; contentType: string; source: string } | null> {
  try {
    // Fetch the website HTML
    const response = await fetch(`https://${domain}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const baseUrl = `https://${domain}`;

    // Look for logo URLs in order of preference
    const logoUrls: string[] = [];

    // 1. Open Graph image (often the logo)
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogImageMatch) {
      logoUrls.push(ogImageMatch[1]);
    }

    // 2. Apple touch icon (usually high quality)
    const appleTouchMatch = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i) ||
                            html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i);
    if (appleTouchMatch) {
      logoUrls.push(appleTouchMatch[1]);
    }

    // 3. Look for img tags with "logo" in class, id, alt, or src
    const logoImgMatches = html.matchAll(/<img[^>]*(?:class|id|alt|src)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/gi);
    for (const match of logoImgMatches) {
      logoUrls.push(match[1]);
    }
    // Also match when src comes before the logo attribute
    const logoImgMatches2 = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*(?:class|id|alt)=["'][^"']*logo[^"']*["']/gi);
    for (const match of logoImgMatches2) {
      logoUrls.push(match[1]);
    }

    // 4. Large favicon
    const iconMatch = html.match(/<link[^>]*rel=["']icon["'][^>]*href=["']([^"']+)["']/i);
    if (iconMatch) {
      logoUrls.push(iconMatch[1]);
    }

    // Try each URL until we find a valid image
    for (const logoUrl of logoUrls) {
      try {
        // Resolve relative URLs
        let fullUrl = logoUrl;
        if (logoUrl.startsWith('//')) {
          fullUrl = 'https:' + logoUrl;
        } else if (logoUrl.startsWith('/')) {
          fullUrl = baseUrl + logoUrl;
        } else if (!logoUrl.startsWith('http')) {
          fullUrl = baseUrl + '/' + logoUrl;
        }

        const imgResponse = await fetch(fullUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'image/*',
          },
        });

        if (!imgResponse.ok) continue;

        const contentType = imgResponse.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) continue;

        const arrayBuffer = await imgResponse.arrayBuffer();
        if (arrayBuffer.byteLength < 500) continue;

        return { arrayBuffer, contentType, source: 'Website' };
      } catch {
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching from website:', error);
    return null;
  }
}

// Logo API sources as fallback
const LOGO_SOURCES = [
  {
    name: 'Clearbit',
    getUrl: (domain: string) => `https://logo.clearbit.com/${domain}`,
  },
  {
    name: 'Google Favicon',
    getUrl: (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
  },
];

async function fetchFromSource(sourceIndex: number, domain: string): Promise<{ arrayBuffer: ArrayBuffer; contentType: string; source: string } | null> {
  // Source 0 = Website scraping
  if (sourceIndex === 0) {
    return await fetchFromWebsite(domain);
  }

  // Sources 1+ = Logo APIs
  const apiIndex = sourceIndex - 1;
  if (apiIndex >= LOGO_SOURCES.length) {
    return null;
  }

  const source = LOGO_SOURCES[apiIndex];

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

// Total number of sources (1 website + N APIs)
const TOTAL_SOURCES = 1 + LOGO_SOURCES.length;

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
          'X-Total-Sources': TOTAL_SOURCES.toString(),
        },
      });
    }
    return NextResponse.json(
      { error: 'Logo not found from this source', domain, company, sourceIndex },
      { status: 404 }
    );
  }

  // Try all sources in order (website first, then APIs)
  for (let i = 0; i < TOTAL_SOURCES; i++) {
    const result = await fetchFromSource(i, domain);
    if (result) {
      return new Response(result.arrayBuffer, {
        headers: {
          'Content-Type': result.contentType,
          'Cache-Control': 'public, max-age=86400',
          'X-Logo-Source': result.source,
          'X-Logo-Domain': domain,
          'X-Source-Index': i.toString(),
          'X-Total-Sources': TOTAL_SOURCES.toString(),
        },
      });
    }
  }

  return NextResponse.json(
    { error: 'Logo not found', domain, company },
    { status: 404 }
  );
}

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

// Fetch logo from Wikipedia by searching article images
async function fetchFromWikipedia(company: string): Promise<{ arrayBuffer: ArrayBuffer; contentType: string; source: string } | null> {
  try {
    // Convert company name to Wikipedia title format
    const wikiTitle = company.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');

    // Also try with common suffixes
    const titlesToTry = [
      wikiTitle,
      `${wikiTitle}_(company)`,
      `${wikiTitle},_Inc.`,
      `${wikiTitle}_&_Company`,
      `${wikiTitle}_%26_Company`,
      wikiTitle.replace(/&/g, '%26'),
      `${wikiTitle.replace(/&/g, '%26')}_Company`,
      `${wikiTitle}_Corporation`,
      `${wikiTitle}_Inc.`,
    ];

    for (const title of titlesToTry) {
      // Get all images from the Wikipedia article
      const imagesUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=images&format=json&origin=*`;
      const imagesResponse = await fetch(imagesUrl, {
        headers: { 'User-Agent': 'LogoFinder/1.0' },
      });

      if (!imagesResponse.ok) continue;
      const imagesData = await imagesResponse.json();

      const pages = Object.values(imagesData.query?.pages || {}) as Array<{ images?: Array<{ title: string }> }>;
      const page = pages[0];
      if (!page?.images) continue;

      // Find logo files - look for files containing company name or "logo"
      const companyLower = company.toLowerCase().replace(/[^a-z0-9]/g, '');
      const logoFile = page.images.find((img: { title: string }) => {
        const imgTitle = img.title.toLowerCase();
        const titleClean = imgTitle.replace(/[^a-z0-9]/g, '');

        // Must be an image file
        if (!(imgTitle.endsWith('.svg') || imgTitle.endsWith('.png') || imgTitle.endsWith('.jpg'))) return false;

        // Skip generic Wikipedia files
        if (imgTitle.includes('commons-logo') || imgTitle.includes('flag_of') || imgTitle.includes('ojs_ui')) return false;

        // Prefer files with company name AND (logo or mark or wordmark)
        if (titleClean.includes(companyLower) && (imgTitle.includes('logo') || imgTitle.includes('mark') || imgTitle.includes('wordmark'))) {
          return true;
        }

        return false;
      });

      if (!logoFile) continue;

      // Get the image URL
      const imageInfoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(logoFile.title)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
      const imageInfoResponse = await fetch(imageInfoUrl, {
        headers: { 'User-Agent': 'LogoFinder/1.0' },
      });

      if (!imageInfoResponse.ok) continue;
      const imageInfoData = await imageInfoResponse.json();

      const imagePages = Object.values(imageInfoData.query?.pages || {}) as Array<{ imageinfo?: Array<{ url: string }> }>;
      const imagePage = imagePages[0];
      if (!imagePage?.imageinfo?.[0]?.url) continue;

      let imageUrl = imagePage.imageinfo[0].url;

      // For SVGs, get a PNG thumbnail
      if (imageUrl.endsWith('.svg')) {
        const urlMatch = imageUrl.match(/\/wikipedia\/commons\/([a-f0-9])\/([a-f0-9]{2})\/(.+\.svg)$/i);
        if (urlMatch) {
          const [, hash1, hash2, filename] = urlMatch;
          imageUrl = `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash1}/${hash2}/${filename}/400px-${filename}.png`;
        }
      }

      // Fetch the image
      const imgResponse = await fetch(imageUrl, {
        headers: { 'User-Agent': 'LogoFinder/1.0' },
      });

      if (!imgResponse.ok) continue;

      const contentType = imgResponse.headers.get('content-type') || 'image/png';
      const arrayBuffer = await imgResponse.arrayBuffer();

      if (arrayBuffer.byteLength < 500) continue;

      return { arrayBuffer, contentType, source: 'Wikipedia' };
    }

    return null;
  } catch (error) {
    console.error('Error fetching from Wikipedia:', error);
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

async function fetchFromSource(sourceIndex: number, domain: string, company: string): Promise<{ arrayBuffer: ArrayBuffer; contentType: string; source: string } | null> {
  // Source 0 = Website scraping
  if (sourceIndex === 0) {
    return await fetchFromWebsite(domain);
  }

  // Source 1 = Wikipedia
  if (sourceIndex === 1) {
    return await fetchFromWikipedia(company);
  }

  // Sources 2+ = Logo APIs
  const apiIndex = sourceIndex - 2;
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

// Total number of sources (1 website + 1 wikipedia + N APIs)
const TOTAL_SOURCES = 2 + LOGO_SOURCES.length;

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
    const result = await fetchFromSource(sourceIndex, domain, company);
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

  // Try all sources in order (website first, then Wikipedia, then APIs)
  for (let i = 0; i < TOTAL_SOURCES; i++) {
    const result = await fetchFromSource(i, domain, company);
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

import { NextRequest, NextResponse } from 'next/server';
import { companyToDomain, companyToWikipediaTitle, ICON_SOURCES, LogoSource } from '@/lib/logoFetcher';

interface WikipediaImagesResponse {
  query?: {
    pages?: {
      [key: string]: {
        images?: Array<{
          title: string;
        }>;
      };
    };
  };
}

interface WikimediaImageInfoResponse {
  query?: {
    pages?: {
      [key: string]: {
        imageinfo?: Array<{
          url: string;
          mime: string;
        }>;
      };
    };
  };
}

async function fetchWikipediaLogo(company: string): Promise<{ arrayBuffer: ArrayBuffer; contentType: string } | null> {
  try {
    const wikiTitle = companyToWikipediaTitle(company);

    // Step 1: Get all images from the Wikipedia article
    const imagesApiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiTitle)}&prop=images&format=json&origin=*`;

    const imagesResponse = await fetch(imagesApiUrl, {
      headers: {
        'User-Agent': 'LogoFinder/1.0 (https://logosforslides.com; contact@example.com)',
      },
    });

    if (!imagesResponse.ok) {
      return null;
    }

    const imagesData: WikipediaImagesResponse = await imagesResponse.json();

    if (!imagesData.query?.pages) {
      return null;
    }

    const pages = Object.values(imagesData.query.pages);
    const page = pages[0];

    if (!page?.images || page.images.length === 0) {
      return null;
    }

    // Step 2: Find a logo file - prioritize files with "logo" in the name
    const logoFile = page.images.find(img => {
      const title = img.title.toLowerCase();
      return title.includes('logo') &&
             !title.includes('commons-logo') &&
             !title.includes('wiki') &&
             (title.endsWith('.svg') || title.endsWith('.png') || title.endsWith('.jpg'));
    });

    if (!logoFile) {
      // No logo file found, fall back to pageimages API but be more careful
      return await fetchWikipediaPageImage(wikiTitle);
    }

    // Step 3: Get the actual image URL from Wikimedia Commons
    const fileTitle = logoFile.title;
    const imageInfoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;

    const imageInfoResponse = await fetch(imageInfoUrl, {
      headers: {
        'User-Agent': 'LogoFinder/1.0 (https://logosforslides.com)',
      },
    });

    if (!imageInfoResponse.ok) {
      return null;
    }

    const imageInfoData: WikimediaImageInfoResponse = await imageInfoResponse.json();

    if (!imageInfoData.query?.pages) {
      return null;
    }

    const imagePages = Object.values(imageInfoData.query.pages);
    const imagePage = imagePages[0];

    if (!imagePage?.imageinfo || imagePage.imageinfo.length === 0) {
      return null;
    }

    const imageInfo = imagePage.imageinfo[0];
    let imageUrl = imageInfo.url;

    // For SVGs, get a PNG render at a good size
    if (imageUrl.endsWith('.svg')) {
      // Convert to PNG render URL with specific width
      const filename = fileTitle.replace('File:', '');
      const hash = filename.replace(/ /g, '_');
      const md5 = await getMd5Prefix(hash);
      imageUrl = `https://upload.wikimedia.org/wikipedia/commons/thumb/${md5}/${encodeURIComponent(hash)}/800px-${encodeURIComponent(hash)}.png`;
    }

    // Step 4: Fetch the actual image
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'LogoFinder/1.0 (https://logosforslides.com)',
      },
    });

    if (!imageResponse.ok) {
      // Try without the thumbnail path for SVGs
      if (imageInfo.url.endsWith('.svg')) {
        const directResponse = await fetch(imageInfo.url, {
          headers: {
            'User-Agent': 'LogoFinder/1.0 (https://logosforslides.com)',
          },
        });
        if (directResponse.ok) {
          const arrayBuffer = await directResponse.arrayBuffer();
          return { arrayBuffer, contentType: 'image/svg+xml' };
        }
      }
      return null;
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const arrayBuffer = await imageResponse.arrayBuffer();

    if (arrayBuffer.byteLength < 500) {
      return null;
    }

    return { arrayBuffer, contentType };
  } catch (error) {
    console.error('Error fetching Wikipedia logo:', error);
    return null;
  }
}

// Simple hash calculation for Wikimedia URLs
async function getMd5Prefix(filename: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(filename);
  const hashBuffer = await crypto.subtle.digest('MD5', data).catch(() => null);

  if (!hashBuffer) {
    // Fallback: use first two chars of filename
    const clean = filename.replace(/[^a-zA-Z0-9]/g, '');
    return `${clean[0]?.toLowerCase() || 'a'}/${clean.slice(0, 2).toLowerCase() || 'aa'}`;
  }

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hashHex[0]}/${hashHex.slice(0, 2)}`;
}

// Fallback to pageimages API (but filter out building photos)
async function fetchWikipediaPageImage(wikiTitle: string): Promise<{ arrayBuffer: ArrayBuffer; contentType: string } | null> {
  try {
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiTitle)}&prop=pageimages&format=json&pithumbsize=800&piprop=thumbnail|name&origin=*`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'LogoFinder/1.0 (https://logosforslides.com)',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.query?.pages) {
      return null;
    }

    const pages = Object.values(data.query.pages) as Array<{ thumbnail?: { source: string }; pageimage?: string }>;
    const page = pages[0];

    if (!page?.thumbnail?.source || !page?.pageimage) {
      return null;
    }

    // Skip if it looks like a building/headquarters photo
    const imageName = page.pageimage.toLowerCase();
    if (imageName.includes('hq') ||
        imageName.includes('headquarters') ||
        imageName.includes('building') ||
        imageName.includes('office') ||
        imageName.includes('campus')) {
      return null;
    }

    const imageResponse = await fetch(page.thumbnail.source, {
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

    if (arrayBuffer.byteLength < 1000) {
      return null;
    }

    return { arrayBuffer, contentType };
  } catch (error) {
    console.error('Error fetching Wikipedia page image:', error);
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

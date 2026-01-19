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
    // Also try to match company name in filename for better accuracy
    const companyLower = company.toLowerCase().replace(/[^a-z0-9]/g, '');

    const logoFile = page.images.find(img => {
      const title = img.title.toLowerCase();
      const titleClean = title.replace(/[^a-z0-9]/g, '');

      // Must contain "logo" and be an image file
      if (!title.includes('logo')) return false;
      if (!(title.endsWith('.svg') || title.endsWith('.png') || title.endsWith('.jpg'))) return false;

      // Exclude generic/unrelated logos
      if (title.includes('commons-logo')) return false;
      if (title.includes('wiki')) return false;
      if (title.includes('foodlogo')) return false;
      if (title.includes('icon')) return false;
      if (title.includes('p-logo')) return false;
      if (title.includes('symbol')) return false;

      // Prefer files that contain the company name
      if (titleClean.includes(companyLower)) return true;

      // Accept other logo files as fallback
      return true;
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
      // Extract the path from the original URL and construct thumbnail URL
      // Original: https://upload.wikimedia.org/wikipedia/commons/b/ba/TransUnion_logo.svg
      // Thumbnail: https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/TransUnion_logo.svg/800px-TransUnion_logo.svg.png
      const urlMatch = imageUrl.match(/\/wikipedia\/commons\/([a-f0-9])\/([a-f0-9]{2})\/(.+\.svg)$/i);
      if (urlMatch) {
        const [, hash1, hash2, filename] = urlMatch;
        imageUrl = `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash1}/${hash2}/${filename}/800px-${filename}.png`;
      }
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

// Check if a domain actually exists and returns a valid response
async function checkDomainExists(domain: string): Promise<boolean> {
  try {
    const response = await fetch(`https://${domain}`, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      redirect: 'follow',
    });
    // Accept 2xx and 3xx status codes
    return response.status >= 200 && response.status < 400;
  } catch {
    // Try http as fallback
    try {
      const response = await fetch(`http://${domain}`, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        redirect: 'follow',
      });
      return response.status >= 200 && response.status < 400;
    } catch {
      return false;
    }
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

    // Require larger minimum size for icon sources to avoid blurry images
    const minSize = source.minSize || 2000; // At least 2KB for decent quality
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

  // Check if domain exists before trying icon sources (avoids garbage results)
  const domainExists = await checkDomainExists(domain);

  if (domainExists) {
    // Fall back to icon sources only if domain exists
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
  }

  return NextResponse.json(
    {
      error: 'Logo not found',
      domain,
      company,
      domainExists,
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

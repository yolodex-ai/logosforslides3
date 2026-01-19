// Domain mapping for common company names
const KNOWN_DOMAINS: Record<string, string> = {
  'apple': 'apple.com',
  'google': 'google.com',
  'microsoft': 'microsoft.com',
  'amazon': 'amazon.com',
  'facebook': 'facebook.com',
  'meta': 'meta.com',
  'netflix': 'netflix.com',
  'twitter': 'twitter.com',
  'x': 'x.com',
  'instagram': 'instagram.com',
  'linkedin': 'linkedin.com',
  'spotify': 'spotify.com',
  'uber': 'uber.com',
  'airbnb': 'airbnb.com',
  'nike': 'nike.com',
  'adidas': 'adidas.com',
  'coca-cola': 'coca-cola.com',
  'cocacola': 'coca-cola.com',
  'coke': 'coca-cola.com',
  'pepsi': 'pepsi.com',
  'pepsico': 'pepsico.com',
  'mcdonald\'s': 'mcdonalds.com',
  'mcdonalds': 'mcdonalds.com',
  'starbucks': 'starbucks.com',
  'walmart': 'walmart.com',
  'target': 'target.com',
  'costco': 'costco.com',
  'tesla': 'tesla.com',
  'ford': 'ford.com',
  'toyota': 'toyota.com',
  'honda': 'honda.com',
  'bmw': 'bmw.com',
  'mercedes': 'mercedes-benz.com',
  'mercedes-benz': 'mercedes-benz.com',
  'disney': 'disney.com',
  'hbo': 'hbo.com',
  'youtube': 'youtube.com',
  'tiktok': 'tiktok.com',
  'snapchat': 'snapchat.com',
  'reddit': 'reddit.com',
  'twitch': 'twitch.tv',
  'slack': 'slack.com',
  'zoom': 'zoom.us',
  'dropbox': 'dropbox.com',
  'stripe': 'stripe.com',
  'paypal': 'paypal.com',
  'square': 'squareup.com',
  'shopify': 'shopify.com',
  'salesforce': 'salesforce.com',
  'oracle': 'oracle.com',
  'ibm': 'ibm.com',
  'intel': 'intel.com',
  'amd': 'amd.com',
  'nvidia': 'nvidia.com',
  'samsung': 'samsung.com',
  'sony': 'sony.com',
  'lg': 'lg.com',
  'dell': 'dell.com',
  'hp': 'hp.com',
  'lenovo': 'lenovo.com',
  'cisco': 'cisco.com',
  'adobe': 'adobe.com',
  'atlassian': 'atlassian.com',
  'github': 'github.com',
  'gitlab': 'gitlab.com',
  'notion': 'notion.so',
  'figma': 'figma.com',
  'canva': 'canva.com',
  'openai': 'openai.com',
  'anthropic': 'anthropic.com',
  'vercel': 'vercel.com',
  'heroku': 'heroku.com',
  'aws': 'aws.amazon.com',
  'google cloud': 'cloud.google.com',
  'azure': 'azure.microsoft.com',
  'digitalocean': 'digitalocean.com',
};

export function companyToDomain(company: string): string {
  const normalized = company.toLowerCase().trim();

  // Check known domains first
  if (KNOWN_DOMAINS[normalized]) {
    return KNOWN_DOMAINS[normalized];
  }

  // Check if it already looks like a domain
  if (normalized.includes('.')) {
    return normalized;
  }

  // Convert company name to likely domain
  const cleaned = normalized
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '')            // Remove spaces
    .replace(/-+/g, '');            // Remove hyphens

  return `${cleaned}.com`;
}

export interface LogoSource {
  name: string;
  getUrl: (domain: string) => string;
  minSize?: number; // Minimum file size in bytes to be considered a valid logo
}

// Logo sources that provide FULL LOGOS (not just favicons/icons)
export const LOGO_SOURCES: LogoSource[] = [
  {
    // Logo.dev - high quality logos, no API key needed for basic usage
    name: 'Logo.dev',
    getUrl: (domain) => `https://img.logo.dev/${domain}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ`,
    minSize: 1000, // Full logos should be at least 1KB
  },
  {
    // Clearbit Logo API - provides full company logos
    name: 'Clearbit',
    getUrl: (domain) => `https://logo.clearbit.com/${domain}`,
    minSize: 1000,
  },
  {
    // Brandfetch CDN - public endpoint for logos
    name: 'Brandfetch',
    getUrl: (domain) => `https://cdn.brandfetch.io/${domain}/w/512/h/512?c=1id_4fgnxR50000e`,
    minSize: 1000,
  },
  {
    // Uplead - another logo API
    name: 'Uplead',
    getUrl: (domain) => `https://logo.uplead.com/${domain}`,
    minSize: 1000,
  },
];

// Fallback sources (these return icons/favicons - only use if no full logo found)
export const FALLBACK_SOURCES: LogoSource[] = [
  {
    name: 'Google Favicon (HD)',
    getUrl: (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
    minSize: 100,
  },
  {
    name: 'DuckDuckGo',
    getUrl: (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    minSize: 100,
  },
];

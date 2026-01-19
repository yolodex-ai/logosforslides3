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

// Wikipedia article titles for companies (for fetching full wordmark logos)
const WIKIPEDIA_TITLES: Record<string, string> = {
  'apple': 'Apple_Inc.',
  'google': 'Google',
  'microsoft': 'Microsoft',
  'amazon': 'Amazon_(company)',
  'facebook': 'Facebook',
  'meta': 'Meta_Platforms',
  'netflix': 'Netflix',
  'twitter': 'Twitter',
  'x': 'X_(social_network)',
  'instagram': 'Instagram',
  'linkedin': 'LinkedIn',
  'spotify': 'Spotify',
  'uber': 'Uber',
  'airbnb': 'Airbnb',
  'nike': 'Nike,_Inc.',
  'adidas': 'Adidas',
  'coca-cola': 'Coca-Cola',
  'cocacola': 'Coca-Cola',
  'coke': 'Coca-Cola',
  'transunion': 'TransUnion',
  'equifax': 'Equifax',
  'experian': 'Experian',
  'pepsi': 'Pepsi',
  'pepsico': 'PepsiCo',
  'mcdonalds': 'McDonald%27s',
  'mcdonald\'s': 'McDonald%27s',
  'starbucks': 'Starbucks',
  'walmart': 'Walmart',
  'target': 'Target_Corporation',
  'costco': 'Costco',
  'tesla': 'Tesla,_Inc.',
  'ford': 'Ford_Motor_Company',
  'toyota': 'Toyota',
  'honda': 'Honda',
  'bmw': 'BMW',
  'mercedes': 'Mercedes-Benz',
  'mercedes-benz': 'Mercedes-Benz',
  'disney': 'The_Walt_Disney_Company',
  'hbo': 'HBO',
  'youtube': 'YouTube',
  'tiktok': 'TikTok',
  'snapchat': 'Snapchat',
  'reddit': 'Reddit',
  'twitch': 'Twitch_(service)',
  'slack': 'Slack_(software)',
  'zoom': 'Zoom_Video_Communications',
  'dropbox': 'Dropbox',
  'stripe': 'Stripe,_Inc.',
  'paypal': 'PayPal',
  'shopify': 'Shopify',
  'salesforce': 'Salesforce',
  'oracle': 'Oracle_Corporation',
  'ibm': 'IBM',
  'intel': 'Intel',
  'amd': 'AMD',
  'nvidia': 'Nvidia',
  'samsung': 'Samsung',
  'sony': 'Sony',
  'lg': 'LG_Corporation',
  'dell': 'Dell',
  'hp': 'HP_Inc.',
  'lenovo': 'Lenovo',
  'cisco': 'Cisco',
  'adobe': 'Adobe_Inc.',
  'atlassian': 'Atlassian',
  'github': 'GitHub',
  'gitlab': 'GitLab',
  'notion': 'Notion_(productivity_software)',
  'figma': 'Figma',
  'canva': 'Canva',
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'vercel': 'Vercel',
  'digitalocean': 'DigitalOcean',
  // Retail & Consumer
  'tesco': 'Tesco',
  'ikea': 'IKEA',
  'tiffany': 'Tiffany_%26_Co.',
  'rolex': 'Rolex',
  'gucci': 'Gucci',
  'prada': 'Prada',
  'lvmh': 'LVMH',
  'hermes': 'Hermès',
  'burberry': 'Burberry',
  'zara': 'Zara',
  'h&m': 'H%26M',
  'uniqlo': 'Uniqlo',
  // Consulting
  'mckinsey': 'McKinsey_%26_Company',
  'bcg': 'Boston_Consulting_Group',
  'bain': 'Bain_%26_Company',
  'deloitte': 'Deloitte',
  'pwc': 'PricewaterhouseCoopers',
  'ey': 'Ernst_%26_Young',
  'kpmg': 'KPMG',
  'accenture': 'Accenture',
  'roland berger': 'Roland_Berger',
  // Tech
  'perplexity': 'Perplexity_AI',
  'perplexity ai': 'Perplexity_AI',
  'mistral': 'Mistral_AI',
  'cohere': 'Cohere',
};

export function companyToDomain(company: string): string {
  const normalized = company.toLowerCase().trim();

  if (KNOWN_DOMAINS[normalized]) {
    return KNOWN_DOMAINS[normalized];
  }

  if (normalized.includes('.')) {
    return normalized;
  }

  const cleaned = normalized
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '')
    .replace(/-+/g, '');

  return `${cleaned}.com`;
}

export function companyToWikipediaTitle(company: string): string {
  const normalized = company.toLowerCase().trim();

  if (WIKIPEDIA_TITLES[normalized]) {
    return WIKIPEDIA_TITLES[normalized];
  }

  // Convert company name to likely Wikipedia title format
  return company
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('_');
}

export interface LogoSource {
  name: string;
  getUrl: (domain: string) => string;
  minSize?: number;
}

// Fallback sources - used if Wikipedia doesn't have a logo
export const ICON_SOURCES: LogoSource[] = [
  {
    name: 'Clearbit',
    getUrl: (domain) => `https://logo.clearbit.com/${domain}`,
    minSize: 2000, // Require at least 2KB for decent quality
  },
  {
    name: 'Google Favicon HD',
    getUrl: (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
    minSize: 5000, // Only accept if it's a substantial image (>5KB means likely a real logo)
  },
];

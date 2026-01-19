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
  // Consulting
  'mckinsey': 'mckinsey.com',
  'mckinsey & company': 'mckinsey.com',
  'bcg': 'bcg.com',
  'boston consulting group': 'bcg.com',
  'bain': 'bain.com',
  'bain & company': 'bain.com',
  'deloitte': 'deloitte.com',
  'pwc': 'pwc.com',
  'pricewaterhousecoopers': 'pwc.com',
  'ey': 'ey.com',
  'ernst & young': 'ey.com',
  'kpmg': 'kpmg.com',
  'accenture': 'accenture.com',
  'roland berger': 'rolandberger.com',
  'oc&c': 'occstrategy.com',
  'oc&c strategy consultants': 'occstrategy.com',
  'oliver wyman': 'oliverwyman.com',
  'kearney': 'kearney.com',
  'booz allen': 'boozallen.com',
  'booz allen hamilton': 'boozallen.com',
  // Retail
  'tesco': 'tesco.com',
  'ikea': 'ikea.com',
  'tiffany': 'tiffany.com',
  'tiffany & co': 'tiffany.com',
  // AI
  'perplexity': 'perplexity.ai',
  'perplexity ai': 'perplexity.ai',
  'mistral': 'mistral.ai',
  'mistral ai': 'mistral.ai',
  'cohere': 'cohere.com',
  // Credit bureaus
  'transunion': 'transunion.com',
  'equifax': 'equifax.com',
  'experian': 'experian.com',
};

export function companyToDomain(company: string): string {
  const normalized = company.toLowerCase().trim();

  if (KNOWN_DOMAINS[normalized]) {
    return KNOWN_DOMAINS[normalized];
  }

  // If it already looks like a domain, return it
  if (normalized.includes('.')) {
    return normalized;
  }

  // Otherwise, guess the domain
  const cleaned = normalized
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '')
    .replace(/-+/g, '');

  return `${cleaned}.com`;
}

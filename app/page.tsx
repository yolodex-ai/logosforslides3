'use client';

import { useState, useCallback } from 'react';
import LogoInput from '@/components/LogoInput';
import LogoGrid, { LogoResult } from '@/components/LogoGrid';
import DownloadButton from '@/components/DownloadButton';
import { companyToDomain } from '@/lib/logoFetcher';
import { saveAs } from 'file-saver';

export default function Home() {
  const [logos, setLogos] = useState<LogoResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogo = async (company: string, index: number, sourceIndex?: number) => {
    const domain = companyToDomain(company);

    // Update status to loading
    setLogos(prev => prev.map((l, i) =>
      i === index ? { ...l, status: 'loading' as const } : l
    ));

    try {
      // Only pass source parameter if explicitly specified (for retry)
      const url = sourceIndex !== undefined
        ? `/api/fetch-logo?company=${encodeURIComponent(company)}&source=${sourceIndex}`
        : `/api/fetch-logo?company=${encodeURIComponent(company)}`;
      const response = await fetch(url);

      if (response.ok) {
        const blob = await response.blob();
        const logoUrl = URL.createObjectURL(blob);
        const currentSourceIndex = parseInt(response.headers.get('X-Source-Index') || '0', 10);

        setLogos(prev => prev.map((l, i) =>
          i === index ? { ...l, status: 'success' as const, logoUrl, blob, sourceIndex: currentSourceIndex } : l
        ));
      } else {
        setLogos(prev => prev.map((l, i) =>
          i === index ? { ...l, status: 'error' as const, sourceIndex } : l
        ));
      }
    } catch (error) {
      console.error(`Error fetching logo for ${company}:`, error);
      setLogos(prev => prev.map((l, i) =>
        i === index ? { ...l, status: 'error' as const, sourceIndex } : l
      ));
    }
  };

  const handleRetry = useCallback(async (index: number) => {
    const logo = logos[index];
    if (!logo) return;

    // Try next source (cycle through 0, 1, 2, 3, 4, 0, 1, 2...)
    const nextSourceIndex = ((logo.sourceIndex ?? 0) + 1) % 5;
    await fetchLogo(logo.company, index, nextSourceIndex);
  }, [logos]);

  const handleCompaniesSubmit = useCallback(async (companies: string[]) => {
    setIsLoading(true);

    // Initialize all logos as pending
    const initialLogos: LogoResult[] = companies.map(company => ({
      company,
      domain: companyToDomain(company),
      logoUrl: null,
      status: 'pending' as const,
    }));

    setLogos(initialLogos);

    // Fetch logos in batches to avoid overwhelming the server
    const batchSize = 5;
    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);
      await Promise.all(
        batch.map((company, batchIndex) => fetchLogo(company, i + batchIndex))
      );
    }

    setIsLoading(false);
  }, []);

  const handleDownloadSingle = useCallback((logo: LogoResult) => {
    if (logo.blob) {
      const extension = getFileExtension(logo.blob.type);
      const filename = `${sanitizeFilename(logo.company)}.${extension}`;
      saveAs(logo.blob, filename);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            Logo Finder
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            Find and download company logos in bulk. Enter company names and get high-quality logos ready for your slides.
          </p>
        </div>

        <LogoInput onCompaniesSubmit={handleCompaniesSubmit} isLoading={isLoading} />

        <LogoGrid logos={logos} onDownloadSingle={handleDownloadSingle} onRetry={handleRetry} />

        <DownloadButton logos={logos} />

        <footer className="mt-16 text-center text-sm text-zinc-400 dark:text-zinc-600">
          <p>Logos are fetched from public sources. Please respect trademark rights.</p>
        </footer>
      </main>
    </div>
  );
}

function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico',
  };
  return mimeToExt[mimeType] || 'png';
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

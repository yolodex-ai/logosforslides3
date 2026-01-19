'use client';

import Image from 'next/image';

export interface LogoResult {
  company: string;
  domain: string;
  logoUrl: string | null;
  status: 'pending' | 'loading' | 'success' | 'error';
  blob?: Blob;
}

interface LogoGridProps {
  logos: LogoResult[];
  onDownloadSingle: (logo: LogoResult) => void;
}

export default function LogoGrid({ logos, onDownloadSingle }: LogoGridProps) {
  if (logos.length === 0) {
    return null;
  }

  const successCount = logos.filter(l => l.status === 'success').length;
  const errorCount = logos.filter(l => l.status === 'error').length;
  const loadingCount = logos.filter(l => l.status === 'loading' || l.status === 'pending').length;

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Results
        </h2>
        <div className="flex items-center gap-4 text-sm">
          {loadingCount > 0 && (
            <span className="text-zinc-500 dark:text-zinc-400">
              {loadingCount} loading...
            </span>
          )}
          <span className="text-green-600 dark:text-green-400">
            {successCount} found
          </span>
          {errorCount > 0 && (
            <span className="text-red-600 dark:text-red-400">
              {errorCount} not found
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {logos.map((logo, index) => (
          <div
            key={`${logo.company}-${index}`}
            className={`relative p-4 rounded-xl border transition-all duration-200 ${
              logo.status === 'success'
                ? 'border-green-200 dark:border-green-900 bg-white dark:bg-zinc-900'
                : logo.status === 'error'
                ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'
            }`}
          >
            <div className="aspect-square flex items-center justify-center mb-2 bg-white dark:bg-zinc-800 rounded-lg overflow-hidden">
              {logo.status === 'loading' || logo.status === 'pending' ? (
                <svg className="animate-spin h-8 w-8 text-zinc-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : logo.status === 'success' && logo.logoUrl ? (
                <Image
                  src={logo.logoUrl}
                  alt={`${logo.company} logo`}
                  width={80}
                  height={80}
                  className="object-contain max-w-full max-h-full"
                  unoptimized
                />
              ) : (
                <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>

            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate text-center">
              {logo.company}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate text-center">
              {logo.domain}
            </p>

            {logo.status === 'success' && (
              <button
                onClick={() => onDownloadSingle(logo)}
                className="absolute top-2 right-2 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                title="Download logo"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            )}

            {logo.status === 'success' && (
              <div className="absolute top-2 left-2">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {logo.status === 'error' && (
              <div className="absolute top-2 left-2">
                <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

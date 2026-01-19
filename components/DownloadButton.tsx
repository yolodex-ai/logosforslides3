'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { LogoResult } from './LogoGrid';

interface DownloadButtonProps {
  logos: LogoResult[];
}

export default function DownloadButton({ logos }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const successfulLogos = logos.filter(l => l.status === 'success' && l.blob);

  const handleDownloadAll = async () => {
    if (successfulLogos.length === 0) return;

    setIsDownloading(true);
    try {
      const zip = new JSZip();

      for (const logo of successfulLogos) {
        if (logo.blob) {
          const extension = getFileExtension(logo.blob.type);
          const filename = `${sanitizeFilename(logo.company)}.${extension}`;
          zip.file(filename, logo.blob);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `logos-${Date.now()}.zip`);
    } catch (error) {
      console.error('Error creating ZIP:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (successfulLogos.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 flex justify-center">
      <button
        onClick={handleDownloadAll}
        disabled={isDownloading}
        className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg shadow-lg shadow-green-600/20"
      >
        {isDownloading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating ZIP...
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download All ({successfulLogos.length} logos)
          </>
        )}
      </button>
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

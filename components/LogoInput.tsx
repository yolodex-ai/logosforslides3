'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';

interface LogoInputProps {
  onCompaniesSubmit: (companies: string[]) => void;
  isLoading: boolean;
}

export default function LogoInput({ onCompaniesSubmit, isLoading }: LogoInputProps) {
  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCompanies = (text: string): string[] => {
    return text
      .split(/[\n,]/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
  };

  const handleSubmit = () => {
    const companies = parseCompanies(inputText);
    if (companies.length > 0) {
      onCompaniesSubmit(companies);
    }
  };

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    setInputText(prev => prev + (prev ? '\n' : '') + text);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      handleFileUpload(file);
    }
  };

  const companiesCount = parseCompanies(inputText).length;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
            : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter company names (one per line)&#10;&#10;Examples:&#10;Apple&#10;Google&#10;Microsoft&#10;Nike&#10;Coca-Cola"
          className="w-full h-64 p-4 bg-transparent resize-none focus:outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
          disabled={isLoading}
        />

        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Upload CSV/TXT
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {companiesCount} {companiesCount === 1 ? 'company' : 'companies'}
        </span>

        <button
          onClick={handleSubmit}
          disabled={isLoading || companiesCount === 0}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Finding Logos...
            </>
          ) : (
            'Find Logos'
          )}
        </button>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface HeaderProps {
  lastUpdated: string;
  isRefreshing: boolean;
  countdown: number;
  onRefresh: () => void;
}

export function Header({ lastUpdated, isRefreshing, countdown, onRefresh }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Portfolio Dashboard
          </h1>
          <p className="text-xs text-gray-500">
            Live prices from Yahoo Finance &bull; P/E &amp; Earnings from Google Finance
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-600">
          <div className="bg-gray-100 px-3 py-1.5 rounded text-gray-700">
            Auto-refresh in: <strong>{countdown}s</strong>
          </div>

          <div className="hidden sm:block text-gray-500">
            Updated: <span className="text-gray-800 font-medium">{lastUpdated || 'Loading...'}</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-medium disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

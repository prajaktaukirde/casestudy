'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { SummaryCards } from '@/components/SummaryCards';
import { PortfolioTable } from '@/components/PortfolioTable';
import { PortfolioData } from '@/lib/types';
import { AlertCircle, RefreshCw } from 'lucide-react';

const REFRESH_INTERVAL_SECONDS = 15;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/portfolio';

export default function DashboardPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(REFRESH_INTERVAL_SECONDS);

  const fetchPortfolio = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      setError(null);

      const res = await fetch(API_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);

      const json: PortfolioData = await res.json();
      setData(json);
      setCountdown(REFRESH_INTERVAL_SECONDS);
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Unable to connect to market feed';
      setError(message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchPortfolio();
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchPortfolio]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900">
      <Header
        lastUpdated={data?.lastUpdated || ''}
        isRefreshing={isRefreshing}
        countdown={countdown}
        onRefresh={() => fetchPortfolio(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-5">
        {error && (
          <div className="p-3 rounded bg-red-50 border border-red-200 flex items-center justify-between text-red-700 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>
                <strong>Notice:</strong> {error}. Showing last received quotes.
              </span>
            </div>
            <button
              onClick={() => fetchPortfolio(true)}
              className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded font-medium transition"
            >
              Retry
            </button>
          </div>
        )}

        {loading && !data ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            <p className="text-xs text-gray-500">Loading portfolio data...</p>
          </div>
        ) : data ? (
          <>
            <SummaryCards data={data} />
            <PortfolioTable sectors={data.sectors} stocks={data.stocks} />
          </>
        ) : null}
      </main>

      <footer className="border-t border-gray-200 bg-white py-3 text-center text-xs text-gray-400">
        Portfolio Dashboard &bull; Live Yahoo Finance &amp; Google Finance Feeds
      </footer>
    </div>
  );
}

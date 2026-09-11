'use client';

import React, { useState, useMemo } from 'react';
import { StockHolding, SectorSummary } from '@/lib/types';

interface PortfolioTableProps {
  sectors: SectorSummary[];
  stocks: StockHolding[];
}

export function PortfolioTable({ sectors, stocks }: PortfolioTableProps) {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [collapsed, setCollapsed] = useState<{ [key: string]: boolean }>({});

  const toggleSector = (name: string) => {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const filteredStocks = useMemo(() => {
    if (!search.trim()) return stocks;
    const q = search.toLowerCase();
    return stocks.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.symbol.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
    );
  }, [stocks, search]);

  const filteredSectors = useMemo(() => {
    if (!search.trim()) return sectors;
    const q = search.toLowerCase();
    return sectors
      .map((sec) => {
        const matching = sec.stocks.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.symbol.toLowerCase().includes(q) ||
            s.sector.toLowerCase().includes(q)
        );
        const inv = matching.reduce((sum, s) => sum + s.investment, 0);
        const val = matching.reduce((sum, s) => sum + s.presentValue, 0);
        const gl = Math.round((val - inv) * 100) / 100;
        const glPct = inv > 0 ? (gl / inv) * 100 : 0;

        return {
          ...sec,
          stocks: matching,
          investment: inv,
          presentValue: val,
          gainLoss: gl,
          gainLossPct: glPct,
        };
      })
      .filter((sec) => sec.stocks.length > 0);
  }, [sectors, search]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50">
        <input
          type="text"
          placeholder="Search by name, ticker, or sector..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-xs w-full sm:w-72 bg-white focus:outline-none focus:border-blue-500"
        />

        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 font-medium">View:</span>
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-3 py-1 rounded text-xs font-medium border ${
              viewMode === 'grouped'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            Sector Grouped
          </button>
          <button
            onClick={() => setViewMode('flat')}
            className={`px-3 py-1 rounded text-xs font-medium border ${
              viewMode === 'flat'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            All Stocks ({stocks.length})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
            <tr>
              <th className="py-2.5 px-3">Particulars</th>
              <th className="py-2.5 px-2 text-center">NSE/BSE</th>
              <th className="py-2.5 px-3 text-right">Purchase Price</th>
              <th className="py-2.5 px-2 text-right">Qty</th>
              <th className="py-2.5 px-3 text-right">Investment</th>
              <th className="py-2.5 px-2 text-right">Port. (%)</th>
              <th className="py-2.5 px-3 text-right text-blue-700">CMP (Live)</th>
              <th className="py-2.5 px-3 text-right">Present Value</th>
              <th className="py-2.5 px-3 text-right">Gain / Loss</th>
              <th className="py-2.5 px-2 text-right">P/E Ratio</th>
              <th className="py-2.5 px-3 text-right">Latest Earnings</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {viewMode === 'grouped' ? (
              filteredSectors.map((sec) => {
                const isCollapsed = collapsed[sec.name];
                const isSecProfit = sec.gainLoss >= 0;

                return (
                  <React.Fragment key={sec.name}>
                    <tr
                      onClick={() => toggleSector(sec.name)}
                      className="bg-gray-50 hover:bg-gray-100 cursor-pointer font-medium border-t-2 border-b border-gray-200 select-none"
                    >
                      <td colSpan={4} className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-mono text-[11px]">
                            {isCollapsed ? '[+]' : '[-]'}
                          </span>
                          <span className="font-bold text-gray-900">{sec.name}</span>
                          <span className="text-gray-500 text-[11px]">
                            ({sec.stocks.length} stocks)
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-gray-900">
                        {formatINR(sec.investment)}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-500">{sec.weightPct}%</td>
                      <td className="py-2 px-3 text-right text-gray-400">&mdash;</td>
                      <td className="py-2 px-3 text-right font-semibold text-gray-900">
                        {formatINR(sec.presentValue)}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-bold ${
                          isSecProfit ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {isSecProfit ? '+' : ''}
                        {formatINR(sec.gainLoss)} ({sec.gainLossPct.toFixed(2)}%)
                      </td>
                      <td colSpan={2} className="py-2 px-3 text-right text-gray-400">
                        Sector Summary
                      </td>
                    </tr>

                    {!isCollapsed &&
                      sec.stocks.map((stock) => (
                        <StockRow key={stock.id} stock={stock} formatINR={formatINR} />
                      ))}
                  </React.Fragment>
                );
              })
            ) : (
              filteredStocks.map((stock) => (
                <StockRow key={stock.id} stock={stock} formatINR={formatINR} showSector />
              ))
            )}

            {filteredStocks.length === 0 && (
              <tr>
                <td colSpan={11} className="py-8 text-center text-gray-500">
                  No stocks found matching &ldquo;{search}&rdquo;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface StockRowProps {
  stock: StockHolding;
  formatINR: (val: number) => string;
  showSector?: boolean;
}

function StockRow({ stock, formatINR, showSector }: StockRowProps) {
  const isProfit = stock.gainLoss >= 0;

  return (
    <tr className="hover:bg-blue-50/40 border-b border-gray-100">
      <td className="py-2 px-3">
        <div className="font-semibold text-gray-900">{stock.name}</div>
        {showSector && (
          <span className="text-[10px] text-gray-500">{stock.sector}</span>
        )}
      </td>

      <td className="py-2 px-2 text-center font-mono text-[11px] text-gray-600">
        {stock.symbol}
      </td>

      <td className="py-2 px-3 text-right text-gray-700">
        {formatINR(stock.purchasePrice)}
      </td>

      <td className="py-2 px-2 text-right text-gray-700">{stock.qty}</td>

      <td className="py-2 px-3 text-right font-semibold text-gray-900">
        {formatINR(stock.investment)}
      </td>

      <td className="py-2 px-2 text-right text-gray-500">{stock.portfolioPct}%</td>

      <td className="py-2 px-3 text-right font-bold text-blue-700">
        {formatINR(stock.cmp)}
      </td>

      <td className="py-2 px-3 text-right font-semibold text-gray-900">
        {formatINR(stock.presentValue)}
      </td>

      <td
        className={`py-2 px-3 text-right font-semibold ${
          isProfit ? 'text-green-600' : 'text-red-600'
        }`}
      >
        <div>
          {isProfit ? '+' : ''}
          {formatINR(stock.gainLoss)}
        </div>
        <div className="text-[10px]">
          ({isProfit ? '+' : ''}
          {stock.gainLossPct.toFixed(2)}%)
        </div>
      </td>

      <td className="py-2 px-2 text-right text-gray-700">
        {stock.peRatio && stock.peRatio !== 'N/A' && stock.peRatio !== '#N/A'
          ? typeof stock.peRatio === 'number'
            ? stock.peRatio.toFixed(2)
            : stock.peRatio
          : '—'}
      </td>

      <td className="py-2 px-3 text-right text-gray-700">
        {stock.latestEarnings &&
        stock.latestEarnings !== 'N/A' &&
        stock.latestEarnings !== '#N/A'
          ? `₹${stock.latestEarnings}`
          : '—'}
      </td>
    </tr>
  );
}

'use client';

import React from 'react';
import { PortfolioData } from '@/lib/types';

interface SummaryCardsProps {
  data: PortfolioData;
}

export function SummaryCards({ data }: SummaryCardsProps) {
  const isPositive = data.totalGainLoss >= 0;

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="text-xs text-gray-500 font-medium">Total Investment</div>
        <div className="text-xl font-bold text-gray-900 mt-1">
          {formatINR(data.totalInvestment)}
        </div>
        <div className="text-[11px] text-gray-400 mt-1">Total cost basis</div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="text-xs text-gray-500 font-medium">Present Value</div>
        <div className="text-xl font-bold text-gray-900 mt-1">
          {formatINR(data.totalPresentValue)}
        </div>
        <div className="text-[11px] text-gray-400 mt-1">Current market value</div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="text-xs text-gray-500 font-medium">Total Gain / Loss</div>
        <div
          className={`text-xl font-bold mt-1 ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {isPositive ? '+' : ''}
          {formatINR(data.totalGainLoss)}
        </div>
        <div
          className={`text-[11px] font-semibold mt-1 ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {isPositive ? '+' : ''}
          {data.totalGainLossPct.toFixed(2)}% return
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="text-xs text-gray-500 font-medium">Portfolio Overview</div>
        <div className="text-xl font-bold text-gray-900 mt-1">
          {data.stocks.length} Stocks
        </div>
        <div className="text-[11px] text-gray-400 mt-1">
          Across {data.sectors.length} sectors
        </div>
      </div>
    </div>
  );
}

export interface StockHolding {
  id: string;
  name: string;
  sector: string;
  symbol: string;
  yahooSymbol: string;
  googleSymbol: string;
  purchasePrice: number;
  qty: number;
  investment: number;
  portfolioPct: number;
  cmp: number;
  presentValue: number;
  gainLoss: number;
  gainLossPct: number;
  peRatio: number | string;
  latestEarnings: string;
  marketCap?: string;
  dayChange?: number;
}

export interface SectorSummary {
  name: string;
  stocks: StockHolding[];
  investment: number;
  presentValue: number;
  gainLoss: number;
  gainLossPct: number;
  weightPct: number;
}

export interface PortfolioData {
  totalInvestment: number;
  totalPresentValue: number;
  totalGainLoss: number;
  totalGainLossPct: number;
  lastUpdated: string;
  sectors: SectorSummary[];
  stocks: StockHolding[];
}

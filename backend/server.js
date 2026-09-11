const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 5000;
const CACHE_TTL_MS = 15000;

const dataPath = path.join(__dirname, 'data', 'portfolio-data.json');
const portfolioHoldings = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const cache = {};
let lastCacheTime = 0;

function fetchYahooQuote(symbol) {
  return new Promise((resolve) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`;
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 4000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const meta = json?.chart?.result?.[0]?.meta;
          if (meta && typeof meta.regularMarketPrice === 'number') {
            const price = meta.regularMarketPrice;
            const prevClose = meta.previousClose || meta.chartPreviousClose;
            const change = prevClose ? ((price - prevClose) / prevClose) * 100 : undefined;
            return resolve({ price, change });
          }
        } catch {}
        resolve({ price: null });
      });
    });

    req.on('error', () => resolve({ price: null }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ price: null });
    });
  });
}

function fetchGoogleFinance(googleSymbol) {
  return new Promise((resolve) => {
    function request(url) {
      const req = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 4000,
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let loc = res.headers.location;
          if (!loc.startsWith('http')) loc = 'https://www.google.com' + loc;
          return request(loc);
        }

        let html = '';
        res.on('data', (chunk) => html += chunk);
        res.on('end', () => {
          let pe;
          const peMatch = html.match(/P\/E ratio[\s\S]{1,120}?>([0-9\.]+)<\/div>/i) ||
                          html.match(/P\/E ratio[\s\S]{1,120}?class="[^"]*P6K39c[^"]*">([0-9\.]+)/i);
          if (peMatch) pe = peMatch[1];

          let earnings;
          const epsMatch = html.match(/EPS[\s\S]{1,120}?>([0-9\.\-]+)<\/div>/i) ||
                           html.match(/EPS[\s\S]{1,120}?class="[^"]*P6K39c[^"]*">([0-9\.\-]+)/i);
          if (epsMatch) earnings = epsMatch[1];

          resolve({ pe, earnings });
        });
      });

      req.on('error', () => resolve({}));
      req.on('timeout', () => {
        req.destroy();
        resolve({});
      });
    }

    request(`https://www.google.com/finance/quote/${googleSymbol}`);
  });
}

async function getPortfolioPayload() {
  const now = Date.now();
  const isCacheValid = now - lastCacheTime < CACHE_TTL_MS && Object.keys(cache).length > 0;

  const totalInvestment = portfolioHoldings.reduce(
    (sum, s) => sum + s.purchasePrice * s.qty,
    0
  );

  if (!isCacheValid) {
    const fetchPromises = portfolioHoldings.map(async (stock) => {
      const yahoo = await fetchYahooQuote(stock.yahooSymbol);
      const cmp = yahoo.price ?? stock.fallbackCmp;

      const google = await fetchGoogleFinance(stock.googleSymbol);
      const pe = google.pe ?? stock.fallbackPe;
      const earnings = google.earnings ?? stock.fallbackEarnings;

      cache[stock.id] = {
        cmp,
        pe,
        earnings,
        dayChange: yahoo.change,
      };
    });

    await Promise.allSettled(fetchPromises);
    lastCacheTime = now;
  }

  const stocks = portfolioHoldings.map((item) => {
    const live = cache[item.id] || {
      cmp: item.fallbackCmp,
      pe: item.fallbackPe,
      earnings: item.fallbackEarnings,
    };

    const investment = Math.round(item.purchasePrice * item.qty * 100) / 100;
    const presentValue = Math.round(live.cmp * item.qty * 100) / 100;
    const gainLoss = Math.round((presentValue - investment) * 100) / 100;
    const gainLossPct = investment > 0 ? Math.round((gainLoss / investment) * 10000) / 100 : 0;
    const portfolioPct = totalInvestment > 0 ? Math.round((investment / totalInvestment) * 10000) / 100 : 0;

    return {
      id: item.id,
      name: item.name,
      sector: item.sector,
      symbol: item.symbol,
      yahooSymbol: item.yahooSymbol,
      googleSymbol: item.googleSymbol,
      purchasePrice: item.purchasePrice,
      qty: item.qty,
      investment,
      portfolioPct,
      cmp: live.cmp,
      presentValue,
      gainLoss,
      gainLossPct,
      peRatio: live.pe,
      latestEarnings: live.earnings,
      dayChange: live.dayChange,
    };
  });

  const sectorMap = new Map();
  stocks.forEach((stock) => {
    if (!sectorMap.has(stock.sector)) sectorMap.set(stock.sector, []);
    sectorMap.get(stock.sector).push(stock);
  });

  const sectors = Array.from(sectorMap.entries()).map(([name, sectorStocks]) => {
    const sectorInvestment = sectorStocks.reduce((acc, s) => acc + s.investment, 0);
    const sectorPresentValue = sectorStocks.reduce((acc, s) => acc + s.presentValue, 0);
    const sectorGainLoss = Math.round((sectorPresentValue - sectorInvestment) * 100) / 100;
    const sectorGainLossPct = sectorInvestment > 0 ? Math.round((sectorGainLoss / sectorInvestment) * 10000) / 100 : 0;
    const weightPct = totalInvestment > 0 ? Math.round((sectorInvestment / totalInvestment) * 10000) / 100 : 0;

    return {
      name,
      stocks: sectorStocks,
      investment: Math.round(sectorInvestment * 100) / 100,
      presentValue: Math.round(sectorPresentValue * 100) / 100,
      gainLoss: sectorGainLoss,
      gainLossPct: sectorGainLossPct,
      weightPct,
    };
  });

  const totalPresentValue = Math.round(stocks.reduce((sum, s) => sum + s.presentValue, 0) * 100) / 100;
  const totalGainLoss = Math.round((totalPresentValue - totalInvestment) * 100) / 100;
  const totalGainLossPct = totalInvestment > 0 ? Math.round((totalGainLoss / totalInvestment) * 10000) / 100 : 0;

  return {
    totalInvestment: Math.round(totalInvestment * 100) / 100,
    totalPresentValue,
    totalGainLoss,
    totalGainLossPct,
    lastUpdated: new Date().toLocaleTimeString('en-US', { hour12: true }),
    sectors,
    stocks,
  };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  if (url === '/api/portfolio') {
    try {
      const data = await getPortfolioPayload();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err) {
      console.error('API Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  } else if (url === '/health' || url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'Portfolio Backend', port: PORT }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route Not Found' }));
  }
});

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Portfolio endpoint available at http://localhost:${PORT}/api/portfolio`);
});

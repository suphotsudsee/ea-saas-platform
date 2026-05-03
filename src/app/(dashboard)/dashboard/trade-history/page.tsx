'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, Search } from 'lucide-react';
import api from '@/lib/api';

type TradeDirection = 'BUY' | 'SELL';
type TradeEventType = 'OPEN' | 'CLOSE' | 'MODIFY' | 'PARTIAL_CLOSE';

interface TradeHistoryItem {
  id: string;
  ticket: string;
  symbol: string;
  direction: TradeDirection;
  eventType: TradeEventType;
  openPrice: number | null;
  closePrice: number | null;
  volume: number;
  profit: number | null;
  createdAt: string;
  closeTime: string | null;
}

interface TradeHistoryResponse {
  trades: TradeHistoryItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

function formatPrice(value: number | null) {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  });
}

function formatVolume(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatProfit(value: number | null) {
  const profit = value ?? 0;
  const formatted = Math.abs(profit).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (profit > 0) return `+$${formatted}`;
  if (profit < 0) return `-$${formatted}`;
  return '$0.00';
}

function formatTradeTime(value: string | null, fallback: string) {
  const date = new Date(value || fallback);
  return date.toLocaleString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDefaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

function buildExportUrl(startDate: string, endDate: string) {
  const params = new URLSearchParams();

  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const query = params.toString();
  return query ? `/api/trade-events/export?${query}` : '/api/trade-events/export';
}

export default function TradeHistoryPage() {
  const [trades, setTrades] = useState<TradeHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    let active = true;

    const loadTrades = async () => {
      setIsLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          page: '1',
          pageSize: '200',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', `${endDate}T23:59:59.999Z`);

        const response = await api.get<TradeHistoryResponse>(`/trade-events/list?${params.toString()}`);

        if (!active) return;
        setTrades(response.data.trades);
      } catch {
        if (!active) return;
        setError('Failed to load trade history.');
        setTrades([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadTrades();

    return () => {
      active = false;
    };
  }, [startDate, endDate]);

  const closedTrades = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return trades
      .filter((trade) => trade.eventType === 'CLOSE' || trade.eventType === 'PARTIAL_CLOSE')
      .filter((trade) => {
        if (!normalizedSearch) return true;
        return (
          trade.symbol.toLowerCase().includes(normalizedSearch) ||
          trade.ticket.toLowerCase().includes(normalizedSearch)
        );
      });
  }, [searchTerm, trades]);

  const exportUrl = useMemo(() => buildExportUrl(startDate, endDate), [endDate, startDate]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleStartDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEndDate(event.target.value);
  };

  const resetDateRange = () => {
    setStartDate(getDefaultStartDate());
    setEndDate(new Date().toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-4 rounded-[32px] border border-white/8 bg-[linear-gradient(135deg,#0f1d24_0%,#17120d_100%)] p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Badge className="border-[#8cc9c2]/20 bg-[#112129] text-[#8cc9c2] hover:bg-[#112129]">Trade log</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Review closed trades with clean filtering and fast export.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">
            Closed trade rows below now reflect actual account history from your connected EA activity, filtered by the selected date window.
          </p>
        </div>
        <Button
          className="rounded-full bg-[#e3a84f] px-5 text-[#14110c] hover:bg-[#efb65d]"
          onClick={() => {
            window.location.href = exportUrl;
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </section>

      <Card className="rounded-[32px] border-white/8 bg-white/[0.03]">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xl text-white">Trade history</CardTitle>
            <p className="mt-1 text-sm text-slate-400">All closed positions across connected accounts.</p>
          </div>
          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Filter by ticket or symbol"
                className="rounded-2xl border-white/10 bg-[#0c1720] pl-9 text-white"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                className="rounded-2xl border-white/10 bg-[#0c1720] text-white"
              />
              <Input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                className="rounded-2xl border-white/10 bg-[#0c1720] text-white"
              />
              <Button
                variant="outline"
                className="rounded-2xl border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]"
                onClick={resetDateRange}
              >
                <Filter className="mr-2 h-4 w-4" />
                Last 30 days
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="rounded-[28px] border border-white/8 bg-[#0c1720] p-6 text-sm text-slate-400">
              Loading real trade history...
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-rose-500/20 bg-rose-500/5 p-6 text-sm text-rose-200">
              {error}
            </div>
          ) : closedTrades.length === 0 ? (
            <div className="rounded-[28px] border border-white/8 bg-[#0c1720] p-6 text-sm text-slate-400">
              No closed trades found for the current filters.
            </div>
          ) : (
            closedTrades.map((trade) => (
              <div key={trade.id} className="grid gap-4 rounded-[28px] border border-white/8 bg-[#0c1720] p-5 lg:grid-cols-[1.1fr_0.9fr_0.9fr_0.8fr_0.8fr] lg:items-center">
                <div>
                  <div className="text-sm font-semibold text-white">{trade.symbol}</div>
                  <div className="mt-1 font-mono text-xs text-slate-500">Ticket {trade.ticket}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={trade.direction === 'BUY' ? 'border-sky-500/20 bg-sky-500/10 text-sky-300' : 'border-rose-500/20 bg-rose-500/10 text-rose-300'}>
                    {trade.direction}
                  </Badge>
                  <Badge variant="outline" className="border-white/10 bg-white/[0.02] text-slate-300">
                    Vol {formatVolume(trade.volume)}
                  </Badge>
                  {trade.eventType === 'PARTIAL_CLOSE' ? (
                    <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-200">
                      Partial
                    </Badge>
                  ) : null}
                </div>
                <div className="text-sm text-slate-400">
                  <div>Open {formatPrice(trade.openPrice)}</div>
                  <div>Close {formatPrice(trade.closePrice)}</div>
                </div>
                <div className={`text-lg font-semibold ${trade.profit !== null && trade.profit < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                  {formatProfit(trade.profit)}
                </div>
                <div className="text-sm text-slate-500">{formatTradeTime(trade.closeTime, trade.createdAt)}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

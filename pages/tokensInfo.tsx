import { getRawAddress, getAddressBySymbol } from '@/app/baseTon';
import { useState, useEffect } from 'react';
import Link from 'next/link';
//import { getUsdRate } from '@/app/token_rates';

interface TokenAnalytics {
  holders_count: number;
  usdRate: number;
  priceChange1d: number;
  priceChange7d: number;
  priceChange30d: number;
  totalSupply: string;
}

const TokenAnalyticsPage = () => {
  const [selectedToken, setSelectedToken] = useState<string>('USD₮');
  const [tokenAnalytics, setTokenAnalytics] = useState<TokenAnalytics | null>(null);

  useEffect(() => {
    // Функция для получения данных аналитики токена
    const fetchTokenAnalytics = async () => {
      try {
        const rawAddress = await getRawAddress(getAddressBySymbol(selectedToken));
        const url = `https://tonapi.io/v2/jettons/${rawAddress}`; // Заменить на реальный API URL
        const response = await fetch(url);
        const data = await response.json();
        
        const holders_count = data.holders_count;
        const total_supply = data.total_supply;

        const url1 = `https://tonapi.io/v2/rates?tokens=${rawAddress}&currencies=usd`; // Заменить на реальный API URL
        const response1 = await fetch(url1);
        const data1 = await response1.json();
        const usdRate = data1.rates[rawAddress].prices.USD;
        const priceChange1d = data1.rates[rawAddress].diff_24h.USD;
        const priceChange7d = data1.rates[rawAddress].diff_7d.USD;
        const priceChange30d = data1.rates[rawAddress].diff_30d.USD;

        setTokenAnalytics({
          holders_count: holders_count,
          usdRate: usdRate,
          totalSupply: total_supply,
          priceChange1d: priceChange1d,
          priceChange7d: priceChange7d,
          priceChange30d: priceChange30d          
        });
      } catch (error) {
        console.error("Error fetching token analytics", error);
      }
    };

    fetchTokenAnalytics();
  }, [selectedToken]);

  return (
    <main className="flex flex-col items-center justify-start min-h-screen p-4">
      {/* Кнопка Назад в верхнем левом углу */}
      <div className="absolute top-4 left-4">
        <Link href="/">
          <a className="text-blue-500 hover:text-blue-700 font-bold">← Back</a>
        </Link>
      </div>
  
      {/* Заголовок страницы */}
      <h3 className="text-2xl font-bold mb-12 mt-8">Token Analytics</h3>
  
      {/* Выпадающий список для выбора токенов */}
      <div className="w-full max-w-xs mx-auto">
        <select
          id="tokenSelect"
          value={selectedToken}
          onChange={(e) => setSelectedToken(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >          
          <option value="USD₮">USD₮</option>
          <option value="HMSTR">HMSTR</option>
          <option value="NOT">NOT</option>
          <option value="DOGS">DOGS</option>
        </select>
      </div>
  
      {/* Отображение аналитики токенов */}
      {tokenAnalytics && (
        <div className="w-full max-w-xs mt-4">
          <p className="text-gray-700 mb-2">
            <strong>Holders count:</strong> {tokenAnalytics.holders_count}
          </p>
          <p className="text-gray-700 mb-2">
            <strong>USD rate:</strong> {tokenAnalytics.usdRate}
          </p>
          <p className="text-gray-700 mb-2">
            <strong>Price Change (1d):</strong> {tokenAnalytics.priceChange1d}
          </p>
          <p className="text-gray-700 mb-2">
            <strong>Price Change (7d):</strong> {tokenAnalytics.priceChange7d}
          </p>
          <p className="text-gray-700 mb-2">
            <strong>Price Change (30d):</strong> {tokenAnalytics.priceChange30d}
          </p>
          <p className="text-gray-700 mb-2">
            <strong>Total Supply:</strong> {tokenAnalytics.totalSupply} {selectedToken}
          </p>
        </div>
      )}
    </main>
  );
};

export default TokenAnalyticsPage;

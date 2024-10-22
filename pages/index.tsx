'use client'

import { JettonAsset } from "@/app/interfaces";

import { useTonConnectUI } from "@tonconnect/ui-react";
import { useCallback, useEffect, useState } from "react";

import Link from 'next/link';
import { getRawAddress, fetchWalletBalance, getAssets, formatAddress } from "@/app/baseTon";

export default function Home() {
  const [tonConnectUI] = useTonConnectUI();
  const [tonWalletAddress, setTonWalletAddress] = useState<string | string>("");  
  const [tonBalance, setTonBalance] = useState<number | null>(null);  
  const [jettonAssets, setJettonAssets] = useState<JettonAsset[]>([]);  
  const [isBalanceShown, setIsBalanceShown] = useState(false); // Новое состояние для показа баланса
     

  

  // Функция вызывается, когда кошелек успешно подключен
  const handleWalletConnection = useCallback(async (address: string) => {
    setTonWalletAddress(address);
    console.log("Wallet connected successfully!");
  }, []);

  // Функция вызывается при отключении кошелька
  const handleWalletDisconnection = useCallback(() => {
    setTonWalletAddress("");
    setTonBalance(null); // Сбрасываем баланс при отключении кошелька
    setIsBalanceShown(false); // Сбрасываем показ баланса при отключении
    console.log("Wallet disconnected successfully!");
  }, []);

  // Проверка состояния кошелька
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (tonConnectUI.account?.address) {
        handleWalletConnection(tonConnectUI.account?.address);
      } else {
        handleWalletDisconnection();
      }
    };

    checkWalletConnection();

    const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
      if (wallet) {
        handleWalletConnection(wallet.account.address);
      } else {
        handleWalletDisconnection();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tonConnectUI, handleWalletConnection, handleWalletDisconnection]);

  // Открытие модального окна для подключения или отключения кошелька
  const handleWalletAction = async () => {
    
    if (tonConnectUI.connected) {
      await tonConnectUI.disconnect();
    } else {
      await tonConnectUI.openModal();
    }
  };
  

  // Функция отображения баланса
  const handleShowBalance = async () => {
    if (tonWalletAddress) {
      const walletBalance = await fetchWalletBalance(tonWalletAddress);
      setTonBalance(walletBalance);
      const rawAdr = await getRawAddress(tonWalletAddress);      
      setJettonAssets(await getAssets(rawAdr));
      setIsBalanceShown(true); // Показываем баланс после получения
      
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-8">TON Wallet</h1>

      {tonWalletAddress ? (
        <div className="flex flex-col items-center">
          <p className="mb-4">Connected: {formatAddress(tonWalletAddress)}</p>
          
           {/* Кнопка для перехода на страницу Swap с параметром tonWalletAddress */}
          <Link href={{ pathname: '/tokensInfo', query: { tonWalletAddress } }}>
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4">
              Jetton Info
            </button>
          </Link>

          {/* Кнопка для показа баланса */}
          <button
            onClick={handleShowBalance}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
          >
            Show Balance
          </button>
  
          {/* Показываем баланс только если кнопка была нажата */}
          {isBalanceShown && tonBalance !== null && (
            <div>
              {/* Отображение баланса TON */}
              <p className="mb-4">Balance: {tonBalance} TON</p>
  
              {/* Отображение жеттонов */}
              <h2 className="text-2xl font-bold mb-4">Jetton Assets</h2>
              {jettonAssets.length > 0 ? (
                jettonAssets.map((asset, index) => (
                  <p key={index}>
                    {asset.name}: {asset.balance} {asset.symbol}
                  </p>
                ))
              ) : (
                <p>No jetton assets found.</p>
              )}
            </div>
          )}

          {/* Кнопка для перехода на страницу Swap с параметром tonWalletAddress */}
          <Link href={{ pathname: '/swap', query: { tonWalletAddress } }}>
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4">
              Go to Swap
            </button>
          </Link>

          {/* Кнопка для отключения кошелька */}
          <button
            onClick={handleWalletAction}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Disconnect Wallet
          </button>
          </div>
          ) : (
            <button
              onClick={handleWalletAction}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Connect TON Wallet
            </button>
          )}
    </main>
  );
}


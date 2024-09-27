'use client'


import { Address } from "@ton/core";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useCallback, useEffect, useState } from "react";

export default function Home() {
  const [tonConnectUI] = useTonConnectUI();
  const [tonWalletAddress, setTonWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isBalanceShown, setIsBalanceShown] = useState(false); // Новое состояние для показа баланса

  // Функция вызывается, когда кошелек успешно подключен
  const handleWalletConnection = useCallback(async (address: string) => {
    setTonWalletAddress(address);
    console.log("Wallet connected successfully!");
  }, []);

  // Функция вызывается при отключении кошелька
  const handleWalletDisconnection = useCallback(() => {
    setTonWalletAddress(null);
    setBalance(null); // Сбрасываем баланс при отключении кошелька
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

  // Функция получения баланса кошелька
  const fetchWalletBalance = async (address: string) => {
    try {
      const url = `https://toncenter.com/api/v2/getAddressBalance?address=${address}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.ok && data.result) {
        return Number(data.result) / 1e9;
      } else {
        console.error("Failed to fetch wallet balance:", data.error);
        return 0;
      }
    } catch (error) {
      console.error("Failed to fetch wallet balance:", error);
      return 0;
    }
  };

  // Функция отображения баланса
  const handleShowBalance = async () => {
    if (tonWalletAddress) {
      const walletBalance = await fetchWalletBalance(tonWalletAddress);
      setBalance(walletBalance);
      setIsBalanceShown(true); // Показываем баланс после получения
    }
  };

  // Форматирование адреса кошелька
  const formatAddress = (address: string) => {
    const tempAddress = Address.parse(address).toString();
    return `${tempAddress.slice(0, 4)}...${tempAddress.slice(-4)}`;
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-8">TON Wallet</h1>
      {tonWalletAddress ? (
        <div className="flex flex-col items-center">
          <p className="mb-4">Connected: {formatAddress(tonWalletAddress)}</p>
          
          {/* Кнопка для показа баланса */}
          <button
            onClick={handleShowBalance}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
          >
            Show Balance
          </button>

          {/* Показываем баланс только если кнопка была нажата */}
          {isBalanceShown && balance !== null && (
            <p className="mb-4">Balance: {balance} TON</p>
          )}

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

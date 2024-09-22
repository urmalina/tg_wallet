'use client'

import { Address, DepthBalanceInfo, loadDepthBalanceInfo } from "@ton/core";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { useCallback, useEffect, useState } from "react";


export default function Home() {
  const [tonConnectUI] = useTonConnectUI();
  const [tonWalletAddress, setTonWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true)
  const [balance, setBalance] = useState<number | null>(null);  // Добавили состояние для баланса

  
//функция вызывается, когда кошелек успешно подключен, она обновляет адрес кошелька и отключает состояние загрузки
  const handleWalletConnection = useCallback(async (address: string) => {
    setTonWalletAddress(address);
    const walletBalance = await fetchWalletBalance(address);
    setBalance(walletBalance);
    console.log("Wallet connected successfully!");
    setIsLoading(false);
  }, []);

  //функция вызывается при отключении кошелька. Она сбрасывает адрес кошелька и отключает загрузку
  const handleWalletDisconnection = useCallback(() => {
    setTonWalletAddress(null);
    console.log("Wallet disconnected successfully!");
    setIsLoading(false);
    
  }, []);

  //проверка состояния кошелька
  //В зависимости от того, есть ли подключенный кошелек, вызывается либо функция подключения, либо отключения
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (tonConnectUI.account?.address) {
        handleWalletConnection(tonConnectUI.account?.address);
      } 
      else
      {
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

  //Если кошелек подключен, эта функция вызывает его отключение; если не подключен, открывает модальное окно для подключения
  const handleWalletAction = async () => {
    if (tonConnectUI.connected) {
      setIsLoading(true);
      await tonConnectUI.disconnect();
    } else {
      await tonConnectUI.openModal();
    }
  };

  const fetchWalletBalance = async (address: string) => {
    try {
      // URL для публичного TON API. Используем адрес toncenter.
      const url = `https://toncenter.com/api/v2/getAddressBalance?address=${address}`;
      
      // Выполняем запрос к API
      const response = await fetch(url);
      const data = await response.json();
  
      if (data.ok && data.result) {
        // Преобразуем баланс из нанотонов в тонны
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
  

  //функция форматирует адрес для удобного отображения: показывает первые и последние 4 символа, скрывая остальное
  const formatAddress = (address: string) => {
    const tempAddress = Address.parse(address).toString();
    return `${tempAddress.slice(0, 4)}...${tempAddress.slice(-4)}`;
  };

  //если идет загрузка, показывается индикатор загрузки
  if (isLoading){
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded">
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-8">TON Connect Demo</h1>
      {tonWalletAddress ? (
        <div className="flex flex-col items-center">
          <p className="mb-4">Balance: {balance}</p>
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
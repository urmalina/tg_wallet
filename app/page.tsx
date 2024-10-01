'use client'

// Описание интерфейса JettonAsset
interface JettonAsset {
  balance: number; // Баланс будет числом
  name: string; // Название жеттона
  symbol: string; // Символ жеттона (например, DOGS, USD₮)
}
interface JettonInfo {
  balance: string;
  wallet_address: {
    address: string;
    is_scam: boolean;
    is_wallet: boolean;
  };
  jetton: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    image: string;
  };
}

import { Address } from "@ton/core";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useCallback, useEffect, useState } from "react";

export default function Home() {
  const [tonConnectUI] = useTonConnectUI();
  const [tonWalletAddress, setTonWalletAddress] = useState<string | string>("");
  const [rawAddress, setRawAddress] = useState<string | string>("");
  const [testLinh, setTestLink] = useState<string | string>("");
  const [tonBalance, setTonBalance] = useState<number | null>(null);  
  const [jettonAssets, setJettonAssets] = useState<JettonAsset[]>([]);
  //const [jettonAssets, setJettonAssets] = useState<any[]>([]);
  //const [assets, setAssets] = useState<l
  const [isBalanceShown, setIsBalanceShown] = useState(false); // Новое состояние для показа баланса
  //const { Address } = require('@ton/core');

  // const showAssets = async () => {
  //   const rawAddress = Address.parseRaw(tonWalletAddress);
  //   setTonWalletAddress(rawAddress.toRawString);
  //   const url = `https://toncenter.com/api/v2/getAddressBalance?address=${address}`;
  //   const response = await fetch(url);
  //   const data = await response.json();
  // }

  
  

  const getRawAddress = async (address: string) => {    
    try {
      const url = `https://toncenter.com/api/v2/unpackAddress?address=${address}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.ok && data.result) {
        setRawAddress(data.result);
        return data.result;
      } else {
        console.error("Failed to get raw address", data.error);   
        return "";     
      }
    } catch (error) {
      console.error("Failed to get raw address", error); 
      return "";     
    }
  }

  const getAssets = async (rawAddres: string) => {
    try {
      //getRawAddress(tonWalletAddress);
      const url = `https://tonapi.io/v2/accounts/${rawAddres}/jettons`;

      setTestLink(url)
      const response = await fetch(url);
      const data = await response.json();
        
      if (data.balances) 
        {
          const balances = data.balances;
          const jettonAssets: JettonAsset[] = balances.map((jettonInfo: JettonInfo) => {
            const balance = Number(jettonInfo.balance) / Math.pow(10, jettonInfo.jetton.decimals);
            const name = jettonInfo.jetton.name;
            const symbol = jettonInfo.jetton.symbol;

            return { balance, name, symbol };
        });

        setJettonAssets(jettonAssets);

      } else {
        console.error("Failed to get info about jetton assets");
        return [];
      }
    } catch (error) {
      console.error("Failed to get info about jetton assets", error);
      return [];
    }
  };


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
      setTonBalance(walletBalance);
      const rawAdr = await getRawAddress(tonWalletAddress);
      //getAssets("0:172fc465e49d9f06e133628e1f7a76877b096aef1dc1f0f0dbaa33782ca0fc05");
      getAssets(rawAdr);
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
          {isBalanceShown && tonBalance !== null && (
            <div>
              {/* Отображение баланса TON */}
              <p className="mb-4">Balance: {tonBalance} TON</p>
  
              {/* Отображение жеттонов */}
              <h2 className="text-2xl font-bold mb-4">Jetton Assets</h2>
              {jettonAssets.length > 0? (
                jettonAssets.map((asset, index) => (
                  <p key={index}>
                    {asset.name}: {asset.balance} {asset.symbol}
                  </p>
                ))
              ) : (
                <p>No jetton assets found. link {testLinh} ad {rawAddress}{}</p>
                
              )}
            </div>
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

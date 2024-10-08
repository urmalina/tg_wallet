'use client'

// Описание интерфейса JettonAsset
interface JettonAsset {
  balance: number; 
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

import { Address, toNano, Sender, SenderArguments } from "@ton/core";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useCallback, useEffect, useState } from "react";
import { Factory, MAINNET_FACTORY_ADDR, Asset, PoolType, ReadinessStatus, JettonRoot, VaultJetton } from '@dedust/sdk';
import { TonClient4 } from "@ton/ton";
import {jettons} from './jettons';

export default function Home() {
  const [tonConnectUI] = useTonConnectUI();
  const [tonWalletAddress, setTonWalletAddress] = useState<string | string>("");  
  const [tonBalance, setTonBalance] = useState<number | null>(null);  
  const [jettonAssets, setJettonAssets] = useState<JettonAsset[]>([]);  
  const [isBalanceShown, setIsBalanceShown] = useState(false); // Новое состояние для показа баланса
  const [tokenFrom, setTokenFrom] = useState<string>('TON'); // Токен, который отдаем
  const [tokenTo, setTokenTo] = useState<string>('USDT');   // Токен, который получаем

  const tonClient = new TonClient4({ endpoint: "https://mainnet-v4.tonhubapi.com" });
  const factory = tonClient.open(Factory.createFromAddress(MAINNET_FACTORY_ADDR));
  const [amountToSwap, setAmountToSwap] = useState<string>(''); // Сумма для обмена
  
  
  // Функция для получения address по символу токена
  function getAddressBySymbol(symbol: string): string {
    const token = jettons.jettons.find(jetton => jetton.symbol === symbol);
    return token ? token.address : "";
  } 

  // Функция для свопа токенов
  const handleSwapTokens = async () => {
    try {
      const isFromTON = tokenFrom === "TON" 
      ? true
      : false;

      if (isFromTON)
      {
        const vault = tonClient.open(await factory.getNativeVault());
        const FROM_TOKEN = Asset.native();
        const TO_ADDRESS = Address.parse(getAddressBySymbol(tokenTo));
        const TO_TOKEN = Asset.jetton(TO_ADDRESS);
        const pool = tonClient.open(await factory.getPool(PoolType.VOLATILE, [FROM_TOKEN, TO_TOKEN]));        
        
        // Проверка состояния пула
        if ((await pool.getReadinessStatus()) !== ReadinessStatus.READY) {
          throw new Error(`Pool (TON, ${tokenTo}) does not exist.`);
        }
        
        // Проверка состояния vault
        if ((await vault.getReadinessStatus()) !== ReadinessStatus.READY) {
          throw new Error(`Vault ${tokenFrom} does not exist.`);
        }

        //const amountIn = toNano(amountToSwap); // 0.1 TON

        // Инициализация объекта Sender через TonConnect
        const sender: Sender = {
          address: Address.parse(tonWalletAddress),
          send: async (args: SenderArguments) => {
            await tonConnectUI.sendTransaction({
              validUntil: Math.floor(Date.now() / 1000) + 60, // Время действия транзакции
              messages: [
                {
                  address: args.to.toString(),
                  amount: args.value.toString(),
                  //bounce: args.bounce || false,
                  //stateInit: args.init ? args.init.toBoc().toString("base64") : undefined,
                  payload: args.body ? args.body.toBoc().toString("base64") : undefined
                }
              ]
            });
          }
        };
        //const token = jettons.jettons.find(jetton => jetton.symbol === tokenFrom);
        //const decimals = token!.decimals;
        //const decimals = jettons.jettons.find(jetton => jetton.symbol === symbol)
        const amountIn = toNano(amountToSwap); 
        //const poolAddress = pool.address;


        // Выполнение свопа
        await vault.sendSwap(sender, {
          poolAddress: pool.address,
          amount: amountIn,
          gasAmount: toNano("0.2"), // Газ для транзакции
        });

      }
      else
      {

        const vault =tonClient.open(await factory.getJettonVault(Address.parse(getAddressBySymbol(tokenFrom))));
        const FROM_ADDRESS = Address.parse(getAddressBySymbol(tokenFrom));
        const FROM_TOKEN = Asset.jetton(FROM_ADDRESS);        
        const TO_TOKEN = tokenTo ==="TON"
        ? Asset.native()
        : Asset.jetton(Address.parse(getAddressBySymbol(tokenTo)));

        const pool = tokenTo ==="TON"
        ?tonClient.open(await factory.getPool(PoolType.VOLATILE, [TO_TOKEN, FROM_TOKEN]))
        :tonClient.open(await factory.getPool(PoolType.VOLATILE, [FROM_TOKEN, TO_TOKEN])); 
        //const pool = tonClient.open(await factory.getPool(PoolType.VOLATILE, [FROM_TOKEN, TO_TOKEN]));
        const jettonRoot = tonClient.open(JettonRoot.createFromAddress(FROM_ADDRESS));
        
       // Инициализация объекта Sender через TonConnect
        const sender: Sender = {
          address: Address.parse(tonWalletAddress),
          send: async (args: SenderArguments) => {
            await tonConnectUI.sendTransaction({
              validUntil: Math.floor(Date.now() / 1000) + 60, // Время действия транзакции
              messages: [
                {
                  address: args.to.toString(),
                  amount: args.value.toString(),
                  //bounce: args.bounce || false,
                  //stateInit: args.init ? args.init.toBoc().toString("base64") : undefined,
                  payload: args.body ? args.body.toBoc().toString("base64") : undefined
                }
              ]
            });
          }
        };
        const jettonWallet = tonClient.open(await jettonRoot.getWallet(sender.address!));

        const token = jettons.jettons.find(jetton => jetton.symbol === tokenFrom);
        const decimals = token!.decimals;
        //const decimals = jettons.jettons.find(jetton => jetton.symbol === symbol)
        const amountIn = parseFloat(amountToSwap) * Math.pow(10, parseInt(decimals)); 
        const poolAddress = pool.address;

        await jettonWallet.sendTransfer(sender, toNano("0.3"), {
          amount: BigInt(amountIn),
          destination: vault.address,
          responseAddress: sender.address, // return gas to user
          forwardAmount: toNano("0.25"),
          forwardPayload: VaultJetton.createSwapPayload({poolAddress}),
        });
      }

      
      alert("Swap successful!");

    } catch (error) {
      console.error("Swap failed:", error);
      alert("Swap failed. Check console for more details.");
    }
  };
 
  
 
  const getRawAddress = async (address: string) => {    
    try {
      const url = `https://toncenter.com/api/v2/unpackAddress?address=${address}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.ok && data.result) {        
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
      const url = `https://tonapi.io/v2/accounts/${rawAddres}/jettons`;      
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
      await getAssets(rawAdr);
      setIsBalanceShown(true); // Показываем баланс после получения
      
    }
  };

  // Форматирование адреса кошелька
  const formatAddress = (address: string) => {
    const tempAddress = Address.parse(address).toString();
    return `${tempAddress.slice(0, 4)}...${tempAddress.slice(-4)}`;
  };

  // Обработчик изменения токена исходного свопа
  const handleTokenFromChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTokenFrom(e.target.value);
  };

  // Обработчик изменения токена целевого свопа
  const handleTokenToChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTokenTo(e.target.value);
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

          {/* Форма для выбора токенов и суммы */}
          <div className="mb-4">
            {/* Выбор токена, который отдаем */}
            <label className="mr-4">Swap from:</label>
            <select value={tokenFrom} onChange={handleTokenFromChange} className="p-2 border rounded mr-4">
              <option value="TON">TON</option>
              <option value="USD₮">USDT</option>
              <option value="HMSTR">HMSTR</option>
              <option value="DOGS">DOGS</option>
              <option value="NOT">NOT</option>
            </select>

            {/* Выбор токена, который получаем */}
            <label className="mr-4">Swap to:</label>
            <select value={tokenTo} onChange={handleTokenToChange} className="p-2 border rounded">
              <option value="TON">TON</option>
              <option value="USD₮">USDT</option>
              <option value="HMSTR">HMSTR</option>
              <option value="DOGS">DOGS</option>
              <option value="NOT">NOT</option>
            </select>
          </div>

          {/* Поле для ввода суммы */}
          <input
            type="number"
            value={amountToSwap}
            onChange={(e) => setAmountToSwap(e.target.value)}
            placeholder="Enter amount to swap"
            className="mb-4 p-2 border rounded"
          />

          {/* Кнопка для выполнения свопа */}
          <button
            onClick={handleSwapTokens} // Вызов функции для перехода на страницу свопа
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
          >
            Swap Tokens
          </button>

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

//   return (
//     <main className="flex min-h-screen flex-col items-center justify-center">
//       <h1 className="text-4xl font-bold mb-8">TON Wallet</h1>
//       {tonWalletAddress ? (
//         <div className="flex flex-col items-center">
//           <p className="mb-4">Connected: {formatAddress(tonWalletAddress)}</p>
          
//           {/* Кнопка для показа баланса */}
//           <button
//             onClick={handleShowBalance}
//             className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
//           >
//             Show Balance
//           </button>
  
//           {/* Показываем баланс только если кнопка была нажата */}
//           {isBalanceShown && tonBalance !== null && (
//             <div>
//               {/* Отображение баланса TON */}
//               <p className="mb-4">Balance: {tonBalance} TON</p>
  
//               {/* Отображение жеттонов */}
//               <h2 className="text-2xl font-bold mb-4">Jetton Assets</h2>
//               {jettonAssets.length > 0 ? (
//                 jettonAssets.map((asset, index) => (
//                   <p key={index}>
//                     {asset.name}: {asset.balance} {asset.symbol}
//                   </p>
//                 ))
//               ) : (
//                 <p>No jetton assets found.</p>
//               )}
//             </div>
//           )}
  
//           {/* Кнопка для выполнения свопа 5 TON на SCALE */}
//           <button
//             onClick={handleSwapTokens} // Вызов функции свопа токенов
//             className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
//           >
//             Swap 5 TON for SCALE
//           </button>
  
//           <button
//             onClick={handleWalletAction}
//             className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
//           >
//             Disconnect Wallet
//           </button>
//         </div>
//       ) : (
//         <button
//           onClick={handleWalletAction}
//           className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
//         >
//           Connect TON Wallet
//         </button>
//       )}
//     </main>
//   );
  
// }

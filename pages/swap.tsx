// pages/swap.tsx
import { useState, useEffect } from 'react';
import { Factory, MAINNET_FACTORY_ADDR, Asset, PoolType, ReadinessStatus, JettonRoot, VaultJetton } from '@dedust/sdk';
import { TonClient4 } from "@ton/ton";
import {jettons} from '../app/jettons';
import { Address, toNano, Sender, SenderArguments } from "@ton/core";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useRouter } from 'next/router';
import { getUsdRate, getUsdRateForTon } from '@/app/token_rates';
import Link from 'next/link';
import { JettonInfo } from "@/app/interfaces";
import { getRawAddress, fetchWalletBalance, formatAddress, getAddressBySymbol} from '@/app/baseTon';

const Swap = () =>  {
  const [amountToSwap, setAmount] = useState<string>(''); // Сумма для свопа
  const [fromCurrency, setFromCurrency] = useState('TON');  // Выбранная валюта для перевода
  const [toCurrency, setToCurrency] = useState('TON');  // Валюта для получения
  //const [rate, setRate] = useState(1);  // Курс обмена (зависит от валют)
  //setRate(parseFloat(getUsdRateForTon()));
  const [fromRate, setFromRate] = useState(); 
  const [toRate, setToRate] = useState(); 
  const [amountInExchanged, setAmountInExchanged] = useState(1);

  const tonClient = new TonClient4({ endpoint: "https://mainnet-v4.tonhubapi.com" });
  const factory = tonClient.open(Factory.createFromAddress(MAINNET_FACTORY_ADDR));
  
  const [tonConnectUI] = useTonConnectUI();
  const [tonWalletAddress, setTonWalletAddress] = useState<string | string>(""); 
  const router = useRouter();

  // Функция для загрузки курса валют
  const loadExchangeRate = async () => {
    // Имитация загрузки курса валют
    const fetchedRate = await getUsdRateForTon(); // Здесь функция для получения курса
    setFromRate(fetchedRate);
    setToRate(fetchedRate);
  };

  // Вызов функции для получения курса при монтировании компонента
  useEffect(() => {
    loadExchangeRate(); // Загрузка курса при загрузке страницы
  }, []);

  

  useEffect(() => {
    if (router.isReady) {
      const address = router.query.tonWalletAddress;

      // Преобразование в строку, если это массив
      if (Array.isArray(address)) {
        setTonWalletAddress(address[0]);  // Берем первый элемент
      } else {
        setTonWalletAddress(address as string);  // Просто строка
      }
      
    }
  }, [router.isReady, router.query.tonWalletAddress]);
  
   


  // Функция для свопа токенов
  const handleSwapTokens = async () => {
    try {
      const isFromTON = fromCurrency === "TON" 
      ? true
      : false;

      if (isFromTON)
      {
        const vault = tonClient.open(await factory.getNativeVault());
        const FROM_TOKEN = Asset.native();
        const TO_ADDRESS = Address.parse(getAddressBySymbol(toCurrency));
        const TO_TOKEN = Asset.jetton(TO_ADDRESS);
        const pool = tonClient.open(await factory.getPool(PoolType.VOLATILE, [FROM_TOKEN, TO_TOKEN]));        
        
        // Проверка состояния пула
        if ((await pool.getReadinessStatus()) !== ReadinessStatus.READY) {
          throw new Error(`Pool (TON, ${toCurrency}) does not exist.`);
        }
        
        // Проверка состояния vault
        if ((await vault.getReadinessStatus()) !== ReadinessStatus.READY) {
          throw new Error(`Vault ${fromCurrency} does not exist.`);
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
        
        const amountIn = toNano(amountToSwap); 
        

        // Выполнение свопа
        await vault.sendSwap(sender, {
          poolAddress: pool.address,
          amount: amountIn,
          gasAmount: toNano("0.2"), // Газ для транзакции
        });

      }
      else
      {

        const vault =tonClient.open(await factory.getJettonVault(Address.parse(getAddressBySymbol(fromCurrency))));
        const FROM_ADDRESS = Address.parse(getAddressBySymbol(fromCurrency));
        const FROM_TOKEN = Asset.jetton(FROM_ADDRESS);        
        const TO_TOKEN = toCurrency ==="TON"
        ? Asset.native()
        : Asset.jetton(Address.parse(getAddressBySymbol(toCurrency)));

        const pool = toCurrency ==="TON"
        ?tonClient.open(await factory.getPool(PoolType.VOLATILE, [TO_TOKEN, FROM_TOKEN]))
        :tonClient.open(await factory.getPool(PoolType.VOLATILE, [FROM_TOKEN, TO_TOKEN])); 
        
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

        const token = jettons.jettons.find(jetton => jetton.symbol === fromCurrency);
        const decimals = token!.decimals;       
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
 

  // Обновление курса при изменении выбранных валют
  const handleCurrencyChange = async (from: string, to: string, ) => {
    //const fromRate = tokenRates[from];
    const fromRate = from === "TON"
    ? await getUsdRateForTon()
    : await getUsdRate(getAddressBySymbol(from));
    const toRate = to === "TON"
    ? await getUsdRateForTon()
    : await getUsdRate(getAddressBySymbol(to));
    
    setFromRate(fromRate);
    setToRate(toRate);
    const newRate = parseFloat(fromRate)/parseFloat(toRate);    
    setAmountInExchanged(parseFloat(amountToSwap)*newRate);   
  };

  

  const handleAmountChange = async (amount: string) => {
    const fromRate = fromCurrency === "TON"
    ? await getUsdRateForTon()
    : await getUsdRate(getAddressBySymbol(fromCurrency));
    const toRate = toCurrency === "TON"
    ? await getUsdRateForTon()
    : await getUsdRate(getAddressBySymbol(toCurrency));
    const newRate = parseFloat(fromRate)/parseFloat(toRate);    
    setAmountInExchanged(parseFloat(amount)*newRate);   
  };

    // Функция для reverse токенов в списках
    const handleSwapCurrencies = () => {
        const temp = fromCurrency;
        setFromCurrency(toCurrency);
        setToCurrency(temp);
        handleCurrencyChange(toCurrency, fromCurrency);
      };

      const getAccountAssetBalance = async (rawAddress: string, symbol: string): Promise<number> => {
        try {
          const url = `https://tonapi.io/v2/accounts/${rawAddress}/jettons`;
          const response = await fetch(url);
          const data = await response.json();
      
          if (data.balances) {
            const balances = data.balances;
      
            // Поиск нужного токена по символу и возврат его баланса
            const jettonInfo = balances.find((jettonInfo: JettonInfo) => jettonInfo.jetton.symbol === symbol);
      
            if (jettonInfo) {
              return Number(jettonInfo.balance/ Math.pow(10,parseInt(jettonInfo.jetton.decimals)));
            } else {
              console.error("Jetton with symbol not found");
              return 0;
            }
          } else {
            console.error("Failed to get info about jetton assets");
            return 0;
          }
        } catch (error) {
          console.error("Failed to get info about jetton assets", error);
          return 0;
        }
      };

   
      return (
        <main className="flex min-h-screen flex-col items-center justify-center">
            {/* Кнопка Назад в верхнем левом углу */}
            <div className="absolute top-4 left-4">
                <Link href="/">
                    <a className="text-blue-500 hover:text-blue-700 font-bold">← Back</a>
                </Link>
            </div>
          <h1 className="text-4xl font-bold mb-8">Token Swap</h1>
    
          <div className="w-full max-w-xs">
            {/* Поле для ввода суммы */}            
            <input
              id="amount"
              type="number" 
              value={amountToSwap}         
              onChange={(e) => {
                setAmount(e.target.value);
                handleAmountChange(e.target.value);
              }}
              placeholder="Enter amount"
              className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Кнопки для выбора процента */}
            <div className="flex justify-between mb-4">
                {[1, 5, 10, 20, 30, 100].map((percentage) => (
                <button
                    key={percentage}
                    onClick={async () => {
                    const calculatedAmount = fromCurrency==="TON"
                    ? await fetchWalletBalance(tonWalletAddress) * percentage/100
                    :(await getAccountAssetBalance(await getRawAddress(tonWalletAddress), fromCurrency) * percentage/100);
                    setAmount(calculatedAmount.toString()); // Присваиваем округленное значение
                    handleAmountChange(calculatedAmount.toString()); // Обновляем состояние
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1 px-2 rounded"
                    >
                    {percentage}%
              </button>
                ))}
            </div>
    
            {/* Выпадающий список для выбора валюты перевода */}
            <select
              id="fromCurrency"
              value={fromCurrency}
              onChange={(e) => {
                setFromCurrency(e.target.value);
                handleCurrencyChange(e.target.value, toCurrency);
              }}
              className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TON">TON</option>
              <option value="USD₮">USD₮</option>
              <option value="HMSTR">HMSTR</option>
              <option value="NOT">NOT</option>
              <option value="DOGS">DOGS</option>
            </select>

            {/* Отображение суммы в долларах для From */}            
            <p className="text-gray-500 mb-4">
            ≈ ${fromRate}
            </p>

            <div className="flex justify-center mb-4">
            <button
                onClick={handleSwapCurrencies}
                className="bg-gray-200 p-2 rounded-full hover:bg-gray-300 focus:outline-none"
            >
                ⬍ {/* Символ стрелочек */}
            </button>
            </div>
                           
            {/* Выпадающий список для выбора валюты получения */}            
            <select
              id="toCurrency"
              value={toCurrency}
              onChange={(e) => {
                setToCurrency(e.target.value);
                handleCurrencyChange(fromCurrency, e.target.value);
              }}
              className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TON">TON</option>
              <option value="USD₮">USD₮</option>
              <option value="HMSTR">HMSTR</option>
              <option value="NOT">NOT</option>
              <option value="DOGS">DOGS</option>
            </select>
    
            {/* Отображение суммы в долларах для To */}
            
            <p className="text-gray-500 mb-4">
            ≈ ${toRate}
            </p>
            
    
            {/* Отображение курса валют */}
            <p className="mb-4">
              {amountToSwap} {fromCurrency} = {amountInExchanged.toFixed(4)} {toCurrency}
            </p>
    
            {/* Кнопка для выполнения свопа */}
            <button
              onClick={handleSwapTokens}
              className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Swap
            </button>
          </div>
    
          {/* Отображение адреса TON Wallet */}
          {tonWalletAddress && (
            <p className="mt-8 text-sm text-gray-500">Connected Wallet: {formatAddress(tonWalletAddress)}</p>
          )}
        </main>
      );
};

export default Swap;

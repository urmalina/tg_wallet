import { Address } from "@ton/core";
import { JettonAsset, JettonInfo } from "./interfaces";
import {jettons} from './jettons';

export const getRawAddress = async (address: string) => {    
    try {
      const url = `https://toncenter.com/api/v2/unpackAddress?address=${address}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.ok && data.result) {        
        return (data.result).toString();
      } else {
        console.error("Failed to get raw address", data.error);   
        return "";     
      }
    } catch (error) {
      console.error("Failed to get raw address", error); 
      return "";     
    }
  }

    // Функция получения баланса кошелька
    export const fetchWalletBalance = async (address: string) => {
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
   // Форматирование адреса кошелька
   export const formatAddress = (address: string) => {
    const tempAddress = Address.parse(address).toString();
    return `${tempAddress.slice(0, 4)}...${tempAddress.slice(-4)}`;
  };

  export const getAssets = async (rawAddres: string) => {
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

        return jettonAssets;

      } else {
        console.error("Failed to get info about jetton assets");
        return [];
      }
    } catch (error) {
      console.error("Failed to get info about jetton assets", error);
      return [];
    }
  };

    // Функция для получения address по символу токена
    export function getAddressBySymbol(symbol: string): string {
      const token = jettons.jettons.find(jetton => jetton.symbol === symbol);
      return token ? token.address : "";
    } 
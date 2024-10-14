import {jettons} from './jettons';


export function getAddressBySymbol(symbol: string): string {
    const token = jettons.jettons.find(jetton => jetton.symbol === symbol);
    return token ? token.address : "";
  } 
export async function getUsdRate(address:string) {
    try {
        const url = `https://tonapi.io/v2/rates?tokens=${address}&currencies=usd`;
        const response = await fetch(url);
        const data = await response.json();
  
        // if (!data.error) {        
        const usdRate = data.rates[address].prices.USD;
        console.log(`USD Rate: ${usdRate}`);
        //const roundedUsdRate = usdRate.toFixed(4);
        return usdRate;

        // } else {
        //   console.error("Failed to get usd rate", data.error);   
        //   return "";     
        // }
      } catch (error) {
        console.error("Failed to get usd rate", error); 
        return "";     
      }


}
export async function getUsdRateForTon() {
    try {
        const url = `https://tonapi.io/v2/rates?tokens=ton&currencies=usd`;
        const response = await fetch(url);
        const data = await response.json();
  
        // if (!data.error) {        
        const usdRate = data.rates.TON.prices.USD;
        console.log(`USD Rate: ${usdRate} TON`);
        //const roundedUsdRate = usdRate.toFixed(4);
        return usdRate;

        // } else {
        //   console.error("Failed to get usd rate", data.error);   
        //   return "";     
        // }
      } catch (error) {
        console.error("Failed to get usd rate", error); 
        return "";     
      }


}
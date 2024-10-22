// Описание интерфейса JettonAsset
export interface JettonAsset {
    balance: number; 
    name: string; // Название жеттона
    symbol: string; // Символ жеттона (например, DOGS, USD₮)
  }
export interface JettonInfo {
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

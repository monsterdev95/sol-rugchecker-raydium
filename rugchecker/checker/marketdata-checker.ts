import axios from 'axios';
import MarketdataCheckConfig from '../model/config/marketdata-check';
import MarketdataCheckResult from '../model/result/marketdata-check';
export default class MarketdataChecker {
  constructor({ }: MarketdataCheckConfig) { };

  async check(tokenAddress: string): Promise<MarketdataCheckResult> {
    const marketdataResponse = await axios.get('https://api.dexscreener.com/latest/dex/tokens/' + tokenAddress, {
      timeout: 300000,
      responseType: 'json'
    });
    console.log(">> Market data", marketdataResponse.data);
    let marketdataResult = this.createMarketdataCheckResult(marketdataResponse.data.pairs[0]);
    marketdataResult.address = tokenAddress;
    return marketdataResult;
  }

  private createMarketdataCheckResult(marketdata: any): MarketdataCheckResult {
    const marketCheckResult = new MarketdataCheckResult();
    marketCheckResult.priceSol = marketdata.priceNative;
    marketCheckResult.priceUsd = marketdata.priceUsd;
    marketCheckResult.liquidityUsd = marketdata.liquidity.usd;
    marketCheckResult.fdv = marketdata.fdv;
    marketCheckResult.volume24h = marketdata.volume.h24;
    marketCheckResult.volume6h = marketdata.volume.h6;
    marketCheckResult.volume1h = marketdata.volume.h1;
    marketCheckResult.volume5m = marketdata.volume.m5;
    marketCheckResult.priceChange24h = marketdata.priceChange.h24;
    marketCheckResult.priceChange6h = marketdata.priceChange.h6;
    marketCheckResult.priceChange1h = marketdata.priceChange.h1;
    marketCheckResult.priceChange5m = marketdata.priceChange.m5;
    marketCheckResult.buys24h = marketdata.txns.h24.buys;
    marketCheckResult.buys6h = marketdata.txns.h6.buys;
    marketCheckResult.buys1h = marketdata.txns.h1.buys;
    marketCheckResult.buys5m = marketdata.txns.m5.buys;
    marketCheckResult.sells24h = marketdata.txns.h24.sells;
    marketCheckResult.sells6h = marketdata.txns.h6.sells;
    marketCheckResult.sells1h = marketdata.txns.h1.sells;
    marketCheckResult.sells5m = marketdata.txns.m5.sells;
    return marketCheckResult;
  }
}
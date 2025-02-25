import { Connection, PublicKey, ParsedAccountData } from '@solana/web3.js';
// import { promises as fs } from 'fs';
import { LIQUIDITY_STATE_LAYOUT_V4 } from '@raydium-io/raydium-sdk';
import LiquidityCheckConfig from '../model/config/liquidity-check';
import LiquidityCheckResult from '../model/result/liquidity-check';
import { client } from '../../db/db';

export default class LiquidityChecker {
  private connection: Connection;

  // private poolAddress: string;
  constructor({ solanaRpcEndpoint, poolFilePath, poolAddress }: LiquidityCheckConfig, connection?: Connection) {
    if (!solanaRpcEndpoint) {
      solanaRpcEndpoint = `${process.env.HELIUS_BASIC_URL}${process.env.HELIUS_API_KEY}`;
    }
    if (!connection) {
      connection = new Connection(solanaRpcEndpoint);
    }
    this.connection = connection;
  }

  async check(tokenAddress: string, poolAddress: string): Promise<LiquidityCheckResult> {
    const liquidityCheckResult = new LiquidityCheckResult();
    try {
      const acc = await this.connection.getMultipleAccountsInfo([new PublicKey(poolAddress)]);
      if (!acc || acc.length === 0 || !acc[0]) {
        console.warn(`Liquidity pool not found at address: ${poolAddress}`);
        liquidityCheckResult.hasLiquidity = false;
        return liquidityCheckResult;
      }
      const parsed = acc.map((v) => (v ? LIQUIDITY_STATE_LAYOUT_V4.decode(v.data) : null));
      if (!parsed || parsed.length === 0 || !parsed[0]) {
        console.warn(`Could not decode liquidity pool data at address: ${poolAddress}`);
        liquidityCheckResult.hasLiquidity = false;
        return liquidityCheckResult;
      }
      const lpMint = String(parsed[0]?.lpMint);
      const baseVaultBalance = await this.connection.getTokenAccountBalance(parsed[0].baseVault);
      const quoteVaultBalance = await this.connection.getTokenAccountBalance(parsed[0].quoteVault);
      // console.log("###baseVaultBalance", baseVaultBalance);
      // console.log("###quoteVaultBalance", quoteVaultBalance);
      const tokenPrice = await client.query(`SELECT * FROM sol_price WHERE id = 1`);
      const quoteTokenPrice = Number(tokenPrice.rows[0].price);
      const quoteLiquidityAmountInUSD = Number(quoteTokenPrice) * Number(quoteVaultBalance.value.uiAmount);
      const baseTokenPrice = quoteLiquidityAmountInUSD / Number(baseVaultBalance.value.uiAmount);
      console.log("###sol price", quoteTokenPrice);
      let lpReserve = parsed[0]?.lpReserve.toNumber() ?? 0;
      const accInfo = await this.connection.getParsedAccountInfo(new PublicKey(lpMint));
      if (!accInfo || !accInfo.value) {
        console.warn(`Could not fetch parsed account info for LP Mint: ${lpMint}`);
        liquidityCheckResult.hasLiquidity = false;
        return liquidityCheckResult;
      }
      const mintInfo = (accInfo?.value?.data as ParsedAccountData)?.parsed?.info;
      if (!mintInfo) {
        console.warn(`Could not extract mint info from LP Mint data.`);
        liquidityCheckResult.hasLiquidity = false;
        return liquidityCheckResult;
      }
      lpReserve = lpReserve / Math.pow(10, mintInfo?.decimals);
      const actualSupply = mintInfo?.supply / Math.pow(10, mintInfo?.decimals);
      const burnAmt = lpReserve - actualSupply;
      const burnPct = (burnAmt / lpReserve) * 100;
      liquidityCheckResult.isLiquidityLocked = burnPct > 95;
      liquidityCheckResult.burnt = burnPct;
      liquidityCheckResult.liquidityPoolAddress = poolAddress;
      liquidityCheckResult.address = tokenAddress;
      liquidityCheckResult.hasLiquidity = lpReserve > 0;
      liquidityCheckResult.lpReverse = lpReserve;
      liquidityCheckResult.baseTokenPrice = baseTokenPrice;
      liquidityCheckResult.totalLiquidityAmountInUSD = 2 * quoteLiquidityAmountInUSD;
      return liquidityCheckResult;
    }
    catch (error) {
      console.error(`Error checking liquidity for pool ${poolAddress}:`, error);
      liquidityCheckResult.hasLiquidity = false; // Default to false in case of error
      return liquidityCheckResult;
    }
  }

  // async getTokenPriceInUSD(tokenAddress: string): Promise<number> {
  //   try {
  //     // Map known token addresses to CoinGecko IDs
  //     const coingeckoId = 'solana';

  //     if (!coingeckoId) {
  //       console.warn(`No CoinGecko ID found for token address: ${tokenAddress}. Returning placeholder value.`);
  //       return 1; // Placeholder value if CoinGecko ID is not found
  //     }

  //     const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`;
  //     const response = await fetch(apiUrl);
  
  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }
  
  //     const data = await response.json();
  
  //     if (data && data[coingeckoId] && data[coingeckoId].usd) {
  //       return data[coingeckoId].usd;
  //     } else {
  //       console.warn(`Could not fetch price from CoinGecko for ${tokenAddress}. Returning placeholder value.`);
  //       return 1; // Placeholder value if price is not found
  //     }
  
  //   } catch (error) {
  //     console.error(`Error fetching token price for ${tokenAddress}:`, error);
  //     return 1; // Placeholder value in case of error
  //   }
  // }

  // getTokenCoingeckoId(tokenAddress: string): string | null {
  //   switch (tokenAddress) {
  //     case 'So11111111111111111111111111111111111111112': // SOL
  //       return 'solana';
  //     case 'EPjFWdd5AufqALUs2vxyANwzgTrN41EpwLnuVJuobBzU': // USDC (example - replace with actual USDC devnet address if different)
  //       return 'usd-coin';
  //     default:
  //       return null;
  //   }
  // }
}
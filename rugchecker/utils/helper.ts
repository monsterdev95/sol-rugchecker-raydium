import * as solanaWeb3 from '@solana/web3.js';

import { client } from '../../db/db';
import MetadataCheckResult from '../model/result/metadata-check';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function to check if a string is a valid URL
export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
  } catch (_) {
    return false;
  }
  return true;
}

// Helper function to check if social media links exist
export function check_token_social_links(metadata: MetadataCheckResult): boolean {
  try {
    const socialLinks = {
      twitter: metadata.twitter || 'undefined',
      website: metadata.website || 'undefined',
      telegram: metadata.telegram || 'undefined',
    };

    if (Object.values(socialLinks).every(link => link === 'undefined')) {
      console.log("No social media links found.");
      return false;
    } else {
      console.log("Social media links found.");
      return true;
    }
  } catch (_) {
    return false;
  }
}

export async function getSolPriceInUSD() {
  const tokenAddress = process.env.WRAPPED_SOL_TOKEN;
  try {
    // Map known token addresses to CoinGecko IDs
    const coingeckoId = 'solana';

    if (!coingeckoId) {
      console.warn(`No CoinGecko ID found for token address: ${tokenAddress}. Returning placeholder value.`);
      // return 1; // Placeholder value if CoinGecko ID is not found
    }

    const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data[coingeckoId] && data[coingeckoId].usd) {
      const sol_price = await client.query('SELECT * FROM sol_price');
      if (sol_price.rowCount === 0) {
        await client.query(
          `INSERT INTO sol_price (id, price)
          VALUES ($1, $2)`,
          [
            1,
            data[coingeckoId].usd
          ]
        )
      } else {
        await client.query(
          `UPDATE sol_price
          SET price = $1
          WHERE id = $2`,
          [
            data[coingeckoId].usd,
            1
          ]
        )
      }
      // return data[coingeckoId].usd;
    } else {
      console.warn(`Could not fetch price from CoinGecko for ${tokenAddress}. Returning placeholder value.`);
      // return 1; // Placeholder value if price is not found
    }

  } catch (error) {
    console.error(`Error fetching token price for ${tokenAddress}:`, error);
    // return 1; // Placeholder value in case of error
  }
}

export async function saveTokenToDatabase(result: any, mintAccountAddress: string, poolAddress: string, rugInfo: any) {
  await client.query(
    `INSERT INTO new_tokens 
     (dex, name, symbol, token_address, price_usd, liquidity_amount_usd, telegram, website, twitter, risk, score, created_at, pool_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      'Raydium',
      result.metadata.name,
      result.metadata.symbol,
      mintAccountAddress,
      result.liquidity.baseTokenPrice,
      result.liquidity.totalLiquidityAmountInUSD,
      result.metadata.telegram,
      result.metadata.website,
      result.metadata.twitter,
      rugInfo.risks,
      rugInfo.score,
      new Date().toISOString(),
      poolAddress,
    ]
  );
}

export async function removeFromDatabase(id: number) {
  await client.query(
    `DELETE FROM new_tokens
    WHERE id = $1`,
    [
      id
    ]
  );
  return true;
}

export function convertToTokenInfo(result: any, mintAccountAddress: string) {
  const tokenInfo = {
    dex: 'Raydium',
    name: result.metadata.name,
    symbol: result.metadata.symbol,
    token_address: mintAccountAddress,
    telegram: result.metadata.telegram,
    website: result.metadata.website,
    twitter: result.metadata.twitter,
    price_usd: result.liquidity.baseTokenPrice,
    liquidity_amount_usd: result.liquidity.totalLiquidityAmountInUSD
  }
  return tokenInfo;
}
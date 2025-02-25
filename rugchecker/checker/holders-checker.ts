import { Connection, PublicKey, ParsedAccountData } from '@solana/web3.js';
import HoldersCheckConfig from '../model/config/holders-check';
import HoldersCheckResult from '../model/result/holders-check';
import HolderCheckResult from '../model/result/holder-check';
import { getMint } from '@solana/spl-token'

export default class HoldersChecker {
  private connection: Connection;

  constructor({ solanaRpcEndpoint }: HoldersCheckConfig, connection?: Connection) {
    if (!solanaRpcEndpoint) {
      solanaRpcEndpoint = `${process.env.HELIUS_BASIC_URL}${process.env.HELIUS_API_KEY}`;
    }
    if (!connection) {
      connection = new Connection(solanaRpcEndpoint);
    }
    this.connection = connection;
  }

  async check(tokenAddress: string): Promise<HoldersCheckResult> {
    const mintAddress = new PublicKey(tokenAddress);
    const mintAccount = await getMint(this.connection, mintAddress);
    const totalSupply = mintAccount.supply;
    console.log(">> Total Supply", Number(totalSupply));
    const largestHoldersResponse = await this.connection.getTokenLargestAccounts(mintAddress, "confirmed");
    if (largestHoldersResponse.value.length === 0 || totalSupply === null || Number(totalSupply) <= 0) {
      throw new Error('No holders found');
    }
    let whaleSupply = 0;
    let raydiumSupply = 0;
    let topHolders: HolderCheckResult[] = [];
    let topHolderMaxPercentage = 0;
    for (const holder of largestHoldersResponse.value) {
      const tokenAccountsResponse = await this.connection.getParsedAccountInfo(holder.address);
      const walletAddress = (tokenAccountsResponse.value?.data as ParsedAccountData)?.parsed?.info?.owner;
      if (holder.uiAmount !== null && walletAddress !== null && walletAddress !== String(process.env.RAYDIUM_WALLET_ADDRESS)) {
        whaleSupply += holder.uiAmount * Math.pow(10, holder.decimals);
        let topHolder = new HolderCheckResult();
        topHolder.address = walletAddress;
        topHolder.amount = holder.uiAmount * Math.pow(10, holder.decimals);
        topHolder.percentage = (holder.uiAmount * Math.pow(10, holder.decimals) / Number(totalSupply)) * 100;
        topHolders.push(topHolder);
      } else if (holder.uiAmount !== null && walletAddress === String(process.env.RAYDIUM_WALLET_ADDRESS)) {
        raydiumSupply += holder.uiAmount * Math.pow(10, holder.decimals);
      } else {
        console.error('Holder data not correct', holder);
      }
    }
    const raydiumPercentage = (raydiumSupply / Number(totalSupply)) * 100;
    const topHoldersPercentage = (whaleSupply / Number(totalSupply)) * 100;
    const holdersCheckResult = new HoldersCheckResult();
    holdersCheckResult.topHolders = topHolders;
    holdersCheckResult.topHoldersPercentage = topHoldersPercentage;
    holdersCheckResult.raydiumPercentage = raydiumPercentage;
    holdersCheckResult.address = tokenAddress;
    // console.log(holdersCheckResult)
    return holdersCheckResult;
  }
}

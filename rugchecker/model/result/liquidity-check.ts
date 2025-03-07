export default class LiquidityCheckResult {
  address: string;
  isLiquidityLocked: boolean;
  burnt: number;
  liquidityPoolAddress: string;
  hasLiquidity: boolean;
  lpReverse: number;
  totalLiquidityAmountInUSD: number;
  baseTokenPrice: number;
}
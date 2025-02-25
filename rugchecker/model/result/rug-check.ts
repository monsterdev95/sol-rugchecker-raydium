import HoldersCheckConfig from "../config/holders-check";
import HoldersCheckResult from "./holders-check";
import MarketdataCheckResult from "./marketdata-check";
import MetadataCheckResult from "./metadata-check";
import LiquidityCheckResult from "./liquidity-check";

export default class RugCheckResult {
  address: string;
  metadata: MetadataCheckResult;
  holders: HoldersCheckResult;
  liquidity: LiquidityCheckResult;
  marketdata: MarketdataCheckResult;
}
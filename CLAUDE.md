# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Venus Isolated Pools - A DeFi protocol implementing isolated lending pools on multiple EVM chains. Fork of Compound Protocol with Venus-specific enhancements for risk management and multi-pool architecture.

## Build & Development Commands

### Package Management
- Use `yarn` for package management (specified in packageManager field)
- Install: `yarn install`
- Postinstall runs `yarn patch-package` automatically

### Testing
- Run all tests: `yarn test`
- Integration tests: `yarn test:integration`
- Fork tests: `yarn test:fork` (requires FORK=true, FORKED_NETWORK, and ARCHIVE_NODE_* in .env)
- Coverage: `yarn hardhat:coverage`
- Gas reporting: `REPORT_GAS=true npx hardhat test`

### Compilation
- Standard: `yarn compile` (compiles for both regular and zkSync)
- Hardhat only: `yarn hardhat:compile`
- Clean build artifacts: `yarn clean`

### Linting & Formatting
- Lint all: `yarn lint`
- Solidity: `yarn lint:sol` (fix: `yarn lint:sol:fix`)
- TypeScript: `yarn lint:ts` (fix: `yarn lint:ts:fix`)
- Format all: `yarn prettier`
- Check formatting: `yarn prettier:check`

### Build for Distribution
- `yarn build` - Removes dist/, compiles contracts (both configs), generates TypeScript types

### Documentation
- Generate: `yarn docgen` (uses solidity-docgen with custom templates in docgen-templates/)

### Deployment
- Deploy all: `npx hardhat deploy`
- Network-specific: `npx hardhat deploy --network <network_name>`
- Tagged deployments: `npx hardhat deploy --tags "<tag_name>"`
- Fork simulation: `HARDHAT_FORK_NETWORK=ethereum npx hardhat deploy`
- Export deployment summary: `yarn hardhat export --network <network> --export ./deployments/<network>.json`

### Verification
- Verify contract: `npx hardhat verify --network <network> <address> <constructor-args>`
- Requires ETHERSCAN_API_KEY in .env

## Architecture

### Core Components

**PoolRegistry** (contracts/Pool/PoolRegistry.sol)
- Central registry for all isolated pools
- Manages pool registration, market addition, metadata
- Each pool is independent with custom risk parameters

**Comptroller** (contracts/Comptroller.sol)
- One per pool, validates all market operations (mint/redeem/borrow/repay/liquidate)
- Checks liquidity via collateral factors and liquidation thresholds
- Manages rewards distribution hooks
- Special functions:
  - `healAccount()`: Seizes collateral when debt > collateral value, creates badDebt
  - `liquidateAccount()`: Full liquidation when collateral covers debt + incentive

**VToken** (contracts/VToken.sol)
- One per asset per pool (e.g., vUSDC, vETH)
- Users mint vTokens by supplying underlying assets
- Exchange rate changes over time based on interest accrual
- Supports borrow/repay/liquidate operations
- Must enter market to use as collateral

**Risk Fund System** (contracts/legacy/RiskFund/)
- `ProtocolShareReserve`: Receives reserves from vToken.reduceReserves()
- `RiskFund`: Holds 50% of reserves (other 50% to protocolIncome)
- Swaps tokens to convertibleBaseAsset via PancakeSwap
- Isolated per pool

**Shortfall** (contracts/Shortfall/)
- Auctions convertibleBaseAsset from RiskFund to cover bad debt
- Triggered when pool bad debt >= minimumPoolBadDebt (default 1000 USD)
- Auction mechanics:
  - If risk fund < debt: Winner pays most debt percentage for full risk fund
  - If risk fund > debt: Winner takes least risk fund percentage to pay all debt

**RewardsDistributor** (contracts/Rewards/RewardsDistributor.sol)
- One per reward token per pool
- Sets supply/borrow speeds per market (tokens per block)
- Manual claim via claimRewardToken()

**PoolLens** (contracts/Lens/PoolLens.sol)
- View functions for pool/market data, vToken balances, prices, metadata
- getAllPools() returns all pools

### Interest Rate Models
- WhitePaperInterestRateModel: Basic linear model
- JumpRateModelV2: Jumps at kink utilization
- TwoKinksInterestRateModel: Two kinks for more granular control

### Multi-Chain Support
- Regular EVM: bscmainnet, bsctestnet, ethereum, sepolia, opbnb, arbitrum, optimism, base, unichain
- zkSync: Separate hardhat.config.zksync.ts with zkSync compiler plugins
- Network configs in hardhat.config.ts networks section
- External deployments imported from @venusprotocol packages

## Testing Patterns

### Fork Testing
- Uses hardhat network forking with ARCHIVE_NODE_* env vars
- Utilities in tests/hardhat/Fork/utils.ts:
  - `forking(blockNumber, fn)`: Run tests at specific block
  - `setForkBlock(blockNumber)`: Reset fork to block
- Contract addresses in tests/hardhat/Fork/constants.ts

### Test Organization
- tests/hardhat/: Unit tests per contract/feature
- tests/hardhat/Fork/: Fork tests against live networks
- tests/integration/: Integration test suite
- Uses Mocha (describe/it), Chai matchers, hardhat-network-helpers

### Helpers
- helpers/utils.ts: Common test utilities (convertToUnit, etc.)
- helpers/deploymentUtils.ts: Deployment helpers
- helpers/rateModelHelpers.ts: Interest rate model utilities

## Deployment System

### Hardhat Deploy
- Scripts in deploy/ with numerical prefixes (010-, 020-, etc.)
- Tag-based execution: Add `func.tags = ["TagName"]` to scripts
- Skip conditions: `func.skip = async (hre) => hre.network.name !== "target"`
- Named accounts: deployer, acc1-3, proxyAdmin (in hardhat.config.ts)

### Custom Tasks
- `addMarket`: Add market to existing pool
- `deployComptroller`: Deploy Comptroller implementation
- `createPool`: Create pool via PoolRegistry

### Environment Variables
- DEPLOYER_PRIVATE_KEY: Deployer account
- ARCHIVE_NODE_<network>: RPC URLs for each network
- ETHERSCAN_API_KEY: For contract verification
- HARDHAT_FORK_NETWORK: Network to fork for local testing
- HARDHAT_FORK_NUMBER: Specific block to fork
- REPORT_GAS: Enable gas reporting

## Solidity Details

### Compiler Versions
- Primary: 0.8.25 (Paris EVM, optimizer enabled)
- Legacy: 0.6.6, 0.5.16 (for dependencies)
- Storage layouts exported for all contracts

### Dependencies
- @openzeppelin/contracts 4.8.3 (not upgradeable)
- @openzeppelin/contracts-upgradeable 4.8.3
- @venusprotocol/solidity-utilities 2.1.0
- Compound Protocol fork base: https://github.com/compound-finance/compound-protocol/tree/a3214f67b73310d547e00fc578e8355911c9d376

### Contract Patterns
- Upgradeable proxies via OpenZeppelin (OptimizedTransparentUpgradeableProxy)
- Access control via AccessControlManager
- Storage patterns from Compound (ComptrollerStorage, etc.)
- ErrorReporter for standardized errors

## Key Concepts

### Collateral Factor vs Liquidation Threshold
- Collateral factor: Max borrow percentage of collateral value
- Liquidation threshold: Borrow percentage above which liquidation is allowed
- Always: collateral factor < liquidation threshold

### Market Entry
- Users must "enter market" to use vTokens as collateral
- Can borrow other assets in same pool once entered
- Each vToken requires separate market entry

### Bad Debt Flow
1. Borrower shortfall detected → interest accrual halted
2. Balance written off, bad debt tracked
3. When bad debt >= minimumPoolBadDebt → auction eligible
4. Shortfall auction sells risk fund for bad debt repayment
5. healAccount() vs liquidateAccount() based on collateral coverage

### Isolated Pools Rationale
- Risk isolation: Asset failure in one pool doesn't affect others
- Custom risk parameters per pool
- Easier new token listings
- Per-pool reward customization

## Critical Deployment Patterns

### PancakeV2TWAPOracle Initialization

**CRITICAL**: TWAP oracles require 2-step setup before assets can be borrowed/supplied:

1. `addPair(asset, lpPair)` - Adds pair configuration, sets `initialized: false`
2. `updateAssetPrice(asset)` - **REQUIRED** - Sets `initialized: true` and calculates initial TWAP

**Failure mode**: If `updateAssetPrice()` not called after `addPair()`, all borrow/supply transactions will revert with `NotInitialized()` when Comptroller tries to fetch price.

**Example** (scripts/add-tkn-to-oracle.ts):
```typescript
// Add pair
const tx = await oracle.addPair(TKN, TKN_USDT_LP);
await tx.wait();

// Initialize price (REQUIRED before oracle can be used)
const tx2 = await oracle.updateAssetPrice(TKN);
await tx2.wait();
```

**Root cause reference**: Transaction 0xe9d5296df82d109dcd151f97cab80e6ba297ecd400701ecb3e017ef64a78c495 failed due to missing price initialization for MockTKN.

**Code location**: contracts/Oracle/PancakeV2TWAPOracle.sol:206 (`NotInitialized()` revert in `_getPriceUsdt()`)
## RewardsDistributor (bsctestnet, TransparentUpgradeableProxy)

Deployment in this fork uses a TransparentUpgradeableProxy with a dedicated ProxyAdmin (so the deployer can call the implementation through the proxy).

Script:
- `scripts/deploy-rewards-distributor-alpha-proxy.ts`

Flow:
1) Deploy `RewardsDistributorImpl` with `args: [isTimeBased, blocksPerYear]`
2) Deploy `ProxyAdmin_Alpha` with `args: [deployer]`
3) Deploy proxy `RewardsDistributor_Alpha_Proxy_Admin` with:
   - `proxyContract: "OptimizedTransparentUpgradeableProxy"`
   - `owner: ProxyAdmin_Alpha.address`
   - `execute.initialize(comptroller, rewardToken, maxLoopsLimit, accessControlManager)`

Latest bsctestnet proxy:
- `0x7D00000372E19c8D409067B3802554976a175b84`

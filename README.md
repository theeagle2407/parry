# Parry

Product feedback with funded reward pools.

## Install and run

```sh
npm ci
npm run build
npm test
npm run dev
```

Browse http://localhost:3000. Regular users do not deploy contracts. Navigation contains Explore, My activity, Profile, How it works and Create review.

## One-time platform deployment

A deployed escrow is required before any funding transaction can occur. This is a platform operator task, not participant onboarding.

For the easiest Arbitrum Sepolia test, use ETH rewards:

1. Obtain Arbitrum Sepolia test ETH in the operator wallet.
2. Open http://localhost:3000/operator.html (not linked from participant navigation).
3. Click **Deploy ETH pool**, connect the operator wallet, and confirm the deployment transaction.
4. Click **Download platform config**.
5. Move the downloaded `config.json` into this project's `public/config.json`, replacing the empty file. Refresh the main application.

All users of that installation now use the same configured pool. Creating a review submits one ETH funding transaction. The review appears after confirmation, with its explorer link. ETH amounts are denominated in ETH, never displayed as dollars.

For ERC20 rewards, the existing two-contract deployment creates a freely mintable pUSD test token and its pool. Or connect a deployed ReviewPool with its exact token address and deployment block. Download the resulting config. The interface reads the token's decimals and symbol; it does not treat arbitrary similarly named USD tokens as interchangeable. Existing ReviewPool contracts can continue serving their original reviews; native ETH support requires this contract version.

No private key is requested by the project. Wallets approve transactions. This contract has not been audited; use only test assets.

## Profile and earnings

Profile details are device-local and editable. Claimed earnings and claimable rewards are read from the configured contract. Top 3 contributors are ranked by total Claimed event amounts on that contract, with wallet address as the tie breaker. The complete scan begins at the configured deployment block. Failed scans show unavailable, not invented zeroes. Large histories need an indexer in a later release.

Rankings do not represent review quality or unique humans. Assets from different contracts are not mixed or converted to dollars.

## Reward rules

- Creator funds the immutable brief and deadline.
- One submission commitment per wallet before the deadline; creator cannot submit.
- Creator selects up to 50 winners within seven days after deadline.
- Entire pool must be allocated to submitted wallets.
- Winners claim their own amounts; duplicate claims fail.
- Unresolved pools are refundable to the creator after the seven-day resolution window.
- ETH uses payable funding; ERC20 may require an exact allowance approval before funding.
- Positive sentiment does not determine award eligibility.

## Remaining limitations

Briefs, screenshots and profile details are stored in the current browser. Shared backend storage and signed server authentication remain pending. The operator page retains workspace export/import for testing across browsers, but these tools are removed from participant navigation. Imported feedback content requires comparison against its onchain commitment before trusting authorship. Nothing in this release guarantees a production-ready or decentralised content service.

Four fictional product pages support testing without external affiliations. They are not funded campaigns. Deployment on public Arbitrum Sepolia and an end-to-end real wallet test must be completed by the operator.

## Validation

Run `npm test` for local EVM tests of ERC20 and native ETH flows. JavaScript syntax and HTTP routes are checked during packaging. Browser automation was unavailable in the build environment; do not interpret contract test results as browser acceptance or security audit results.

## Payment hardening update (v4)

Removed contributor rankings. Preserves exact entered reward amounts, checks award totals before submission, reads deadlines from chain time, supports confirmed/replaced transaction receipts and interrupted-record recovery. Earnings are scoped to the connected wallet. See [payment setup and acceptance steps](docs/PAYMENTS.md).

Run `node scripts/check-deployment.mjs` after configuring your deployed contract. An empty config is intentionally not a deployment. Tests exercise local EVM transfers; no live deployment is claimed by this package.

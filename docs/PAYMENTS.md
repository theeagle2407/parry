# Funding and payment verification

## Implemented

A creator deposits the exact reward amount into ReviewPool on Arbitrum Sepolia. The configured pool accepts one asset: native ETH or a specific ERC-20. ETH uses a payable transaction. ERC-20 funding requires sufficient allowance and a successful transfer; an approval alone does not fund a review. Network gas is separate from the reward amount.

The immutable asset address prevents paying awards in a different token. Submissions commit a content hash before the deadline. Only the creator can allocate the entire pool to submitted wallets during the seven-day award window. Winners withdraw their own allocations. An unresolved pool becomes refundable to its creator after that window. Allocated awards cannot be refunded. Claim and refund transfers use reentrancy protection and clear entitlement before external payment.

The contract does not evaluate feedback quality, identify unique humans, guarantee an award or arbitrate disputes. Creator discretion and timeout refunds are explicit product rules.

## One-time setup

1. Run the app and open `/operator.html`.
2. Connect your wallet with Arbitrum Sepolia ETH for gas.
3. Click **Deploy ETH pool** once. Confirm the deployment and wait for its receipt. If you already deployed the v3 contract, reuse its address instead; this update does not change its Solidity logic.
4. Download platform config and copy it into `public/config.json`.
5. Run `node scripts/check-deployment.mjs`. This checks the chain, contract response, asset and deployment block. It does not independently authenticate the deployed bytecode.
6. Reload the app. Users fund reviews through this shared contract, without deploying contracts themselves.

Do not call test ETH real dollars. The demo uses blockchain transactions with test assets, not monetary-value payouts.

## Two-wallet acceptance recording

Use two accounts in the same browser for this local build because review text/screenshots are stored there.

1. Creator A: create a brief with a deadline about five minutes ahead and a small reward such as 0.001 ETH. Record the funding transaction URL and reward contract address.
2. Confirm the transaction succeeds on the explorer. Check the contract pool amount equals 0.001 ETH. Gas is not included in that reward amount.
3. Reviewer B: switch wallet account, join the funded review and submit feedback with a screenshot before the deadline. Record the submission transaction.
4. Wait for the real deadline. Do not change your computer clock. Creator A: select B and allocate exactly 0.001 ETH. Record the allocation transaction.
5. Reviewer B: claim. Record the claim transaction; the Claimed event should name B and 0.001 ETH. B's net wallet balance change also includes gas paid for claiming.
6. Confirm claimable balance is zero and a second claim cannot succeed. Check claimed earnings on the profile.
7. Refunds are tested locally with EVM time advancement. Do not represent that as a completed seven-day testnet refund.

## Interrupted transactions

A record is saved before requesting funding or submission. If confirmation is interrupted, check the transaction explorer first. Use **My activity → Recover interrupted submission** with the original wallet. Recovery only restores records that match onchain state. Do not fund a replacement review merely because an RPC response timed out.

## Remaining release work

- Deploy and complete the two-wallet test on Arbitrum Sepolia; save explorer links.
- Verify Solidity source on the explorer with compiler 0.8.30, optimizer 200 runs, EVM Paris and the actual constructor asset address.
- Implement shared durable storage for briefs, screenshots and profiles before claiming an open multi-user marketplace. Currently these are browser-local; onchain hashes are not downloadable content.
- Obtain independent contract review before accepting assets with real monetary value. Local tests are not an audit.
- Record real product testers and feedback; working payments alone do not establish demand or guarantee a hackathon result.

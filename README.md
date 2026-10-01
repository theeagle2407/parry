# Parry

**Fund product feedback. Review the evidence. Reward the contributors.**

Parry helps product teams run structured review challenges with USDG rewards on Arbitrum. Creators fund a prize pool before collecting feedback. Reviewers submit observations, suggestions and screenshots privately. After the deadline, the creator selects winners, who claim their awards directly from the contract.

[Open Parry](https://parry-vyp5.onrender.com/) · [USDG reward contract](https://sepolia.arbiscan.io/address/0x904f247794A68F83Ec90F441718B88f67d99e98c) · [Repository](https://github.com/theeagle2407/parry)

> Deployed on Arbitrum Sepolia. Rewards use official test-network USDG; ETH pays network fees. Practice challenges are separate from funded challenges and do not pay rewards.

## Why Parry

Early product teams need specific feedback they can act on: what someone tried, what went wrong and what should change. Collecting that evidence across messages, forms and payment tools makes it difficult to keep the brief, submission and reward decision together.

Parry brings that workflow into one place. Its initial audience is small product teams and independent builders running product reviews, usability tests or technical reviews with wallet-connected contributors.

The blockchain has a defined role: it holds the reward pool, records commitments to the brief and submissions, and enforces allocation, claim and refund rules. Review text and screenshots remain offchain, with access controlled by the application.

## The workflow

| Stage | Creator | Reviewer |
| --- | --- | --- |
| Publish | Add a product link, tasks, audience, selection criteria, deadline and USDG prize pool. Approve and confirm funding. | Browse challenges without connecting a wallet. |
| Participate | View submissions to your challenge after wallet sign-in. | Connect, sign in, try the product and submit feedback with optional screenshots or an evidence link. |
| Select | After the deadline, choose eligible contributors and allocate the entire pool. | View your own submission; other reviewers' submissions stay private. |
| Claim | Follow the recorded allocation and payment transactions. | Claim an allocated reward and view its transaction receipt. |

Creators do not deploy contracts. The application uses the platform's existing reward contract.

## What is built

- **USDG-funded challenges:** token decimals and balances are read from the contract; funding uses an allowance approval when needed.
- **Structured feedback:** observations, suggestions, ratings, evidence links and screenshots.
- **Private submissions:** each reviewer can access their own feedback; the creator can access submissions to their challenge.
- **Wallet authentication:** expiring, browser-bound sign-in challenges and server sessions, distinct from payment approval.
- **Submission commitments:** one onchain submission per wallet per challenge; creators cannot submit to their own challenge.
- **Winner selection and claims:** creator-selected awards, exact allocation checks and recipient-initiated withdrawals.
- **Transaction feedback:** success is shown after confirmation; replacement and cancellation cases are handled.
- **Profile and earnings:** wallet details, sign-out and contract-derived earnings, separated by reward asset.
- **Durable storage:** funded briefs and submissions persist in Supabase across application restarts.
- **Legacy access:** previous ETH challenges remain available in History with their original records and currency.

Practice product pages provide a way to explore the review interface. Their displayed prize amounts are illustrative. Practice reviews stay in the current browser and are not submitted to the reward contract or shared with a creator.

## USDG deployment

| Item | Value |
| --- | --- |
| Network | Arbitrum Sepolia |
| Chain ID | `421614` |
| Reward asset | Official Paxos test-network USDG |
| USDG token | [`0xFFC95faa3d63Cde504a05B567C600B78C0b41892`](https://sepolia.arbiscan.io/address/0xFFC95faa3d63Cde504a05B567C600B78C0b41892) |
| Token decimals | `6` |
| Parry USDG pool | [`0x904f247794A68F83Ec90F441718B88f67d99e98c`](https://sepolia.arbiscan.io/address/0x904f247794A68F83Ec90F441718B88f67d99e98c) |
| Deployment transaction | [`0x461d8f6a…1ba496e`](https://sepolia.arbiscan.io/tx/0x461d8f6a0065544f1fa49631b4d9c6fa2a09f89f3b968a3c9f39c9ebf1ba496e) |
| Legacy ETH pool | [`0x1A8c68d2Fb13C1512AE03b0879e9b392Ad947105`](https://sepolia.arbiscan.io/address/0x1A8c68d2Fb13C1512AE03b0879e9b392Ad947105) |

Addresses and deployment records are maintained in `public/config.json` and `deployments/`. Each challenge remains bound to its original pool and asset. Changing the default token does not convert earlier deposits.

USDG resources: [Paxos network addresses](https://docs.paxos.com/guides/stablecoin/usdg/testnet) · [Paxos test faucet](https://faucet.paxos.com/) · [USDG source](https://github.com/paxosglobal/usdg-contract)

## Contract rules

`ReviewPool.sol` enforces the following lifecycle:

1. **Fund:** a creator deposits the reward and commits to the brief. The deadline must be in the future and no more than 90 days away.
2. **Submit:** each non-creator wallet can record one nonzero submission hash before the deadline.
3. **Resolve:** only the creator can allocate awards, after the deadline and within the following seven days. There may be 1–50 distinct winners, each of whom must have submitted. Positive awards must sum to the entire deposited pool.
4. **Claim:** recipients withdraw their own allocated amounts. Claimable balances are cleared before payment; repeated claims cannot withdraw again.
5. **Refund:** after the seven-day resolution window, the creator can recover an unresolved pool.

Token transfers use OpenZeppelin `SafeERC20`. Funding, claims and refunds use a reentrancy guard. ERC-20 funding rejects deposits whose received balance differs from the requested amount.

**Escrow does not guarantee fair judging.** The creator chooses winners, and the contract does not evaluate feedback quality. There is no dispute or independent arbitration mechanism. A submission does not guarantee an award.

## Architecture

| Layer | Implementation | Responsibility |
| --- | --- | --- |
| Interface | HTML, CSS, JavaScript modules, ethers | Challenge discovery, forms, wallet interaction and transaction status |
| Application server | Node.js HTTP server | Static assets, authentication and authorized workspace access |
| Authentication | Signed wallet messages; HttpOnly cookies | Bind an expiring session to a wallet and browser |
| Durable records | Supabase Postgres | Store funded briefs and private submissions, including screenshot data |
| Chain verification | ethers and Arbitrum RPC | Validate stored records against the configured pools and content commitments |
| Rewards | Solidity and OpenZeppelin | Escrow, submission commitments, allocations, claims and refunds |
| Hosting | Render web service | Run the application with Supabase-backed persistence |

The browser accesses private records through Parry's server, not directly through Supabase. Database row-level security is enabled, public access is revoked and the privileged Supabase key stays on the server.

Records are stored as JSON **text** to preserve property order used by existing content hashes. Database writes reject conflicting replacements. Review hashes establish a content commitment; they do not prove that a review is accurate or useful.

## Run locally

Requires Node.js 22 and npm. A browser wallet is needed for funded participation, but not browsing.

```bash
git clone https://github.com/theeagle2407/parry.git
cd parry
npm ci
npm run build
npm test
npm run dev
```

Open `http://localhost:3000`.

Without Supabase settings, local development uses `data/records.json`. A fresh clone does not contain the hosted installation's private records. The supplied contract configuration points to existing deployments; running the application does not require another contract deployment.

### Enable durable storage

1. Create a Supabase project.
2. Run `docs/supabase-setup.sql` in its SQL Editor.
3. Configure the server credentials privately:

```bash
python3 scripts/setup-storage.py
node --env-file=.env.local scripts/check-storage.mjs
```

If upgrading an installation with existing local records, migrate them before deployment:

```bash
node --env-file=.env.local scripts/migrate-storage.mjs
```

Migration verifies records against their onchain commitments, uploads briefs before reviews and preserves local files. Re-running skips identical records.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Server-only secret key; never expose in frontend code |
| `SUPABASE_SERVICE_ROLE_KEY` | Supported legacy alternative to the secret key |
| `PARRY_PUBLIC_ORIGIN` | Exact allowed origin, without a trailing slash; required when using a custom domain |
| `PARRY_RPC_URL` | Optional server-side Arbitrum Sepolia RPC override |
| `PARRY_DATA_DIR` | Optional local record directory when Supabase is not configured |
| `HOST` | Set to `0.0.0.0` on Render |
| `PORT` | Supplied by the hosting platform; defaults to `3000` locally |

Local credentials are stored in the ignored `.env.local` file. Production credentials belong in the hosting provider's environment settings. Do not commit secrets or local submission data.

## Deploy

`render.yaml` defines a Free Node web service with:

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health-check path: `/healthz`
- Supabase URL and secret supplied through private environment variables

The server uses Render's `RENDER_EXTERNAL_URL` for its sign-in origin unless `PARRY_PUBLIC_ORIGIN` is set. Production startup requires Supabase configuration and a successful storage read; it does not silently fall back to an ephemeral local file.

Wallet sessions are held in server memory. Use a single application instance. Restarting requires signing in again, while stored briefs and submissions remain available. Free hosting may sleep or pause after inactivity and is subject to provider quotas.

## Verify the application

```bash
npm test
npm run build
node scripts/check-deployment.mjs
node --env-file=.env.local scripts/check-storage.mjs
```

The test suite covers contract funding, submissions, awards, claims, refunds, pool isolation, authentication, private access, immutable records, transaction confirmations, deadlines, durable-storage serialization and navigation behavior.

Local contract tests use a local EVM and test assets. They are not an audit of Parry or a live test of Paxos infrastructure. The deployment check confirms configuration and contract responses, not a completed reward payment.

### Judge walkthrough

1. Open the live application and inspect a funded USDG challenge.
2. Read its tasks, selection criteria, deadline and funding transaction.
3. In a separate reviewer browser profile, connect and sign in, then submit feedback before the deadline.
4. Return as the creator to inspect submissions privately.
5. After the deadline, allocate the full pool to eligible contributors.
6. Return as a selected reviewer, claim the reward and inspect the confirmed transaction.
7. Open Profile to inspect earnings and History to inspect earlier ETH challenges.

For a short demonstration, prepare a funded challenge and reviewer submission ahead of time so the deadline has passed when recording allocation and claim. Use a separate open challenge to demonstrate submission. Explain the two stages rather than implying an expired challenge still accepts reviews.

## Repository guide

| Path | Contents |
| --- | --- |
| `contracts/ReviewPool.sol` | Reward escrow and local testing token |
| `public/` | Application, practice product pages, public configuration and contract artifacts |
| `server.mjs` | HTTP application entry point |
| `private-access.mjs`, `private-api.mjs` | Wallet authentication and submission access rules |
| `shared-store.mjs` | Local persistence and onchain record verification |
| `supabase-store.mjs` | Server-only durable storage adapter |
| `scripts/` | Compilation, deployment, storage setup and migration utilities |
| `test/` | Automated contract, privacy, storage and interface-logic checks |
| `deployments/` | Public contract deployment records |
| `docs/supabase-setup.sql` | Database schema and access restrictions |
| `render.yaml` | Hosting configuration |

`ReviewToken` is a freely mintable local test fixture. It is **not USDG** and is not the asset used by the current hosted reward pool.

## Current boundaries

- The deployment uses test-network assets and is not audited for production funds.
- Wallet uniqueness is not human uniqueness; one person may control multiple wallets.
- Creators select winners. There is no appeal process or guarantee of payment for every review.
- Submission privacy is application-enforced, not end-to-end encryption. The server operator can access stored records; onchain wallets, commitments and payment events are public.
- Supabase storage is capped by the application at 500 briefs, 500 submissions and 64 MB of record data. Larger deployments need a different screenshot-storage and indexing strategy.
- Profile information and practice reviews are browser-local. Clearing browser storage removes those local records.
- Earnings rely on RPC event queries; unavailable RPC data is not replaced with estimated balances.
- USDG issuer controls and underlying network availability remain external dependencies.

## Next milestones

Validate the workflow with independent product teams, measure the usefulness of submitted feedback and repeat usage, commission a contract security review, and improve indexing and storage before a production launch.

Built for the **Arbitrum Open House Singapore Online Buildathon**.

# Agent Wall

A daily check-in wall that only **Agent ID** holders can write on — built for the
[Binance Agent ID Hackathon](https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf)
(submission 18 Nov – 9 Dec 2026 08:00 UTC, 60,000 USDC pool).

## What it is

One wall, one check-in per day. An Agent ID holder connects a wallet, writes a
short message (max 280 chars), and the contract records it on BNB Chain plus a
daily streak (UTC days). The wall feed and the streak leaderboard are readable
by anyone.

## How Agent ID is used (the core integration)

- **Access control / identity:** `checkIn()` calls `balanceOf(msg.sender)` on the
  Agent ID contract (`0x60b9262456de011f7d15a54cdd8c48baaa8b022f`, SPACE ID Agent
  ID, ERC-721, non-transferable). Only addresses holding an Agent ID can post.
  No Agent ID, no wall — the revert is `Agent ID required`.
- **Identity on the wall:** every message and streak is keyed to the holder's
  address, i.e. to their Agent ID. The wall is a public, verifiable record of
  which agents showed up, and how consistently.

## Contract rules

- `checkIn(string message)` — message 1–280 chars. First check-in starts a
  streak of 1. Same UTC day: message updates, streak unchanged. Next
  consecutive UTC day: streak +1. A missed day resets the streak to 1.
- `CheckedIn(agent, day, streak, message)` event on every check-in — the wall
  feed is built from these events.
- `getAgent(address)` → `(streak, lastDay, lastMessage, totalCheckIns)`;
  `totalAgents()` → distinct addresses that ever checked in.
- **No owner, no admin, no fees, no token, no promised returns.** The contract
  holds no funds and cannot move anyone's assets. There is nothing to approve.

## Hackathon red-line compliance

- No QR-code / pairing-code login anywhere (frontend uses the user's own
  injected wallet or standard WalletConnect for their own EOA — never an
  Agentic Wallet sign-in).
- No prompt or skill bypasses transaction confirmation: every check-in is a
  normal transaction the user confirms in their own wallet.
- No unauthorized transfers, no hidden approvals, no asset movement at all.
- Contract is open-source (this repo) and will be source-verified on BscScan;
  the only permission in the system is "Agent ID holder", documented above.
- No Binance/BNB branding in the project name or domain. No seed phrases,
  private keys, API secrets, or pairing codes collected. No promised returns.
  Not a trading product, so no trading risk warning applies; the frontend does
  warn that check-in is an on-chain transaction with a small gas cost.

## Repo layout

```
contracts/AgentWall.sol      the contract (single file, already flat)
contracts/MockAgentID.sol    balanceOf mock — LOCAL TESTING ONLY, never deploy
scripts/compile.js           solc-js compile -> build/ (ABI, bytecode, standard JSON)
scripts/test-local.js        full local test on Ganache (17 checks incl. gas)
scripts/smoke-frontend.js    frontend read-path smoke test (feed + leaderboard)
scripts/debug-local.js       minimal deploy-and-call debug helper
scripts/deploy-mainnet.js    deploy to BNB Chain (DO NOT run without approval)
frontend/                    static site: index.html + config.js + app.js
build/                       compiled outputs (ABI, bytecode, standard JSON,
                             AgentWall.flattened.sol for BscScan verification)
README.md  SUBMISSION.md     this file; draft hackathon submission materials
GAS.md                       measured gas numbers
```

## Build, test, run locally

```bash
npm install
node scripts/compile.js      # writes build/
node scripts/test-local.js   # 17/17 checks on Ganache, prints gas
node scripts/smoke-frontend.js
```

Serve the frontend statically (it is only HTML/JS):

```bash
cd frontend && python3 -m http.server 8080
```

Before the contract is deployed, `config.js` has a zero address and the page
shows "not deployed yet" with the check-in form disabled.

## Deploy (for the parent agent — NOT done yet)

1. Deploy from a wallet holding BNB for gas (~460k gas; ~0.000023 BNB at
   0.05 gwei — see GAS.md). Preview the transaction and get explicit user
   approval first; never deploy from a script holding a private key in a file.
2. `RPC_URL=... DEPLOYER_KEY=... node scripts/deploy-mainnet.js` — prints the
   contract address and deployment block.
3. Verify source on BscScan with `build/standard-json-input.json`
   (Solidity 0.8.28, optimizer on, runs 1, evmVersion paris) or
   `build/AgentWall.flattened.sol`.
4. Fill `frontend/config.js`: `agentWallAddress` + `deploymentBlock`.
5. Host `frontend/` somewhere static and submit the project (see SUBMISSION.md).

## Status

- [x] Contract written, compiled (solc 0.8.28, evmVersion paris, optimizer runs 1)
- [x] Local tests 17/17 on Ganache (streaks, reverts, events, leaderboard)
- [x] Frontend written + read-path smoke-tested; serves over HTTP
- [ ] Deploy to BNB Chain (needs approval + deployer preview)
- [ ] BscScan source verification
- [ ] Frontend hosted + `config.js` filled in
- [ ] Hackathon submission (needs project website URL)
- [ ] Outreach: 30 distinct Agent ID holders must interact during the
      submission period (Innovation Award eligibility threshold)

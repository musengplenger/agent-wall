# Agent Wall — gas measurements

Measured on local Ganache with the production build
(solc 0.8.28, optimizer on, runs 1, evmVersion paris).
BSC gas price at check time: **0.05 gwei**. BNB price used: **$587**.

| Operation | Gas | Cost @ 0.05 gwei | Cost @ 1 gwei |
|---|---|---|---|
| Deploy AgentWall | 460,056 | 0.0000230 BNB (~$0.014) | 0.000460 BNB (~$0.27) |
| First checkIn (new agent) | 141,731 | 0.0000071 BNB (~$0.004) | 0.000142 BNB (~$0.08) |
| Same-day checkIn | 45,370 | 0.0000023 BNB (~$0.001) | 0.000045 BNB (~$0.03) |
| Next-day checkIn | 51,496 | 0.0000026 BNB (~$0.0015) | 0.000051 BNB (~$0.03) |

Notes:
- Deploy is under the 500k gas target (460,056).
- First check-in is the most expensive because it writes new storage slots
  (streak, lastDay, message, totalCheckIns, totalAgents). Repeat check-ins
  only update existing slots, so they cost ~3x less.
- At current BSC gas prices the whole hackathon entry (deploy + a demo
  check-in) costs well under $0.05. Even at 3 gwei, deploy is ~$0.81.
- Creation bytecode is 2,015 bytes; deployed code 1,877 bytes.

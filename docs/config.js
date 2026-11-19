// Agent Wall configuration.
// Fill in agentWallAddress + deploymentBlock after the contract is deployed
// on BNB Chain. Everything else is already correct for mainnet.
const CONFIG = {
  chainId: 56,
  chainName: "BNB Smart Chain",
  rpcUrl: "https://bsc-dataseed1.bnbchain.org",
  // AgentWall contract address on BNB Chain mainnet (deployed 2026-11-19).
  agentWallAddress: "0x5Bf3a9a8421CdcFBc074978bc316F0eeF5b20d3F",
  // Block number of the deployment transaction (first block
  // the wall feed scans for CheckedIn events).
  deploymentBlock: 134459060,
  // Real Agent ID contract (SPACE ID Agent ID, ERC-721, non-transferable).
  agentIdAddress: "0x60b9262456de011f7d15a54cdd8c48baaa8b022f",
  // TODO (optional): WalletConnect Cloud project ID, from
  // https://cloud.walletconnect.com — needed only for the WalletConnect
  // button. Leave empty to hide that option.
  walletConnectProjectId: "",
};

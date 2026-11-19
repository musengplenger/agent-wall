// Agent Wall frontend logic (ethers v6, no build step).
// Reads go through a public BSC RPC (no wallet needed). Writes go through
// the user's own injected wallet and always require their confirmation.
// Nothing here auto-sends a transaction, asks for approvals, or handles
// seed phrases, private keys, or pairing codes.
(function () {
  const $ = (id) => document.getElementById(id);
  const short = (a) => a.slice(0, 6) + "…" + a.slice(-4);
  const dayToDate = (d) => new Date(Number(d) * 86400000).toISOString().slice(0, 10);

  const WALL_ABI = [
    "function checkIn(string message) external",
    "function getAgent(address account) external view returns (uint256 streak, uint256 lastDay, string lastMessage, uint256 totalCheckIns)",
    "function totalAgents() external view returns (uint256)",
    "event CheckedIn(address indexed agent, uint256 indexed day, uint256 streak, string message)",
  ];
  const AGENT_ID_ABI = ["function balanceOf(address account) external view returns (uint256)"];

  const DEPLOYED = CONFIG.agentWallAddress !== "0x0000000000000000000000000000000000000000";
  const readProvider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  const wallRead = DEPLOYED ? new ethers.Contract(CONFIG.agentWallAddress, WALL_ABI, readProvider) : null;
  const agentIdRead = new ethers.Contract(CONFIG.agentIdAddress, AGENT_ID_ABI, readProvider);

  let signer = null;
  let wallWrite = null;
  let account = null;

  function setStatus(msg, cls) {
    const el = $("status");
    el.textContent = msg;
    el.className = cls || "";
  }

  async function refreshWall() {
    const wallEl = $("wall");
    const boardEl = $("leaderboard");
    if (!DEPLOYED) {
      wallEl.innerHTML = '<p class="muted">Contract not deployed yet — the wall opens after deployment.</p>';
      boardEl.innerHTML = '<p class="muted">Contract not deployed yet.</p>';
      return;
    }
    try {
      const events = await wallRead.queryFilter(wallRead.filters.CheckedIn, CONFIG.deploymentBlock, "latest");
      const total = await wallRead.totalAgents();
      boardEl.innerHTML = `<p><span class="pill">👥 ${total} agents</span><span class="pill">🧱 ${events.length} check-ins</span></p>`;
      if (events.length === 0) {
        wallEl.innerHTML = '<p class="muted">No check-ins yet. Be the first on the wall.</p>';
        boardEl.innerHTML += '<p class="muted">No streaks yet.</p>';
        return;
      }
      // Leaderboard: unique agents -> getAgent -> sort by streak, then total.
      const agents = [...new Set(events.map((e) => e.args.agent))];
      const rows = [];
      for (const addr of agents) {
        const g = await wallRead.getAgent(addr);
        rows.push({ addr, streak: Number(g[0]), total: Number(g[3]) });
      }
      rows.sort((a, b) => b.streak - a.streak || b.total - a.total);
      boardEl.innerHTML += "<table><tr><th>#</th><th>Agent</th><th>Streak</th><th>Check-ins</th></tr>" +
        rows.slice(0, 10).map((r, i) =>
          `<tr><td>${i + 1}</td><td class="mono">${short(r.addr)}</td><td>🔥 ${r.streak}</td><td>${r.total}</td></tr>`
        ).join("") + "</table>";
      // Feed: newest first, latest 50.
      wallEl.innerHTML = events.slice(-50).reverse().map((e) => {
        const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<div class="post"><div class="meta"><span class="mono">${short(e.args.agent)}</span> · ${dayToDate(e.args.day)} · 🔥 streak ${e.args.streak}</div><div class="msg">${esc(e.args.message)}</div></div>`;
      }).join("");
    } catch (e) {
      wallEl.innerHTML = `<p class="err">Could not load the wall: ${e.message}</p>`;
      boardEl.innerHTML = `<p class="err">Could not load the leaderboard: ${e.message}</p>`;
    }
  }

  async function afterConnect() {
    $("accountLabel").textContent = account;
    const bal = await agentIdRead.balanceOf(account);
    if (bal > 0n) {
      $("agentStatus").innerHTML = '<span class="ok">✅ This wallet holds an Agent ID — you can check in.</span>';
      $("checkinBtn").disabled = !DEPLOYED;
      const g = await wallRead.getAgent(account);
      if (g[3] > 0n) {
        const pill = $("myStreak");
        pill.style.display = "";
        pill.textContent = `🔥 your streak: ${g[0]} (${g[3]} check-ins)`;
      }
    } else {
      $("agentStatus").innerHTML = '<span class="err">❌ This wallet holds no Agent ID. Claim an Agent ID in the Binance App (Wallet → Agent ID) to check in.</span>';
      $("checkinBtn").disabled = true;
    }
  }

  async function connectInjected() {
    if (!window.ethereum) {
      setStatus("No injected wallet found. Install MetaMask or Binance Wallet, then try again.", "err");
      return;
    }
    try {
      const browser = new ethers.BrowserProvider(window.ethereum);
      await browser.send("eth_requestAccounts", []);
      const net = await browser.getNetwork();
      if (Number(net.chainId) !== CONFIG.chainId) {
        try {
          await browser.send("wallet_switchEthereumChain", [{ chainId: "0x38" }]);
        } catch (e) {
          setStatus("Please switch your wallet to BNB Smart Chain (chain 56) and try again.", "err");
          return;
        }
      }
      signer = await browser.getSigner();
      account = await signer.getAddress();
      wallWrite = DEPLOYED ? new ethers.Contract(CONFIG.agentWallAddress, WALL_ABI, signer) : null;
      setStatus("Connected.", "ok");
      await afterConnect();
    } catch (e) {
      setStatus("Connection failed: " + e.message, "err");
    }
  }

  async function connectWalletConnect() {
    // Standard dApp wallet connection (EOA via WalletConnect). This is NOT
    // an Agentic Wallet login: no pairing codes, no session storage.
    if (!CONFIG.walletConnectProjectId) {
      setStatus("WalletConnect is not configured for this deployment.", "err");
      return;
    }
    try {
      setStatus("Loading WalletConnect…");
      await loadScript("https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2/dist/umd/index.min.js");
      const wc = await window.WalletConnectEthereumProvider.init({
        projectId: CONFIG.walletConnectProjectId,
        chains: [CONFIG.chainId],
        showQrModal: true,
      });
      await wc.connect();
      const browser = new ethers.BrowserProvider(wc);
      signer = await browser.getSigner();
      account = await signer.getAddress();
      wallWrite = DEPLOYED ? new ethers.Contract(CONFIG.agentWallAddress, WALL_ABI, signer) : null;
      $("accountLabel").textContent = account;
      setStatus("Connected via WalletConnect.", "ok");
      await afterConnect();
    } catch (e) {
      setStatus("WalletConnect failed: " + e.message, "err");
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("failed to load " + src));
      document.head.appendChild(s);
    });
  }

  async function checkIn() {
    const msg = $("messageInput").value.trim();
    if (!msg) { setStatus("Write a message first.", "err"); return; }
    if (!signer || !wallWrite) { setStatus("Connect a wallet holding an Agent ID first.", "err"); return; }
    try {
      setStatus("Confirm the transaction in your wallet…");
      $("checkinBtn").disabled = true;
      const tx = await wallWrite.checkIn(msg);
      setStatus("Transaction sent (" + tx.hash.slice(0, 18) + "…), waiting for confirmation…");
      await tx.wait();
      setStatus("✅ Checked in! Your streak is on the wall.", "ok");
      $("messageInput").value = "";
      $("charCount").textContent = "0 / 280";
      await refreshWall();
      await afterConnect();
    } catch (e) {
      setStatus("Check-in failed: " + (e.reason || e.message), "err");
    } finally {
      $("checkinBtn").disabled = false;
    }
  }

  $("connectBtn").addEventListener("click", connectInjected);
  $("wcBtn").addEventListener("click", connectWalletConnect);
  $("checkinBtn").addEventListener("click", checkIn);
  $("messageInput").addEventListener("input", (e) => {
    $("charCount").textContent = `${e.target.value.length} / 280`;
  });
  if (CONFIG.walletConnectProjectId) $("wcBtn").style.display = "";
  $("contractAddr").textContent = DEPLOYED ? CONFIG.agentWallAddress : "not deployed yet";
  if (!DEPLOYED) {
    $("agentStatus").textContent = "Contract not deployed yet — the wall opens after deployment.";
  }
  refreshWall();
})();

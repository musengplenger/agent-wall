// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Agent Wall
/// @notice A daily check-in wall for Agent ID holders. Only addresses that
/// hold an Agent ID (ERC-721, balanceOf > 0) can post. Each check-in records
/// a short message and extends the caller's daily streak (UTC days).
/// @dev No owner, no admin, no fees, no token, no promised returns.
/// The Agent ID contract address is set once at deploy time (immutable).
/// On BNB Chain mainnet it is 0x60b9262456de011f7d15a54cdd8c48baaa8b022f
/// (SPACE ID Agent ID, ERC-721, non-transferable).
interface IAgentID {
    function balanceOf(address account) external view returns (uint256);
}

contract AgentWall {
    IAgentID public immutable agentId;

    struct Agent {
        uint256 streak;        // consecutive UTC days checked in
        uint256 lastDay;       // UTC day number of the last check-in
        string lastMessage;    // message of the last check-in
        uint256 totalCheckIns; // lifetime check-ins
    }

    mapping(address => Agent) private agents; // read via getAgent()
    uint256 public totalAgents; // distinct addresses that ever checked in

    event CheckedIn(
        address indexed agent,
        uint256 indexed day,
        uint256 streak,
        string message
    );

    constructor(address agentIdAddress) {
        // No zero-address check: a zero Agent ID address makes every
        // balanceOf call revert on ABI decoding, so checkIn can never
        // succeed — fail-safe without the extra bytecode.
        agentId = IAgentID(agentIdAddress);
    }

    /// @notice Check in for today with a short message. Only Agent ID holders.
    /// Same-day check-ins update the message but do not extend the streak.
    /// A missed UTC day resets the streak to 1.
    function checkIn(string calldata message) external {
        require(agentId.balanceOf(msg.sender) > 0, "Agent ID required");
        require(bytes(message).length > 0, "empty message");
        require(bytes(message).length <= 280, "message too long");

        uint256 day = block.timestamp / 1 days;
        Agent storage a = agents[msg.sender];

        if (a.totalCheckIns == 0) {
            a.streak = 1;
            totalAgents += 1;
        } else if (a.lastDay == day) {
            // same UTC day: message updates, streak unchanged
        } else if (a.lastDay + 1 == day) {
            a.streak += 1;
        } else {
            a.streak = 1;
        }

        a.lastDay = day;
        a.lastMessage = message;
        a.totalCheckIns += 1;

        emit CheckedIn(msg.sender, day, a.streak, message);
    }

    /// @notice Read one agent's stats. Returns zeros for never-checked-in.
    function getAgent(address account)
        external
        view
        returns (
            uint256 streak,
            uint256 lastDay,
            string memory lastMessage,
            uint256 totalCheckIns
        )
    {
        Agent storage a = agents[account];
        return (a.streak, a.lastDay, a.lastMessage, a.totalCheckIns);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

/// @notice Freely mintable test asset. Not USDG, not redeemable, not a dollar peg.
contract ReviewToken is ERC20 {
    constructor() ERC20('Parry Test Dollar', 'pUSD') {}
    function decimals() public pure override returns (uint8) { return 6; }
    function faucet() external { _mint(msg.sender, 1000 * 10**6); }
}

/// @notice Creator-selected review awards; no platform custody or discretion.
contract ReviewPool is ReentrancyGuard {
    using SafeERC20 for IERC20;
    IERC20 public immutable token;
    uint256 public constant RESOLUTION_WINDOW = 7 days;
    struct Pool {address creator; uint256 amount; uint64 deadline; bool resolved; bytes32 briefHash;}
    mapping(bytes32 => Pool) public pools;
    mapping(bytes32 => mapping(address => bytes32)) public submissions;
    mapping(bytes32 => mapping(address => uint256)) public claimable;
    event Funded(bytes32 indexed id, address indexed creator, uint256 amount, uint64 deadline, bytes32 briefHash);
    event Submitted(bytes32 indexed id, address indexed author, bytes32 contentHash);
    event Resolved(bytes32 indexed id, address[] winners, uint256[] amounts);
    event Claimed(bytes32 indexed id, address indexed recipient, uint256 amount);
    event Refunded(bytes32 indexed id, address indexed creator, uint256 amount);
    constructor(address asset) {require(asset == address(0) || asset.code.length > 0, 'Invalid token'); token = IERC20(asset);}
    function fund(bytes32 id, uint256 amount, uint64 deadline, bytes32 briefHash) external payable nonReentrant {
        require(pools[id].creator == address(0), 'Already exists');
        require(amount > 0 && briefHash != bytes32(0), 'Invalid brief or amount');
        require(deadline > block.timestamp && deadline <= block.timestamp + 90 days, 'Invalid deadline');
        uint256 previous = address(token) == address(0) ? 0 : token.balanceOf(address(this));
        pools[id] = Pool(msg.sender, amount, deadline, false, briefHash);
        if(address(token) == address(0)){require(msg.value == amount, 'Incorrect ETH amount');}else{require(msg.value == 0, 'No ETH accepted');token.safeTransferFrom(msg.sender,address(this),amount);require(token.balanceOf(address(this)) == previous + amount, 'Unsupported token');}
        emit Funded(id,msg.sender,amount,deadline,briefHash);
    }
    function submit(bytes32 id, bytes32 contentHash) external {
        Pool storage p = pools[id];
        require(p.creator != address(0) && !p.resolved && block.timestamp < p.deadline,'Closed');
        require(msg.sender != p.creator, 'Creator cannot submit');
        require(contentHash != bytes32(0) && submissions[id][msg.sender] == bytes32(0),'Invalid or duplicate');
        submissions[id][msg.sender] = contentHash;
        emit Submitted(id,msg.sender,contentHash);
    }
    function resolve(bytes32 id,address[] calldata winners,uint256[] calldata amounts) external {
        Pool storage p = pools[id];
        require(msg.sender == p.creator, 'Creator only');
        require(!p.resolved && block.timestamp >= p.deadline && block.timestamp <= p.deadline + RESOLUTION_WINDOW,'Outside resolution window');
        require(winners.length > 0 && winners.length <= 50 && winners.length == amounts.length,'Invalid winners');
        p.resolved = true;
        uint256 total;
        for(uint256 i; i < winners.length; ++i){
            require(submissions[id][winners[i]] != bytes32(0), 'Not a participant');
            require(amounts[i] > 0 && claimable[id][winners[i]] == 0, 'Invalid or duplicate award');
            total += amounts[i]; claimable[id][winners[i]] = amounts[i];
        }
        require(total == p.amount, 'Allocate entire pool');
        emit Resolved(id,winners,amounts);
    }
    function claim(bytes32 id) external nonReentrant {
        uint256 amount = claimable[id][msg.sender];
        require(amount > 0, 'Nothing to claim');
        claimable[id][msg.sender] = 0;
        _pay(msg.sender,amount);
        emit Claimed(id,msg.sender,amount);
    }
    function _pay(address recipient,uint256 amount) private {
        if(address(token)==address(0)){(bool ok,)=payable(recipient).call{value:amount}("");require(ok,'ETH transfer failed');}else{token.safeTransfer(recipient,amount);}
    }
    function refund(bytes32 id) external nonReentrant {
        Pool storage p = pools[id];
        require(msg.sender == p.creator && !p.resolved, 'Unavailable');
        require(block.timestamp > p.deadline + RESOLUTION_WINDOW,'Too early');
        p.resolved = true;
        _pay(p.creator,p.amount);
        emit Refunded(id,p.creator,p.amount);
    }
}

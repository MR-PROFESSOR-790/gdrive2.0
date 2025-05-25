// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GDV Token - GDrive's Native Token
 * @dev ERC20 token with ETH exchange functionality
 */
contract GDVToken is ERC20, Ownable, ReentrancyGuard {
    // Exchange rate (1 ETH = X GDV)
    uint256 public exchangeRate;
    
    // Minimum ETH amount for exchange
    uint256 public constant MIN_EXCHANGE_AMOUNT = 0.01 ether;
    
    // Events
    event ExchangeRateUpdated(uint256 newRate);
    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount);
    event TokensSold(address indexed seller, uint256 tokenAmount, uint256 ethAmount);
    
    // Errors
    error InsufficientExchangeAmount();
    error ExchangeDisabled();
    error InsufficientContractBalance();
    
    constructor(
        address initialOwner,
        uint256 initialExchangeRate
    ) ERC20("GDrive Token", "GDV") Ownable(initialOwner) {
        exchangeRate = initialExchangeRate;
    }
    
    /**
     * @dev Update the exchange rate
     * @param newRate New exchange rate (1 ETH = X GDV)
     */
    function updateExchangeRate(uint256 newRate) external onlyOwner {
        if (newRate == 0) revert ExchangeDisabled();
        exchangeRate = newRate;
        emit ExchangeRateUpdated(newRate);
    }
    
    /**
     * @dev Buy GDV tokens with ETH
     */
    function buyTokens() external payable nonReentrant {
        if (msg.value < MIN_EXCHANGE_AMOUNT) revert InsufficientExchangeAmount();
        
        uint256 tokenAmount = msg.value * exchangeRate;
        _mint(msg.sender, tokenAmount);
        
        emit TokensPurchased(msg.sender, msg.value, tokenAmount);
    }
    
    /**
     * @dev Sell GDV tokens for ETH
     * @param tokenAmount Amount of GDV tokens to sell
     */
    function sellTokens(uint256 tokenAmount) external nonReentrant {
        if (tokenAmount == 0) revert InsufficientExchangeAmount();
        
        uint256 ethAmount = tokenAmount / exchangeRate;
        if (address(this).balance < ethAmount) revert InsufficientContractBalance();
        
        _burn(msg.sender, tokenAmount);
        payable(msg.sender).transfer(ethAmount);
        
        emit TokensSold(msg.sender, tokenAmount, ethAmount);
    }
    
    /**
     * @dev Get the amount of GDV tokens for a given ETH amount
     * @param ethAmount Amount of ETH
     * @return tokenAmount Amount of GDV tokens
     */
    function getTokenAmount(uint256 ethAmount) external view returns (uint256 tokenAmount) {
        return ethAmount * exchangeRate;
    }
    
    /**
     * @dev Get the amount of ETH for a given GDV token amount
     * @param tokenAmount Amount of GDV tokens
     * @return ethAmount Amount of ETH
     */
    function getEthAmount(uint256 tokenAmount) external view returns (uint256 ethAmount) {
        return tokenAmount / exchangeRate;
    }
    
    /**
     * @dev Withdraw ETH from contract
     */
    function withdrawEth() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Mint additional tokens (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens (only owner)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
    
    receive() external payable {
        // Allow contract to receive ETH
    }
} 
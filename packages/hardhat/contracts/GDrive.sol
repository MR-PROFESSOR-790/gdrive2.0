// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title GDrive 2.0 - Gas Optimized Decentralized Storage Contract
 * @dev A comprehensive, gas-efficient decentralized storage solution
 * @author GDrive Team
 */
contract GDrive is Ownable, ReentrancyGuard, Pausable {
    
    // ============ STRUCTS (Gas Optimized) ============
    
    struct File {
        string cid;                 // IPFS Content Identifier
        address owner;             // File owner (20 bytes)
        uint128 size;              // File size in bytes (16 bytes)
        uint64 uploadDate;         // Upload timestamp (8 bytes)
        uint32 downloadCount;      // Download counter (4 bytes)
        uint16 version;            // File version number (2 bytes)
        bool isEncrypted;          // Encryption status (1 bit)
        bool isPublic;             // Public accessibility (1 bit)
        // Total: 32 bytes slot boundary aligned
    }
    
    struct FileMetadata {
        string name;               // File name
        string fileType;           // MIME type
        string description;        // File description
        string[] tags;             // File tags for categorization
    }
    
    struct Folder {
        string name;               // Folder name
        address owner;             // Folder owner (20 bytes)
        bytes32 parentFolderId;    // Parent folder ID (32 bytes)
        uint64 createdDate;        // Creation timestamp (8 bytes)
        bool isPublic;             // Public accessibility (1 bit)
        // Separate arrays to avoid dynamic array gas costs in struct
    }
    
    struct ShareLink {
        bytes32 fileId;            // File ID (32 bytes)
        address creator;           // Link creator (20 bytes)
        uint64 expiryDate;         // Link expiration (8 bytes)
        uint32 accessCount;        // Access counter (4 bytes)
        uint32 maxAccess;          // Maximum access count (4 bytes)
        bool isActive;             // Link status (1 bit)
        // Password stored separately to save gas
    }
    
    struct Subscription {
        address user;              // Subscriber address (20 bytes)
        uint128 storageLimit;      // Storage limit in bytes (16 bytes)
        uint128 bandwidthLimit;    // Monthly bandwidth limit (16 bytes)
        uint64 expiryDate;         // Subscription expiry (8 bytes)
        uint8 tier;                // Subscription tier (1 byte)
        bool isActive;             // Subscription status (1 bit)
        // Total: 64 bytes, 2 slots
    }
    
    // ============ ENUMS ============
    
    enum Permission { NONE, READ, WRITE, ADMIN }
    
    // ============ CONSTANTS (Gas Optimization) ============
    
    uint256 private constant BYTES_PER_MB = 1048576;
    uint256 private constant SECONDS_PER_DAY = 86400;
    uint256 private constant DAYS_PER_YEAR = 365;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant FREE_TIER = 0;
    uint256 private constant MAX_TIER = 3;
    
    // ============ PACKED STATE VARIABLES ============
    
    // Pricing (packed in single slot)
    uint128 public storageRatePerMBPerYear = 0.00001 ether;
    uint128 public bandwidthRatePerGB = 0.000005 ether;
    
    // Limits (packed in single slot)
    uint128 public maxFileSize = 5 * 1024 * 1024 * 1024; // 5GB
    uint64 public minimumStoragePeriod = 30 days;
    uint64 public referralRewardPercentage = 1000; // 10% in basis points
    
    // Counters (packed in single slot)
    uint64 private _fileIdCounter;
    uint64 private _folderIdCounter;
    uint64 private _shareLinkIdCounter;
    uint64 private _reserved; // Reserved for future use
    
    // ============ MAPPINGS ============
    
    // Core data storage
    mapping(bytes32 => File) public files;
    mapping(bytes32 => FileMetadata) public fileMetadata;
    mapping(bytes32 => Folder) public folders;
    mapping(bytes32 => ShareLink) public shareLinks;
    mapping(address => Subscription) public subscriptions;
    
    // User data (use smaller types for gas efficiency)
    mapping(address => bytes32[]) public userFiles;
    mapping(address => bytes32[]) public userFolders;
    mapping(address => uint128) public userStorageUsed;
    mapping(address => uint128) public userBandwidthUsed;
    mapping(address => uint64) public lastBandwidthReset;
    
    // Permissions (packed)
    mapping(bytes32 => mapping(address => Permission)) public filePermissions;
    mapping(bytes32 => mapping(address => Permission)) public folderPermissions;
    
    // Financial data
    mapping(bytes32 => uint128) public filePayments;
    mapping(bytes32 => uint64) public fileExpiryDates;
    mapping(address => uint128) public userBalances;
    
    // Folder contents (separate mappings for gas efficiency)
    mapping(bytes32 => bytes32[]) public folderSubFolders;
    mapping(bytes32 => bytes32[]) public folderFiles;
    
    // Search indexes (optimized)
    mapping(string => bytes32[]) public taggedFiles;
    mapping(string => bytes32[]) public fileTypeIndex;
    bytes32[] public publicFiles;
    bytes32[] public publicFolders;
    
    // Share links passwords (separate to save gas)
    mapping(bytes32 => string) public shareLinkPasswords;
    
    // Referral system
    mapping(address => address) public referrers;
    mapping(address => uint128) public referralRewards;
    
    // Subscription tiers configuration (use arrays for gas efficiency)
    uint128[4] public tierStorageLimits;
    uint128[4] public tierBandwidthLimits;
    uint128[4] public tierPrices;
    
    // ============ EVENTS (Optimized) ============
    
    event FileUploaded(bytes32 indexed fileId, address indexed owner, string cid);
    event FileUpdated(bytes32 indexed fileId, uint16 version);
    event FileDeleted(bytes32 indexed fileId);
    event FileAccessed(bytes32 indexed fileId, address indexed accessor);
    event ShareLinkCreated(bytes32 indexed linkId, bytes32 indexed fileId);
    event FolderCreated(bytes32 indexed folderId, address indexed owner);
    event SubscriptionPurchased(address indexed user, uint8 tier, uint64 duration);
    event ReferralRewardPaid(address indexed referrer, uint128 amount);
    
    // ============ MODIFIERS (Gas Optimized) ============
    
    modifier onlyFileOwner(bytes32 fileId) {
        if (files[fileId].owner != msg.sender) revert NotFileOwner();
        _;
    }
    
    modifier onlyFolderOwner(bytes32 folderId) {
        if (folders[folderId].owner != msg.sender) revert NotFolderOwner();
        _;
    }
    
    modifier hasFilePermission(bytes32 fileId, Permission requiredPermission) {
        File storage file = files[fileId];
        if (file.owner != msg.sender && 
            filePermissions[fileId][msg.sender] < requiredPermission && 
            !file.isPublic) {
            revert InsufficientPermissions();
        }
        _;
    }
    
    modifier fileExists(bytes32 fileId) {
        if (files[fileId].uploadDate == 0) revert FileNotFound();
        _;
    }
    
    modifier folderExists(bytes32 folderId) {
        if (folders[folderId].createdDate == 0) revert FolderNotFound();
        _;
    }
    
    modifier validSubscription(address user) {
        Subscription storage sub = subscriptions[user];
        if (!sub.isActive || sub.expiryDate <= block.timestamp) {
            revert InvalidSubscription();
        }
        _;
    }
    
    // ============ CUSTOM ERRORS (Gas Efficient) ============
    
    error NotFileOwner();
    error NotFolderOwner();
    error InsufficientPermissions();
    error FileNotFound();
    error FolderNotFound();
    error InvalidSubscription();
    error StorageLimitExceeded();
    error BandwidthLimitExceeded();
    error FileSizeTooLarge();
    error InvalidInput();
    error InsufficientPayment();
    error LinkExpired();
    error LinkNotActive();
    
    // ============ CONSTRUCTOR ============
    
    constructor(address initialOwner) Ownable(initialOwner) {
        _initializeSubscriptionTiers();
        _setupFreeSubscription(initialOwner);
    }
    
    // ============ CORE FUNCTIONS (Gas Optimized) ============
    
    /**
     * @dev Upload a new file to decentralized storage
     * @param params Encoded parameters to reduce stack depth
     */
    function uploadFile(bytes calldata params) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        returns (bytes32 fileId) {
        
        // Decode parameters
        (
            string memory name,
            string memory fileType,
            string memory cid,
            uint128 size,
            string memory description,
            bool isEncrypted,
            bool isPublic,
            string[] memory tags,
            bytes32 folderId,
            uint64 storagePeriod
        ) = abi.decode(params, (string, string, string, uint128, string, bool, bool, string[], bytes32, uint64));
        
        // Validation
        if (bytes(cid).length == 0) revert InvalidInput();
        if (size == 0 || size > maxFileSize) revert FileSizeTooLarge();
        if (storagePeriod < minimumStoragePeriod) revert InvalidInput();
        
        // Check subscription and limits
        Subscription storage sub = subscriptions[msg.sender];
        if (!sub.isActive || sub.expiryDate <= block.timestamp) {
            revert InvalidSubscription();
        }
        if (userStorageUsed[msg.sender] + size > sub.storageLimit) {
            revert StorageLimitExceeded();
        }
        
        // Calculate and check payment
        uint256 storageCost = _calculateStorageCost(size, storagePeriod);
        if (msg.value < storageCost) revert InsufficientPayment();
        
        // Generate unique file ID (gas optimized)
        unchecked {
            ++_fileIdCounter;
        }
        fileId = keccak256(abi.encodePacked(cid, msg.sender, block.timestamp, _fileIdCounter));
        
        // Create file record
        files[fileId] = File({
            cid: cid,
            owner: msg.sender,
            size: size,
            uploadDate: uint64(block.timestamp),
            downloadCount: 0,
            version: 1,
            isEncrypted: isEncrypted,
            isPublic: isPublic
        });
        
        // Store metadata separately
        fileMetadata[fileId] = FileMetadata({
            name: name,
            fileType: fileType,
            description: description,
            tags: tags
        });
        
        // Update user data
        userFiles[msg.sender].push(fileId);
        unchecked {
            userStorageUsed[msg.sender] += size;
        }
        
        // Add to folder if specified
        if (folderId != bytes32(0)) {
            folderFiles[folderId].push(fileId);
        }
        
        // Update indexes (gas optimized)
        _updateFileIndexes(fileId, fileType, tags, isPublic);
        
        // Handle payments
        filePayments[fileId] = uint128(msg.value);
        unchecked {
            fileExpiryDates[fileId] = uint64(block.timestamp + storagePeriod);
        }
        
        // Handle referral rewards
        _handleReferralReward(uint128(msg.value));
        
        emit FileUploaded(fileId, msg.sender, cid);
        return fileId;
    }
    
    /**
     * @dev Create a new folder (gas optimized)
     */
    function createFolder(
        string calldata name,
        bytes32 parentFolderId,
        bool isPublic
    ) external validSubscription(msg.sender) returns (bytes32 folderId) {
        if (bytes(name).length == 0) revert InvalidInput();
        
        // Validate parent folder if specified
        if (parentFolderId != bytes32(0)) {
            if (folders[parentFolderId].createdDate == 0) revert FolderNotFound();
            if (folders[parentFolderId].owner != msg.sender &&
                folderPermissions[parentFolderId][msg.sender] < Permission.WRITE) {
                revert InsufficientPermissions();
            }
        }
        
        unchecked {
            ++_folderIdCounter;
        }
        folderId = keccak256(abi.encodePacked(name, msg.sender, block.timestamp, _folderIdCounter));
        
        folders[folderId] = Folder({
            name: name,
            owner: msg.sender,
            parentFolderId: parentFolderId,
            createdDate: uint64(block.timestamp),
            isPublic: isPublic
        });
        
        userFolders[msg.sender].push(folderId);
        
        // Add to parent folder if specified
        if (parentFolderId != bytes32(0)) {
            folderSubFolders[parentFolderId].push(folderId);
        }
        
        // Add to public index if public
        if (isPublic) {
            publicFolders.push(folderId);
        }
        
        emit FolderCreated(folderId, msg.sender);
        return folderId;
    }
    
    /**
     * @dev Create a shareable link for a file
     */
    function createShareLink(
        bytes32 fileId,
        uint64 expiryDate,
        uint32 maxAccess,
        string calldata password
    ) external hasFilePermission(fileId, Permission.READ) fileExists(fileId) returns (bytes32 linkId) {
        if (expiryDate <= block.timestamp) revert InvalidInput();
        
        unchecked {
            ++_shareLinkIdCounter;
        }
        linkId = keccak256(abi.encodePacked(fileId, msg.sender, block.timestamp, _shareLinkIdCounter));
        
        shareLinks[linkId] = ShareLink({
            fileId: fileId,
            creator: msg.sender,
            expiryDate: expiryDate,
            isActive: true,
            accessCount: 0,
            maxAccess: maxAccess
        });
        
        if (bytes(password).length > 0) {
            shareLinkPasswords[linkId] = password;
        }
        
        emit ShareLinkCreated(linkId, fileId);
        return linkId;
    }
    
    /**
     * @dev Access file through share link (gas optimized)
     */
    function accessFileViaLink(
        bytes32 linkId,
        string calldata password
    ) external returns (string memory cid) {
        ShareLink storage link = shareLinks[linkId];
        if (!link.isActive) revert LinkNotActive();
        if (link.expiryDate <= block.timestamp) revert LinkExpired();
        if (link.maxAccess != 0 && link.accessCount >= link.maxAccess) revert LinkExpired();
        
        // Check password if required
        string storage storedPassword = shareLinkPasswords[linkId];
        if (bytes(storedPassword).length > 0) {
            if (keccak256(bytes(password)) != keccak256(bytes(storedPassword))) {
                revert InsufficientPermissions();
            }
        }
        
        bytes32 fileId = link.fileId;
        File storage file = files[fileId];
        
        // Check bandwidth limit
        Subscription storage sub = subscriptions[msg.sender];
        if (sub.isActive) {
            _resetBandwidthIfNeeded(msg.sender);
            if (userBandwidthUsed[msg.sender] + file.size > sub.bandwidthLimit) {
                revert BandwidthLimitExceeded();
            }
            unchecked {
                userBandwidthUsed[msg.sender] += file.size;
            }
        }
        
        // Update counters
        unchecked {
            ++link.accessCount;
            ++file.downloadCount;
        }
        
        emit FileAccessed(fileId, msg.sender);
        return file.cid;
    }
    
    /**
     * @dev Purchase or upgrade subscription (gas optimized)
     */
    function purchaseSubscription(
        uint8 tier,
        uint64 duration,
        address referrer
    ) external payable nonReentrant {
        if (tier > MAX_TIER) revert InvalidInput();
        if (duration < minimumStoragePeriod) revert InvalidInput();
        
        uint256 cost = _calculateSubscriptionCost(tier, duration);
        if (msg.value < cost) revert InsufficientPayment();
        
        // Handle referral (only once per user)
        if (referrer != address(0) && referrer != msg.sender && referrers[msg.sender] == address(0)) {
            referrers[msg.sender] = referrer;
        }
        
        // Update subscription
        Subscription storage sub = subscriptions[msg.sender];
        if (sub.expiryDate > block.timestamp) {
            unchecked {
                sub.expiryDate += duration;
            }
        } else {
            unchecked {
                sub.expiryDate = uint64(block.timestamp + duration);
            }
        }
        
        sub.user = msg.sender;
        sub.storageLimit = tierStorageLimits[tier];
        sub.bandwidthLimit = tierBandwidthLimits[tier];
        sub.tier = tier;
        sub.isActive = true;
        
        // Reset bandwidth tracking
        lastBandwidthReset[msg.sender] = uint64(block.timestamp);
        userBandwidthUsed[msg.sender] = 0;
        
        // Handle referral reward
        _handleReferralReward(uint128(msg.value));
        
        emit SubscriptionPurchased(msg.sender, tier, duration);
    }
    
    // ============ VIEW FUNCTIONS (Gas Optimized) ============
    
    /**
     * @dev Get file details with access control
     */
    function getFileDetails(bytes32 fileId) 
        external 
        view 
        fileExists(fileId) 
        hasFilePermission(fileId, Permission.READ) 
        returns (
            string memory name,
            string memory fileType,
            string memory cid,
            uint128 size,
            uint64 uploadDate,
            bool isEncrypted,
            address owner,
            string memory description,
            uint64 expiryDate,
            uint32 downloadCount,
            uint16 version
        ) {
        File storage file = files[fileId];
        FileMetadata storage metadata = fileMetadata[fileId];
        
        return (
            metadata.name,
            metadata.fileType,
            file.cid,
            file.size,
            file.uploadDate,
            file.isEncrypted,
            file.owner,
            metadata.description,
            fileExpiryDates[fileId],
            file.downloadCount,
            file.version
        );
    }
    
    /**
     * @dev Get user's storage statistics
     */
    function getUserStats(address user) external view returns (
        uint128 storageUsed,
        uint128 storageLimit,
        uint128 bandwidthUsed,
        uint128 bandwidthLimit,
        uint256 fileCount,
        uint256 folderCount,
        uint8 subscriptionTier,
        uint64 subscriptionExpiry
    ) {
        Subscription storage sub = subscriptions[user];
        return (
            userStorageUsed[user],
            sub.storageLimit,
            userBandwidthUsed[user],
            sub.bandwidthLimit,
            userFiles[user].length,
            userFolders[user].length,
            sub.tier,
            sub.expiryDate
        );
    }
    
    /**
     * @dev Get subscription pricing
     */
    function getSubscriptionTiers() external view returns (
        uint128[4] memory storageLimits,
        uint128[4] memory bandwidthLimits,
        uint128[4] memory prices
    ) {
        return (tierStorageLimits, tierBandwidthLimits, tierPrices);
    }
    
    // ============ UTILITY FUNCTIONS (Gas Optimized) ============
    
    function _calculateStorageCost(uint128 size, uint64 period) internal view returns (uint256) {
        unchecked {
            uint256 sizeInMB = (size + BYTES_PER_MB - 1) / BYTES_PER_MB; // Round up
            uint256 periodInYears = (uint256(period) * 1e18) / (DAYS_PER_YEAR * SECONDS_PER_DAY);
            return (sizeInMB * storageRatePerMBPerYear * periodInYears) / 1e18;
        }
    }
    
    function _calculateSubscriptionCost(uint8 tier, uint64 duration) internal view returns (uint256) {
        unchecked {
            uint256 monthlyPrice = tierPrices[tier];
            uint256 months = (uint256(duration) + 29 days) / 30 days; // Round up
            return monthlyPrice * months;
        }
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function setStorageRate(uint128 _rate) external onlyOwner {
        storageRatePerMBPerYear = _rate;
    }
    
    function setBandwidthRate(uint128 _rate) external onlyOwner {
        bandwidthRatePerGB = _rate;
    }
    
    function updateTierConfig(
        uint8 tier,
        uint128 storageLimit,
        uint128 bandwidthLimit,
        uint128 price
    ) external onlyOwner {
        if (tier > MAX_TIER) revert InvalidInput();
        tierStorageLimits[tier] = storageLimit;
        tierBandwidthLimits[tier] = bandwidthLimit;
        tierPrices[tier] = price;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // ============ INTERNAL FUNCTIONS (Gas Optimized) ============
    
    function _initializeSubscriptionTiers() internal {
        // Free tier
        tierStorageLimits[0] = 1024 * 1024 * 1024; // 1GB
        tierBandwidthLimits[0] = 10 * 1024 * 1024 * 1024; // 10GB
        tierPrices[0] = 0;
        
        // Basic tier
        tierStorageLimits[1] = 100 * 1024 * 1024 * 1024; // 100GB
        tierBandwidthLimits[1] = 1000 * 1024 * 1024 * 1024; // 1TB
        tierPrices[1] = 0.01 ether;
        
        // Premium tier
        tierStorageLimits[2] = 1000 * 1024 * 1024 * 1024; // 1TB
        tierBandwidthLimits[2] = 10000 * 1024 * 1024 * 1024; // 10TB
        tierPrices[2] = 0.05 ether;
        
        // Enterprise tier
        tierStorageLimits[3] = 10000 * 1024 * 1024 * 1024; // 10TB
        tierBandwidthLimits[3] = 100000 * 1024 * 1024 * 1024; // 100TB
        tierPrices[3] = 0.2 ether;
    }
    
    function _setupFreeSubscription(address user) internal {
        subscriptions[user] = Subscription({
            user: user,
            storageLimit: tierStorageLimits[0],
            bandwidthLimit: tierBandwidthLimits[0],
            expiryDate: uint64(block.timestamp + 365 days),
            tier: 0,
            isActive: true
        });
        lastBandwidthReset[user] = uint64(block.timestamp);
    }
    
    function _updateFileIndexes(
        bytes32 fileId, 
        string memory fileType, 
        string[] memory tags, 
        bool isPublic
    ) internal {
        // Add to file type index
        fileTypeIndex[fileType].push(fileId);
        
        // Add to tag indexes
        uint256 tagLength = tags.length;
        for (uint256 i; i < tagLength;) {
            taggedFiles[tags[i]].push(fileId);
            unchecked {
                ++i;
            }
        }
        
        // Add to public files if public
        if (isPublic) {
            publicFiles.push(fileId);
        }
    }
    
    function _resetBandwidthIfNeeded(address user) internal {
        unchecked {
            if (block.timestamp >= lastBandwidthReset[user] + 30 days) {
                userBandwidthUsed[user] = 0;
                lastBandwidthReset[user] = uint64(block.timestamp);
            }
        }
    }
    
    function _handleReferralReward(uint128 amount) internal {
        address referrer = referrers[msg.sender];
        if (referrer != address(0)) {
            unchecked {
                uint128 reward = uint128((amount * uint128(referralRewardPercentage)) / BASIS_POINTS);
                referralRewards[referrer] += reward;
                payable(referrer).transfer(reward);
                emit ReferralRewardPaid(referrer, reward);
            }
        }
    }
    
    // ============ RECEIVE FUNCTION ============
    
    receive() external payable {
        // Allow contract to receive ETH
    }
}
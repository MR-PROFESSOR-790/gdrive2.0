// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./GDVToken.sol";

// Interface for GDVToken specific functions
interface IGDVToken is IERC20 {
    function getTokenAmount(uint256 ethAmount) external view returns (uint256);
    function getEthAmount(uint256 tokenAmount) external view returns (uint256);
}

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

    struct PaidShareLink {
        bytes32 fileId;
        address creator;
        uint128 pricePerAccess;
        uint64 expiryDate;
        uint32 accessCount;
        uint32 maxAccess;
        string password;
        bool isActive;
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

    mapping(bytes32 => PaidShareLink) public PaidShareLinks;
    mapping(address => uint128) public earnedRevenue;
    mapping(address => address) public referrers;
    mapping(address => uint256) public referralRewards;
    mapping(address => mapping(string => bytes32)) public userCidToFileId;

    
    // Subscription tiers configuration (use arrays for gas efficiency)
    uint128[4] public tierStorageLimits;
    uint128[4] public tierBandwidthLimits;
    uint128[4] public tierPrices;
    
    // ============ TOKEN PAYMENT STATE VARIABLES ============
    
    // Supported payment tokens
    mapping(address => bool) public supportedTokens;
    // Token prices (in wei/token)
    mapping(address => uint256) public tokenPrices;
    // Default payment token
    address public defaultPaymentToken;
    
    // ============ TOKEN PAYMENT EVENTS ============
    
    event TokenAdded(address indexed token, uint256 price);
    event TokenRemoved(address indexed token);
    event TokenPriceUpdated(address indexed token, uint256 newPrice);
    event DefaultTokenChanged(address indexed newDefaultToken);
    event TokenPaymentReceived(address indexed token, address indexed from, uint256 amount);
    
    // ============ TOKEN PAYMENT ERRORS ============
    
    error TokenNotSupported();
    error InvalidTokenPrice();
    error TokenTransferFailed();
    error InsufficientTokenAllowance();
    
    // ============ EVENTS (Optimized) ============
    
    event FileUploaded(bytes32 indexed fileId, address indexed owner, string cid);
    event FileUpdated(bytes32 indexed fileId, uint16 version);
    event FileDeleted(bytes32 indexed fileId);
    event FileAccessed(bytes32 indexed fileId, address indexed accessor);
    event ShareLinkCreated(bytes32 indexed linkId, bytes32 indexed fileId);
    event FolderCreated(bytes32 indexed folderId, address indexed owner);
    event SubscriptionPurchased(address indexed user, uint8 tier, uint64 duration);
    event ReferralRewardPaid(address indexed referrer, uint128 amount);

    event PaidShareLinkCreated(bytes32 indexed linkId, bytes32 indexed fileId, uint128 price);
    event PaidAccessCompleted(bytes32 indexed linkId, address accessor, uint128 amount);
    event RevenueWithdrawn(address indexed user, uint128 amount);

    // ============ GDV TOKEN INTEGRATION ============
    
    IGDVToken public gdvToken;
    bool public gdvEnabled;
    uint256 public gdvDiscount; // Discount percentage in basis points (e.g., 1000 = 10%)
    
    event GDVTokenSet(address indexed token);
    event GDVEnabled(bool enabled);
    event GDVDiscountUpdated(uint256 newDiscount);
    event GDVPaymentReceived(address indexed from, uint256 amount);
    
    error GDVNotEnabled();
    error InvalidGDVDiscount();
    
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
    function _uploadFile(bytes calldata params) 
        internal 
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

    userCidToFileId[msg.sender][cid] = fileId;
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
    function getFileIdByCid(string calldata cid) external view returns (bytes32) {
    bytes32 fileId = userCidToFileId[msg.sender][cid];
    if (fileId == bytes32(0)) revert FileNotFound();
    return fileId;
}
    function uploadFile(bytes calldata params) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        returns (bytes32 fileId) {
        return _uploadFile(params);
    }

    function _batchUploadFiles(bytes[] calldata paramsArray) 
        internal returns (bytes32[] memory fileIds) {
        uint256 count = paramsArray.length;
        fileIds = new bytes32[](count);
        for (uint i = 0; i < count;) {
            fileIds[i] = _uploadFile(paramsArray[i]);
            unchecked { ++i; }
        }
    }

    function batchUploadFiles(bytes[] calldata paramsArray) 
        external payable nonReentrant whenNotPaused returns (bytes32[] memory fileIds) {
        return _batchUploadFiles(paramsArray);
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

    function createPaidShareLink(
        bytes32 fileId,
        uint128 pricePerAccess,
        uint64 expiryDate,
        uint32 maxAccess,
        string calldata password
    ) external onlyFileOwner(fileId) fileExists(fileId) returns (bytes32 linkId) {
        if (pricePerAccess == 0 || expiryDate <= block.timestamp) revert InvalidInput();

        unchecked {++_shareLinkIdCounter;}
        linkId = keccak256(abi.encodePacked(fileId, msg.sender, block.timestamp, _shareLinkIdCounter));

        PaidShareLinks[linkId] = PaidShareLink({
            fileId: fileId,
            creator: msg.sender,
            pricePerAccess: pricePerAccess,
            expiryDate: expiryDate,
            accessCount: 0,
            maxAccess: maxAccess,
            password: password,
            isActive: true
        });

        emit PaidShareLinkCreated(linkId, fileId, pricePerAccess);
        return linkId;
    }

    function accessPaidShareLink(bytes32 linkId, string calldata password)
        external payable nonReentrant returns(string memory cid) {
            PaidShareLink storage link = PaidShareLinks[linkId];
            if(!link.isActive) revert LinkNotActive();
            if(link.expiryDate <= block.timestamp) revert LinkNotActive();
            if(link.maxAccess != 0 && link.accessCount >= link.maxAccess) revert LinkExpired();

            if(bytes(link.password).length > 0 && keccak256(bytes(password)) != keccak256(bytes(link.password))){
                revert InsufficientPermissions();
            }

            if(msg.value < link.pricePerAccess) revert InsufficientPayment();

            File storage file = files[link.fileId];
            cid = file.cid;

            unchecked {
                ++link.accessCount;
                ++file.downloadCount;
            }
           address payable creator = payable(link.creator);
           uint128 amount = link.pricePerAccess;
           creator.transfer(amount);
           earnedRevenue[creator] += amount;

           emit PaidAccessCompleted(linkId, msg.sender, amount);
           emit FileAccessed(link.fileId, msg.sender);

        return cid; 
        }

        function deactivatePaidShareLink(bytes32 linkId) external {
           PaidShareLink storage link = PaidShareLinks[linkId];
           if (link.creator != msg.sender) revert NotFileOwner();
           link.isActive = false;
        }

        function getPaidShareLink(bytes32 linkId)
    external view returns (
        bytes32 fileId,
        address creator,
        uint128 pricePerAccess,
        uint64 expiryDate,
        uint32 accessCount,
        uint32 maxAccess,
        string memory password,
        bool isActive
    )
{
    PaidShareLink storage link = PaidShareLinks[linkId];
    return (
        link.fileId,
        link.creator,
        link.pricePerAccess,
        link.expiryDate,
        link.accessCount,
        link.maxAccess,
        link.password,
        link.isActive
    );
}

    function deleteFile(bytes32 fileId) external onlyFileOwner(fileId) fileExists(fileId){
        File storage file = files[fileId];
        FileMetadata storage metadata = fileMetadata[fileId];
        _removeFromIndexes(fileId, metadata.fileType, metadata.tags, file.isPublic);
        if (userStorageUsed[msg.sender] >= file.size){
            userStorageUsed[msg.sender] -= file.size;
        }
        else{
            userStorageUsed[msg.sender] = 0;
        }

        delete files[fileId];
        delete fileMetadata[fileId];
        delete fileExpiryDates[fileId];
        emit FileDeleted(fileId);
    }

    function _removeFromIndexes(
        bytes32 fileId,
        string memory fileType,
        string[] memory tags,
        bool isPublic
    ) internal {
        // Remove from file type index
        bytes32[] storage typeIndex = fileTypeIndex[fileType];
        for (uint i = 0; i < typeIndex.length; i++) {
            if (typeIndex[i] == fileId) {
                typeIndex[i] = typeIndex[typeIndex.length - 1];
                typeIndex.pop();
                break;
            }
        }

        // Remove from tag indexes
        for (uint j = 0; j < tags.length; j++) {
            bytes32[] storage tagIndex = taggedFiles[tags[j]];
            for (uint k = 0; k < tagIndex.length; k++) {
                if (tagIndex[k] == fileId) {
                    tagIndex[k] = tagIndex[tagIndex.length - 1];
                    tagIndex.pop();
                    break;
                }
            }
        }

        // Remove from public files if applicable
        if (isPublic) {
            bytes32[] storage pubFiles = publicFiles;
            for (uint l = 0; l < pubFiles.length; l++) {
                if (pubFiles[l] == fileId) {
                    pubFiles[l] = pubFiles[pubFiles.length - 1];
                    pubFiles.pop();
                    break;
                }
            }
        }
    }

    function renewFile(bytes32 fileId, uint64 additionalPeriod)
        external payable onlyFileOwner(fileId) fileExists(fileId)
    {
        uint256 renewalCost = _calculateStorageCost(files[fileId].size, additionalPeriod);
        if (msg.value < renewalCost) revert InsufficientPayment();

        unchecked {
            fileExpiryDates[fileId] += additionalPeriod;
        }

        filePayments[fileId] += uint128(msg.value);
    }

    function updateFileVersion(bytes32 fileId, string calldata newCID, uint128 newSize)
        external onlyFileOwner(fileId) fileExists(fileId)
    {
        File storage file = files[fileId];
        Subscription storage sub = subscriptions[msg.sender];

        // Check storage limit
        if (userStorageUsed[msg.sender] + newSize - file.size > sub.storageLimit) {
            revert StorageLimitExceeded();
        }

        // Update size and CID
        unchecked {
            userStorageUsed[msg.sender] += (newSize - file.size);
            file.size = newSize;
            file.cid = newCID;
            ++file.version;
        }

        emit FileUpdated(fileId, file.version);
    }

    function withdrawEarnings() external {
        uint128 amount = earnedRevenue[msg.sender];
        require(amount > 0, "No earnings");
        earnedRevenue[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
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
     * @dev Get user's files for dashboard display
     */
    function getUserFiles(address user) 
        external 
        view 
        returns (
            bytes32[] memory fileIds,
            string[] memory names,
            string[] memory cids,
            uint128[] memory sizes,
            uint64[] memory uploadDates,
            bool[] memory isPublics,
            string[] memory fileTypes
        ) {
        bytes32[] storage userFileIds = userFiles[user];
        uint256 fileCount = userFileIds.length;
        
        fileIds = new bytes32[](fileCount);
        names = new string[](fileCount);
        cids = new string[](fileCount);
        sizes = new uint128[](fileCount);
        uploadDates = new uint64[](fileCount);
        isPublics = new bool[](fileCount);
        fileTypes = new string[](fileCount);

        for (uint256 i = 0; i < fileCount; i++) {
            bytes32 fileId = userFileIds[i];
            File storage file = files[fileId];
            FileMetadata storage metadata = fileMetadata[fileId];
            
            fileIds[i] = fileId;
            names[i] = metadata.name;
            cids[i] = file.cid;
            sizes[i] = file.size;
            uploadDates[i] = file.uploadDate;
            isPublics[i] = file.isPublic;
            fileTypes[i] = metadata.fileType;
        }
        
        return (fileIds, names, cids, sizes, uploadDates, isPublics, fileTypes);
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
        uint8 tier,
        uint64 expiryDate
    ) {
        Subscription storage sub = subscriptions[user];
        storageUsed = userStorageUsed[user];
        storageLimit = sub.storageLimit;
        bandwidthUsed = userBandwidthUsed[user];
        bandwidthLimit = sub.bandwidthLimit;
        fileCount = userFiles[user].length;
        folderCount = userFolders[user].length;
        tier = sub.tier;
        expiryDate = sub.expiryDate;
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
    
    // ============ TOKEN PAYMENT FUNCTIONS ============
    
    /**
     * @dev Add a new supported payment token
     * @param token Address of the ERC20 token
     * @param price Price in wei per token
     */
    function addPaymentToken(address token, uint256 price) external onlyOwner {
        if (token == address(0)) revert InvalidInput();
        if (price == 0) revert InvalidTokenPrice();
        
        supportedTokens[token] = true;
        tokenPrices[token] = price;
        
        emit TokenAdded(token, price);
    }
    
    /**
     * @dev Remove a supported payment token
     * @param token Address of the ERC20 token
     */
    function removePaymentToken(address token) external onlyOwner {
        if (!supportedTokens[token]) revert TokenNotSupported();
        
        supportedTokens[token] = false;
        tokenPrices[token] = 0;
        
        if (defaultPaymentToken == token) {
            defaultPaymentToken = address(0);
        }
        
        emit TokenRemoved(token);
    }
    
    /**
     * @dev Update token price
     * @param token Address of the ERC20 token
     * @param newPrice New price in wei per token
     */
    function updateTokenPrice(address token, uint256 newPrice) external onlyOwner {
        if (!supportedTokens[token]) revert TokenNotSupported();
        if (newPrice == 0) revert InvalidTokenPrice();
        
        tokenPrices[token] = newPrice;
        
        emit TokenPriceUpdated(token, newPrice);
    }
    
    /**
     * @dev Set default payment token
     * @param token Address of the ERC20 token
     */
    function setDefaultPaymentToken(address token) external onlyOwner {
        if (token != address(0) && !supportedTokens[token]) revert TokenNotSupported();
        
        defaultPaymentToken = token;
        
        emit DefaultTokenChanged(token);
    }
    
    /**
     * @dev Calculate token amount needed for payment
     * @param ethAmount Amount in wei
     * @param token Address of the payment token
     * @return tokenAmount Amount of tokens needed
     */
    function calculateTokenAmount(uint256 ethAmount, address token) public view returns (uint256 tokenAmount) {
        if (!supportedTokens[token]) revert TokenNotSupported();
        
        uint256 tokenPrice = tokenPrices[token];
        // Calculate token amount with rounding up
        tokenAmount = (ethAmount * 1e18 + tokenPrice - 1) / tokenPrice;
    }
    
    /**
     * @dev Upload file with token payment
     * @param params Encoded parameters
     * @param token Address of the payment token
     */
    function uploadFileWithToken(bytes calldata params, address token) 
        external 
        nonReentrant 
        whenNotPaused 
        returns (bytes32 fileId) 
    {
        if (!supportedTokens[token]) revert TokenNotSupported();
        
        // Decode parameters to get size and storage period
        (
            , , , uint128 size, , , , , , uint64 storagePeriod
        ) = abi.decode(params, (string, string, string, uint128, string, bool, bool, string[], bytes32, uint64));
        
        // Calculate ETH cost
        uint256 ethCost = _calculateStorageCost(size, storagePeriod);
        
        // Calculate token amount needed
        uint256 tokenAmount = calculateTokenAmount(ethCost, token);
        
        // Transfer tokens from user
        IERC20(token).transferFrom(msg.sender, address(this), tokenAmount);
        
        // Process the upload
        fileId = _uploadFile(params);
        
        emit TokenPaymentReceived(token, msg.sender, tokenAmount);
    }
    
    /**
     * @dev Purchase subscription with token payment
     * @param tier Subscription tier
     * @param duration Duration in seconds
     * @param referrer Referrer address
     * @param token Address of the payment token
     */
    function purchaseSubscriptionWithToken(
        uint8 tier,
        uint64 duration,
        address referrer,
        address token
    ) external nonReentrant {
        if (!supportedTokens[token]) revert TokenNotSupported();
        
        // Calculate ETH cost
        uint256 ethCost = _calculateSubscriptionCost(tier, duration);
        
        // Calculate token amount needed
        uint256 tokenAmount = calculateTokenAmount(ethCost, token);
        
        // Transfer tokens from user
        IERC20(token).transferFrom(msg.sender, address(this), tokenAmount);
        
        // Process the subscription purchase
        _processSubscriptionPurchase(tier, duration, referrer);
        
        emit TokenPaymentReceived(token, msg.sender, tokenAmount);
    }
    
    /**
     * @dev Internal function to process subscription purchase
     */
    function _processSubscriptionPurchase(
        uint8 tier,
        uint64 duration,
        address referrer
    ) internal {
        if (tier > MAX_TIER) revert InvalidInput();
        if (duration < minimumStoragePeriod) revert InvalidInput();
        
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
        
        emit SubscriptionPurchased(msg.sender, tier, duration);
    }
    
    /**
     * @dev Withdraw tokens from contract
     * @param token Address of the token to withdraw
     * @param amount Amount to withdraw
     */
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        if (!supportedTokens[token]) revert TokenNotSupported();
        
        IERC20(token).transfer(owner(), amount);
    }
    
    // ============ GDV TOKEN INTEGRATION ============
    
    /**
     * @dev Set GDV token address
     * @param token Address of the GDV token contract
     */
    function setGDVToken(address token) external onlyOwner {
        if (token == address(0)) revert InvalidInput();
        gdvToken = IGDVToken(token);
        gdvEnabled = true;
        emit GDVTokenSet(token);
    }
    
    /**
     * @dev Enable/disable GDV payments
     * @param enabled Whether GDV payments should be enabled
     */
    function setGDVEnabled(bool enabled) external onlyOwner {
        gdvEnabled = enabled;
        emit GDVEnabled(enabled);
    }
    
    /**
     * @dev Update GDV discount percentage
     * @param discount New discount percentage in basis points
     */
    function updateGDVDiscount(uint256 discount) external onlyOwner {
        if (discount > BASIS_POINTS) revert InvalidGDVDiscount();
        gdvDiscount = discount;
        emit GDVDiscountUpdated(discount);
    }
    
    /**
     * @dev Calculate GDV amount needed for payment with discount
     * @param ethAmount Amount in wei
     * @return gdvAmount Amount of GDV tokens needed
     */
    function calculateGDVAmount(uint256 ethAmount) public view returns (uint256 gdvAmount) {
        if (!gdvEnabled) revert GDVNotEnabled();
        
        uint256 discountedAmount = ethAmount * (BASIS_POINTS - gdvDiscount) / BASIS_POINTS;
        return gdvToken.getTokenAmount(discountedAmount);
    }
    
    /**
     * @dev Upload file with GDV payment
     * @param params Encoded parameters
     */
    function uploadFileWithGDV(bytes calldata params) 
        external 
        nonReentrant 
        whenNotPaused 
        returns (bytes32 fileId) 
    {
        if (!gdvEnabled) revert GDVNotEnabled();
        
        // Decode parameters to get size and storage period
        (
            , , , uint128 size, , , , , , uint64 storagePeriod
        ) = abi.decode(params, (string, string, string, uint128, string, bool, bool, string[], bytes32, uint64));
        
        // Calculate ETH cost
        uint256 ethCost = _calculateStorageCost(size, storagePeriod);
        
        // Calculate GDV amount needed with discount
        uint256 gdvAmount = calculateGDVAmount(ethCost);
        
        // Transfer GDV tokens from user
        gdvToken.transferFrom(msg.sender, address(this), gdvAmount);
        
        // Process the upload
        fileId = _uploadFile(params);
        
        emit GDVPaymentReceived(msg.sender, gdvAmount);
    }
    
    /**
     * @dev Purchase subscription with GDV payment
     * @param tier Subscription tier
     * @param duration Duration in seconds
     * @param referrer Referrer address
     */
    function purchaseSubscriptionWithGDV(
        uint8 tier,
        uint64 duration,
        address referrer
    ) external nonReentrant {
        if (!gdvEnabled) revert GDVNotEnabled();
        
        // Calculate ETH cost
        uint256 ethCost = _calculateSubscriptionCost(tier, duration);
        
        // Calculate GDV amount needed with discount
        uint256 gdvAmount = calculateGDVAmount(ethCost);
        
        // Transfer GDV tokens from user
        gdvToken.transferFrom(msg.sender, address(this), gdvAmount);
        
        // Process the subscription purchase
        _processSubscriptionPurchase(tier, duration, referrer);
        
        emit GDVPaymentReceived(msg.sender, gdvAmount);
    }
    
    /**
     * @dev Convert GDV tokens to ETH
     * @param gdvAmount Amount of GDV tokens to convert
     */
    function convertGDVToEth(uint256 gdvAmount) external nonReentrant {
        if (!gdvEnabled) revert GDVNotEnabled();
        
        // Transfer GDV tokens from user
        gdvToken.transferFrom(msg.sender, address(this), gdvAmount);
        
        // Calculate ETH amount
        uint256 ethAmount = gdvToken.getEthAmount(gdvAmount);
        
        // Transfer ETH to user
        payable(msg.sender).transfer(ethAmount);
    }
    
    // ============ RECEIVE FUNCTION ============
    
    receive() external payable {
        // Allow contract to receive ETH
    }
}
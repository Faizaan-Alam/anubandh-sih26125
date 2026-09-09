// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Roles} from "./Roles.sol";
import {IRoleManager} from "./interfaces/IRoleManager.sol";
import {IAssetNFT} from "./interfaces/IAssetNFT.sol";

/// @title AssetNFT
/// @notice Permissioned ERC-721 representing a managed digital or physical asset.
/// @dev Transfers are policy-gated through RoleManager. Quarantined tokens cannot move.
///      Approvals are disabled: this is not an open marketplace token.
contract AssetNFT is ERC721, ReentrancyGuard, IAssetNFT {
    struct Asset {
        bytes32 assetIdentifier;
        address custodian;
        bytes32 metadataHash;
        uint64 freshnessTimestamp;
        uint64 freshnessWindow;
        uint8 assetClass;
        bool quarantined;
        bool highValue;
        bool exists;
    }

    IRoleManager public immutable roleManager;
    address public divergenceRegistry;
    address public attestationRegistry;

    uint256 private _nextId = 1;
    mapping(uint256 tokenId => Asset) private _assets;
    mapping(bytes32 assetIdentifier => uint256 tokenId) public tokenByIdentifier;

    event AssetMinted(
        uint256 indexed tokenId,
        bytes32 indexed assetIdentifier,
        address indexed owner,
        address custodian,
        bytes32 metadataHash,
        uint8 assetClass,
        bool highValue,
        address actor
    );
    event AssetAllocated(uint256 indexed tokenId, address indexed previousCustodian, address indexed newCustodian, address actor);
    event AssetTransferred(uint256 indexed tokenId, address indexed from, address indexed to, address actor);
    event AssetQuarantined(uint256 indexed tokenId, address indexed actor);
    event AssetReconciled(uint256 indexed tokenId, address indexed actor, address newCustodian);
    event FreshnessUpdated(uint256 indexed tokenId, uint64 observedAt);
    event DivergenceRegistrySet(address indexed registry);
    event AttestationRegistrySet(address indexed registry);

    error Unauthorized();
    error ZeroAddress();
    error AlreadySet();
    error UnknownToken();
    error IdentifierTaken();
    error AssetQuarantinedError(uint256 tokenId);
    error ApprovalsDisabled();
    error OnlyDivergenceRegistry();
    error OnlyAttestationRegistry();

    modifier onlyAdmin() {
        if (!roleManager.hasActiveRole(msg.sender, Roles.ADMIN)) revert Unauthorized();
        _;
    }

    modifier onlyAdminOrManager() {
        if (
            !roleManager.hasActiveRole(msg.sender, Roles.ADMIN)
                && !roleManager.hasActiveRole(msg.sender, Roles.MANAGER)
        ) {
            revert Unauthorized();
        }
        _;
    }

    constructor(address roleManager_) ERC721("ANUBANDH Asset", "ANUAST") {
        if (roleManager_ == address(0)) revert ZeroAddress();
        roleManager = IRoleManager(roleManager_);
    }

    /// @notice Wire the DivergenceRegistry allowed to toggle quarantine. One-time.
    function setDivergenceRegistry(address registry) external onlyAdmin {
        if (registry == address(0)) revert ZeroAddress();
        if (divergenceRegistry != address(0)) revert AlreadySet();
        divergenceRegistry = registry;
        emit DivergenceRegistrySet(registry);
    }

    /// @notice Wire the AttestationRegistry allowed to update freshness. One-time.
    function setAttestationRegistry(address registry) external onlyAdmin {
        if (registry == address(0)) revert ZeroAddress();
        if (attestationRegistry != address(0)) revert AlreadySet();
        attestationRegistry = registry;
        emit AttestationRegistrySet(registry);
    }

    /// @notice Mint a new asset NFT. Admin only.
    /// @param to Initial owner.
    /// @param assetIdentifier Unique off-chain identifier commitment (e.g. keccak256 of serial).
    /// @param metadataHash Keccak256 of the off-chain metadata document. The document itself is never stored on-chain.
    /// @param assetClass Policy class used to select freshness windows off-chain.
    /// @param freshnessWindow Seconds after an observation during which it is considered fresh.
    /// @param highValue If true, quarantine release requires Manager+Admin separation of duties.
    /// @param custodian Initial custodian; if zero, defaults to `to`.
    function mint(
        address to,
        bytes32 assetIdentifier,
        bytes32 metadataHash,
        uint8 assetClass,
        uint64 freshnessWindow,
        bool highValue,
        address custodian
    ) external onlyAdmin nonReentrant returns (uint256 tokenId) {
        if (to == address(0)) revert ZeroAddress();
        if (assetIdentifier == bytes32(0)) revert IdentifierTaken();
        if (tokenByIdentifier[assetIdentifier] != 0) revert IdentifierTaken();
        address cust = custodian == address(0) ? to : custodian;

        tokenId = _nextId++;
        _assets[tokenId] = Asset({
            assetIdentifier: assetIdentifier,
            custodian: cust,
            metadataHash: metadataHash,
            freshnessTimestamp: uint64(block.timestamp),
            freshnessWindow: freshnessWindow == 0 ? 7 days : freshnessWindow,
            assetClass: assetClass,
            quarantined: false,
            highValue: highValue,
            exists: true
        });
        tokenByIdentifier[assetIdentifier] = tokenId;
        _safeMint(to, tokenId);
        emit AssetMinted(tokenId, assetIdentifier, to, cust, metadataHash, assetClass, highValue, msg.sender);
    }

    /// @notice Assign custody of an existing token. Admin or Manager. Blocked while quarantined.
    function allocate(uint256 tokenId, address newCustodian) external onlyAdminOrManager nonReentrant {
        if (newCustodian == address(0)) revert ZeroAddress();
        Asset storage a = _requireToken(tokenId);
        if (a.quarantined) revert AssetQuarantinedError(tokenId);
        address previous = a.custodian;
        a.custodian = newCustodian;
        emit AssetAllocated(tokenId, previous, newCustodian, msg.sender);
    }

    /// @notice Transfer ownership. Admin or Manager. Blocked while quarantined.
    function transferOwnershipTo(uint256 tokenId, address newOwner) external onlyAdminOrManager nonReentrant {
        if (newOwner == address(0)) revert ZeroAddress();
        address from = ownerOf(tokenId);
        _safeTransfer(from, newOwner, tokenId, "");
        emit AssetTransferred(tokenId, from, newOwner, msg.sender);
    }

    /// @notice Transfer custody (not ownership). Admin or Manager. Blocked while quarantined.
    function transferCustody(uint256 tokenId, address newCustodian) external onlyAdminOrManager nonReentrant {
        if (newCustodian == address(0)) revert ZeroAddress();
        Asset storage a = _requireToken(tokenId);
        if (a.quarantined) revert AssetQuarantinedError(tokenId);
        address previous = a.custodian;
        a.custodian = newCustodian;
        emit AssetAllocated(tokenId, previous, newCustodian, msg.sender);
    }

    /// @inheritdoc IAssetNFT
    function setQuarantine(uint256 tokenId, bool quarantined) external {
        if (msg.sender != divergenceRegistry) revert OnlyDivergenceRegistry();
        Asset storage a = _requireToken(tokenId);
        a.quarantined = quarantined;
        if (quarantined) {
            emit AssetQuarantined(tokenId, msg.sender);
        }
    }

    /// @inheritdoc IAssetNFT
    function applyReconciledState(uint256 tokenId, address newCustodian) external {
        if (msg.sender != divergenceRegistry) revert OnlyDivergenceRegistry();
        Asset storage a = _requireToken(tokenId);
        if (newCustodian == address(0)) revert ZeroAddress();
        a.custodian = newCustodian;
        a.quarantined = false;
        a.freshnessTimestamp = uint64(block.timestamp);
        emit AssetReconciled(tokenId, msg.sender, newCustodian);
    }

    /// @inheritdoc IAssetNFT
    function updateFreshness(uint256 tokenId, uint64 observedAt) external {
        if (msg.sender != attestationRegistry) revert OnlyAttestationRegistry();
        Asset storage a = _requireToken(tokenId);
        if (observedAt > a.freshnessTimestamp) {
            a.freshnessTimestamp = observedAt;
            emit FreshnessUpdated(tokenId, observedAt);
        }
    }

    /// @inheritdoc IAssetNFT
    function isQuarantined(uint256 tokenId) public view returns (bool) {
        return _assets[tokenId].quarantined;
    }

    /// @inheritdoc IAssetNFT
    function exists(uint256 tokenId) public view returns (bool) {
        return _assets[tokenId].exists;
    }

    /// @inheritdoc ERC721
    function ownerOf(uint256 tokenId) public view override(ERC721, IAssetNFT) returns (address) {
        return super.ownerOf(tokenId);
    }

    /// @inheritdoc IAssetNFT
    function custodianOf(uint256 tokenId) external view returns (address) {
        _requireToken(tokenId);
        return _assets[tokenId].custodian;
    }

    /// @inheritdoc IAssetNFT
    function freshnessWindowOf(uint256 tokenId) external view returns (uint64) {
        _requireToken(tokenId);
        return _assets[tokenId].freshnessWindow;
    }

    /// @inheritdoc IAssetNFT
    function isHighValue(uint256 tokenId) external view returns (bool) {
        _requireToken(tokenId);
        return _assets[tokenId].highValue;
    }

    /// @notice Total number of tokens ever minted (ids are sequential from 1).
    function totalMinted() external view returns (uint256) {
        return _nextId - 1;
    }

    /// @notice Read the full asset record.
    function getAsset(uint256 tokenId)
        external
        view
        returns (
            bytes32 assetIdentifier,
            address owner,
            address custodian,
            bytes32 metadataHash,
            uint64 freshnessTimestamp,
            uint64 freshnessWindow,
            uint8 assetClass,
            bool quarantined,
            bool highValue
        )
    {
        Asset storage a = _requireToken(tokenId);
        return (
            a.assetIdentifier,
            ownerOf(tokenId),
            a.custodian,
            a.metadataHash,
            a.freshnessTimestamp,
            a.freshnessWindow,
            a.assetClass,
            a.quarantined,
            a.highValue
        );
    }

    /// @dev Block any transfer while quarantined. Mint (from == 0) is allowed.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0) && _assets[tokenId].quarantined) {
            revert AssetQuarantinedError(tokenId);
        }
        return super._update(to, tokenId, auth);
    }

    /// @dev Restrict ERC-721 transferFrom to Admin/Manager so default owner-driven transfers cannot bypass policy.
    function transferFrom(address from, address to, uint256 tokenId) public override {
        if (
            !roleManager.hasActiveRole(msg.sender, Roles.ADMIN)
                && !roleManager.hasActiveRole(msg.sender, Roles.MANAGER)
        ) {
            revert Unauthorized();
        }
        super.transferFrom(from, to, tokenId);
        emit AssetTransferred(tokenId, from, to, msg.sender);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override {
        if (
            !roleManager.hasActiveRole(msg.sender, Roles.ADMIN)
                && !roleManager.hasActiveRole(msg.sender, Roles.MANAGER)
        ) {
            revert Unauthorized();
        }
        super.safeTransferFrom(from, to, tokenId, data);
        emit AssetTransferred(tokenId, from, to, msg.sender);
    }

    function approve(address, uint256) public pure override {
        revert ApprovalsDisabled();
    }

    function setApprovalForAll(address, bool) public pure override {
        revert ApprovalsDisabled();
    }

    function _requireToken(uint256 tokenId) internal view returns (Asset storage a) {
        a = _assets[tokenId];
        if (!a.exists) revert UnknownToken();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Roles} from "./Roles.sol";
import {IRoleManager} from "./interfaces/IRoleManager.sol";
import {IDIDRegistry} from "./interfaces/IDIDRegistry.sol";
import {IAssetNFT} from "./interfaces/IAssetNFT.sol";
import {IAttestationRegistry} from "./interfaces/IAttestationRegistry.sol";
import {IDivergenceRegistry} from "./interfaces/IDivergenceRegistry.sol";

/// @title AttestationRegistry
/// @notice Stores signed, role-bound asset observations with evidence tiers and replay protection.
/// @dev IdentifierScan is the weaker QR/NFC-style tier. SignedInspection is the stronger role-bound tier.
///      Neither tier is a claim of physical unclonability.
contract AttestationRegistry is EIP712, ReentrancyGuard, IAttestationRegistry {
    using ECDSA for bytes32;

    uint8 public constant TIER_IDENTIFIER_SCAN = 0;
    uint8 public constant TIER_SIGNED_INSPECTION = 1;

    bytes32 public constant ATTESTATION_TYPEHASH = keccak256(
        "Attestation(uint256 tokenId,uint8 evidenceTier,address custodian,bytes32 locationId,uint8 condition,bytes32 nonce,uint256 validUntil)"
    );

    IRoleManager public immutable roleManager;
    IDIDRegistry public immutable didRegistry;
    IAssetNFT public immutable assetNFT;
    IDivergenceRegistry public divergenceRegistry;

    uint256 private _nextId = 1;
    mapping(uint256 id => Observation) private _attestations;
    mapping(uint256 tokenId => uint256[] ids) private _byToken;
    mapping(bytes32 nonce => bool used) public nonceUsed;

    event AttestationRecorded(
        uint256 indexed attestationId,
        uint256 indexed tokenId,
        address indexed observer,
        uint8 evidenceTier,
        address custodian,
        bytes32 locationId,
        uint8 condition,
        bytes32 nonce,
        bytes32 observationHash,
        uint64 timestamp
    );
    event DivergenceRegistrySet(address indexed registry);

    error Unauthorized();
    error ZeroAddress();
    error AlreadySet();
    error UnknownToken();
    error InvalidTier();
    error NonceReused();
    error InvalidSignature();
    error ExpiredPayload();
    error ObserverRevoked();

    constructor(address roleManager_, address didRegistry_, address assetNFT_)
        EIP712("ANUBANDH Attestation", "1")
    {
        if (roleManager_ == address(0) || didRegistry_ == address(0) || assetNFT_ == address(0)) {
            revert ZeroAddress();
        }
        roleManager = IRoleManager(roleManager_);
        didRegistry = IDIDRegistry(didRegistry_);
        assetNFT = IAssetNFT(assetNFT_);
    }

    /// @notice Wire DivergenceRegistry. One-time, Admin only.
    function setDivergenceRegistry(address registry) external {
        if (!roleManager.hasActiveRole(msg.sender, Roles.ADMIN)) revert Unauthorized();
        if (registry == address(0)) revert ZeroAddress();
        if (address(divergenceRegistry) != address(0)) revert AlreadySet();
        divergenceRegistry = IDivergenceRegistry(registry);
        emit DivergenceRegistrySet(registry);
    }

    /// @notice Submit a signed observation for `tokenId`.
    /// @param observer Address that signed the payload; must hold Admin, Manager or User.
    /// @param tokenId Asset token.
    /// @param evidenceTier 0 = IdentifierScan (weaker), 1 = SignedInspection (stronger).
    /// @param custodian Observed custodian address.
    /// @param locationId Hash of the observed location string (raw location stays off-chain).
    /// @param condition 0 Unknown, 1 Good, 2 Damaged, 3 Missing.
    /// @param nonce Unique observer-provided nonce for replay protection.
    /// @param validUntil Unix timestamp after which the signed payload is rejected.
    /// @param observationHash Hash of any richer off-chain observation document.
    /// @param signature EIP-712 signature by `observer`.
    function submitAttestation(
        address observer,
        uint256 tokenId,
        uint8 evidenceTier,
        address custodian,
        bytes32 locationId,
        uint8 condition,
        bytes32 nonce,
        uint256 validUntil,
        bytes32 observationHash,
        bytes calldata signature
    ) external nonReentrant returns (uint256 attestationId) {
        if (observer == address(0) || custodian == address(0)) revert ZeroAddress();
        if (!assetNFT.exists(tokenId)) revert UnknownToken();
        if (evidenceTier > TIER_SIGNED_INSPECTION) revert InvalidTier();
        if (nonceUsed[nonce]) revert NonceReused();
        if (block.timestamp > validUntil) revert ExpiredPayload();
        if (!_authorizedObserver(observer)) revert Unauthorized();
        if (!didRegistry.isActiveController(observer)) revert ObserverRevoked();

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ATTESTATION_TYPEHASH,
                    tokenId,
                    evidenceTier,
                    custodian,
                    locationId,
                    condition,
                    nonce,
                    validUntil
                )
            )
        );
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != observer) revert InvalidSignature();

        nonceUsed[nonce] = true;
        attestationId = _nextId++;
        uint64 ts = uint64(block.timestamp);
        _attestations[attestationId] = Observation({
            observer: observer,
            tokenId: tokenId,
            evidenceTier: evidenceTier,
            custodian: custodian,
            locationId: locationId,
            condition: condition,
            nonce: nonce,
            observationHash: observationHash,
            timestamp: ts
        });
        _byToken[tokenId].push(attestationId);

        assetNFT.updateFreshness(tokenId, ts);

        emit AttestationRecorded(
            attestationId, tokenId, observer, evidenceTier, custodian, locationId, condition, nonce, observationHash, ts
        );

        if (address(divergenceRegistry) != address(0)) {
            divergenceRegistry.onAttestation(tokenId, attestationId);
        }
    }

    /// @inheritdoc IAttestationRegistry
    function getAttestation(uint256 attestationId) external view returns (Observation memory) {
        return _attestations[attestationId];
    }

    /// @inheritdoc IAttestationRegistry
    function attestationsOf(uint256 tokenId) external view returns (uint256[] memory) {
        return _byToken[tokenId];
    }

    /// @notice EIP-712 domain separator for off-chain signers.
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function _authorizedObserver(address observer) internal view returns (bool) {
        return roleManager.hasActiveRole(observer, Roles.ADMIN)
            || roleManager.hasActiveRole(observer, Roles.MANAGER)
            || roleManager.hasActiveRole(observer, Roles.USER);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Roles} from "./Roles.sol";
import {IRoleManager} from "./interfaces/IRoleManager.sol";
import {IAssetNFT} from "./interfaces/IAssetNFT.sol";
import {IAttestationRegistry} from "./interfaces/IAttestationRegistry.sol";

/// @title DivergenceRegistry
/// @notice Detects incompatible observations, quarantines the asset, and records immutable history.
/// @dev Divergence rule: for the same token, if two attestations both falling within the asset's
///      freshness window report different custodian, locationId, or condition values, a divergence
///      is recorded and the asset is quarantined. Records are never deleted.
///
///      Separation of duties: releasing a high-value quarantined asset requires a Manager to
///      propose reconciliation and a different Admin to confirm it. Low-value assets may be
///      reconciled by a single Manager (or Admin) action.
contract DivergenceRegistry is ReentrancyGuard {
    struct DivergenceRecord {
        uint256 tokenId;
        uint256 attestationA;
        uint256 attestationB;
        uint64 detectedAt;
        bool resolved;
        uint64 resolvedAt;
        address proposer;
        address confirmer;
        bytes32 evidenceHash;
        address acceptedCustodian;
        bytes32 acceptedLocationId;
        uint8 acceptedCondition;
        bool pending;
    }

    IRoleManager public immutable roleManager;
    IAssetNFT public immutable assetNFT;
    IAttestationRegistry public immutable attestationRegistry;

    uint256 private _nextId = 1;
    mapping(uint256 id => DivergenceRecord) private _records;
    mapping(uint256 tokenId => uint256[] ids) private _byToken;
    mapping(uint256 tokenId => uint256 openId) public openDivergenceOf;

    event DivergenceDetected(
        uint256 indexed divergenceId,
        uint256 indexed tokenId,
        uint256 attestationA,
        uint256 attestationB,
        uint64 detectedAt
    );
    event ReconciliationProposed(
        uint256 indexed divergenceId,
        uint256 indexed tokenId,
        address indexed proposer,
        bytes32 evidenceHash,
        address acceptedCustodian
    );
    event AssetReconciled(
        uint256 indexed divergenceId,
        uint256 indexed tokenId,
        address indexed confirmer,
        address acceptedCustodian,
        bytes32 acceptedLocationId,
        uint8 acceptedCondition
    );

    error Unauthorized();
    error ZeroAddress();
    error OnlyAttestationRegistry();
    error UnknownDivergence();
    error AlreadyResolved();
    error NoOpenDivergence();
    error ProposalRequired();
    error SeparationOfDuties();
    error AlreadyPending();

    constructor(address roleManager_, address assetNFT_, address attestationRegistry_) {
        if (roleManager_ == address(0) || assetNFT_ == address(0) || attestationRegistry_ == address(0)) {
            revert ZeroAddress();
        }
        roleManager = IRoleManager(roleManager_);
        assetNFT = IAssetNFT(assetNFT_);
        attestationRegistry = IAttestationRegistry(attestationRegistry_);
    }

    /// @notice Compare the new attestation against prior ones in the freshness window.
    /// @dev Called by AttestationRegistry. If an open divergence already exists, skip (do not duplicate).
    function onAttestation(uint256 tokenId, uint256 newAttestationId) external nonReentrant {
        if (msg.sender != address(attestationRegistry)) revert OnlyAttestationRegistry();
        if (openDivergenceOf[tokenId] != 0) return;

        IAttestationRegistry.Observation memory incoming = attestationRegistry.getAttestation(newAttestationId);
        uint64 window = assetNFT.freshnessWindowOf(tokenId);
        uint256[] memory ids = attestationRegistry.attestationsOf(tokenId);

        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] == newAttestationId) continue;
            IAttestationRegistry.Observation memory other = attestationRegistry.getAttestation(ids[i]);
            if (!_withinWindow(incoming.timestamp, other.timestamp, window)) continue;
            if (_conflicts(incoming, other)) {
                uint256 divergenceId = _nextId++;
                _records[divergenceId] = DivergenceRecord({
                    tokenId: tokenId,
                    attestationA: other.tokenId == incoming.tokenId ? ids[i] : ids[i],
                    attestationB: newAttestationId,
                    detectedAt: uint64(block.timestamp),
                    resolved: false,
                    resolvedAt: 0,
                    proposer: address(0),
                    confirmer: address(0),
                    evidenceHash: bytes32(0),
                    acceptedCustodian: address(0),
                    acceptedLocationId: bytes32(0),
                    acceptedCondition: 0,
                    pending: false
                });
                _byToken[tokenId].push(divergenceId);
                openDivergenceOf[tokenId] = divergenceId;
                assetNFT.setQuarantine(tokenId, true);
                emit DivergenceDetected(divergenceId, tokenId, ids[i], newAttestationId, uint64(block.timestamp));
                return;
            }
        }
    }

    /// @notice Propose (and, for low-value assets, immediately apply) a reconciliation.
    /// @dev Manager or Admin. High-value assets stay quarantined until a distinct Admin confirms.
    function proposeReconciliation(
        uint256 divergenceId,
        bytes32 evidenceHash,
        address acceptedCustodian,
        bytes32 acceptedLocationId,
        uint8 acceptedCondition
    ) external nonReentrant {
        if (
            !roleManager.hasActiveRole(msg.sender, Roles.MANAGER)
                && !roleManager.hasActiveRole(msg.sender, Roles.ADMIN)
        ) {
            revert Unauthorized();
        }
        if (acceptedCustodian == address(0)) revert ZeroAddress();
        DivergenceRecord storage rec = _requireOpen(divergenceId);
        if (rec.pending) revert AlreadyPending();

        rec.proposer = msg.sender;
        rec.evidenceHash = evidenceHash;
        rec.acceptedCustodian = acceptedCustodian;
        rec.acceptedLocationId = acceptedLocationId;
        rec.acceptedCondition = acceptedCondition;
        rec.pending = true;
        emit ReconciliationProposed(divergenceId, rec.tokenId, msg.sender, evidenceHash, acceptedCustodian);

        if (!assetNFT.isHighValue(rec.tokenId)) {
            _finalize(rec, divergenceId, msg.sender);
        }
    }

    /// @notice Admin confirmation for high-value quarantine release. Confirmer must differ from proposer.
    function confirmReconciliation(uint256 divergenceId) external nonReentrant {
        if (!roleManager.hasActiveRole(msg.sender, Roles.ADMIN)) revert Unauthorized();
        DivergenceRecord storage rec = _requireOpen(divergenceId);
        if (!rec.pending) revert ProposalRequired();
        if (msg.sender == rec.proposer) revert SeparationOfDuties();
        _finalize(rec, divergenceId, msg.sender);
    }

    /// @notice Read a divergence record. Remains available after reconciliation (no delete).
    function getDivergence(uint256 divergenceId) external view returns (DivergenceRecord memory) {
        if (divergenceId == 0 || divergenceId >= _nextId) revert UnknownDivergence();
        return _records[divergenceId];
    }

    /// @notice All divergence ids for an asset, including resolved ones.
    function divergencesOf(uint256 tokenId) external view returns (uint256[] memory) {
        return _byToken[tokenId];
    }

    function totalDivergences() external view returns (uint256) {
        return _nextId - 1;
    }

    function _finalize(DivergenceRecord storage rec, uint256 divergenceId, address confirmer) internal {
        rec.resolved = true;
        rec.resolvedAt = uint64(block.timestamp);
        rec.confirmer = confirmer;
        rec.pending = false;
        delete openDivergenceOf[rec.tokenId];
        assetNFT.applyReconciledState(rec.tokenId, rec.acceptedCustodian);
        emit AssetReconciled(
            divergenceId, rec.tokenId, confirmer, rec.acceptedCustodian, rec.acceptedLocationId, rec.acceptedCondition
        );
    }

    function _requireOpen(uint256 divergenceId) internal view returns (DivergenceRecord storage rec) {
        if (divergenceId == 0 || divergenceId >= _nextId) revert UnknownDivergence();
        rec = _records[divergenceId];
        if (rec.resolved) revert AlreadyResolved();
        if (openDivergenceOf[rec.tokenId] != divergenceId) revert NoOpenDivergence();
    }

    function _withinWindow(uint64 a, uint64 b, uint64 window) internal pure returns (bool) {
        uint64 later = a > b ? a : b;
        uint64 earlier = a > b ? b : a;
        return later - earlier <= window;
    }

    function _conflicts(
        IAttestationRegistry.Observation memory a,
        IAttestationRegistry.Observation memory b
    ) internal pure returns (bool) {
        return a.custodian != b.custodian || a.locationId != b.locationId || a.condition != b.condition;
    }
}

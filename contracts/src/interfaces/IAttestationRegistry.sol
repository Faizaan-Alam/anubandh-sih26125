// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAttestationRegistry
/// @notice Read surface used by DivergenceRegistry to compare observations.
interface IAttestationRegistry {
    struct Observation {
        address observer;
        uint256 tokenId;
        uint8 evidenceTier;
        address custodian;
        bytes32 locationId;
        uint8 condition;
        bytes32 nonce;
        bytes32 observationHash;
        uint64 timestamp;
    }

    function getAttestation(uint256 attestationId) external view returns (Observation memory);
    function attestationsOf(uint256 tokenId) external view returns (uint256[] memory);
}

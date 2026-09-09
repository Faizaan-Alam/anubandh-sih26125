// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IDivergenceRegistry
/// @notice Called by AttestationRegistry after each accepted observation.
interface IDivergenceRegistry {
    function onAttestation(uint256 tokenId, uint256 newAttestationId) external;
}

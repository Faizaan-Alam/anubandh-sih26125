// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAssetNFT
/// @notice Cross-contract surface used by attestation and divergence registries.
interface IAssetNFT {
    function isQuarantined(uint256 tokenId) external view returns (bool);
    function exists(uint256 tokenId) external view returns (bool);
    function custodianOf(uint256 tokenId) external view returns (address);
    function ownerOf(uint256 tokenId) external view returns (address);
    function freshnessWindowOf(uint256 tokenId) external view returns (uint64);
    function isHighValue(uint256 tokenId) external view returns (bool);
    function setQuarantine(uint256 tokenId, bool quarantined) external;
    function updateFreshness(uint256 tokenId, uint64 observedAt) external;
    function applyReconciledState(uint256 tokenId, address newCustodian) external;
}

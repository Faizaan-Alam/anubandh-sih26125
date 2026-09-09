// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IDIDRegistry
/// @notice DID lookup used by attestation and identity-sensitive flows.
interface IDIDRegistry {
    enum Status {
        None,
        Active,
        Revoked
    }

    function controllerOf(string calldata did) external view returns (address);
    function statusOf(string calldata did) external view returns (Status);
    function didOfController(address controller) external view returns (string memory);
    function isActiveController(address controller) external view returns (bool);
}

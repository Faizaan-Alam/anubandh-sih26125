// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Roles
/// @notice Shared role identifiers used across ANUBANDH contracts.
/// @dev Values are keccak256 hashes, never compared as raw strings at the call site.
library Roles {
    bytes32 internal constant ADMIN = keccak256("ADMIN_ROLE");
    bytes32 internal constant MANAGER = keccak256("MANAGER_ROLE");
    bytes32 internal constant AUDITOR = keccak256("AUDITOR_ROLE");
    bytes32 internal constant USER = keccak256("USER_ROLE");
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IRoleManager
/// @notice Expiry-aware role checks used by every other ANUBANDH contract.
interface IRoleManager {
    function ADMIN_ROLE() external view returns (bytes32);
    function MANAGER_ROLE() external view returns (bytes32);
    function AUDITOR_ROLE() external view returns (bytes32);
    function USER_ROLE() external view returns (bytes32);

    /// @notice Returns true if `account` currently holds `role` and the grant has not expired.
    function hasActiveRole(address account, bytes32 role) external view returns (bool);

    /// @notice OpenZeppelin-compatible view; this implementation also accounts for expiry.
    function hasRole(bytes32 role, address account) external view returns (bool);

    /// @notice Timestamp at which the grant expires; 0 means it does not expire.
    function roleExpiry(address account, bytes32 role) external view returns (uint64);
}

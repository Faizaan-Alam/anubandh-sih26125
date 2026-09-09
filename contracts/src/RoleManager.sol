// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Roles} from "./Roles.sol";
import {IRoleManager} from "./interfaces/IRoleManager.sol";

/// @title RoleManager
/// @notice On-chain RBAC for Admin, Manager, Auditor and User with optional expiry.
/// @dev `hasRole` is overridden so every OpenZeppelin `onlyRole` check also respects expiry.
///      Separation of duties for high-value quarantine release is enforced in DivergenceRegistry
///      by requiring a Manager proposal and a distinct Admin confirmation.
contract RoleManager is AccessControl, IRoleManager {
    /// @notice Timestamp after which a grant is inactive. Zero means the grant does not expire.
    mapping(address account => mapping(bytes32 role => uint64 expiry)) private _roleExpiry;

    bytes32 public constant override ADMIN_ROLE = Roles.ADMIN;
    bytes32 public constant override MANAGER_ROLE = Roles.MANAGER;
    bytes32 public constant override AUDITOR_ROLE = Roles.AUDITOR;
    bytes32 public constant override USER_ROLE = Roles.USER;

    event RoleExpirySet(bytes32 indexed role, address indexed account, uint64 expiry, address indexed actor);

    error RoleExpired(address account, bytes32 role);
    error ZeroAddress();

    /// @param admin Address that receives DEFAULT_ADMIN_ROLE and ADMIN_ROLE at deployment.
    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(Roles.ADMIN, admin);
        _setRoleAdmin(Roles.ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(Roles.MANAGER, Roles.ADMIN);
        _setRoleAdmin(Roles.AUDITOR, Roles.ADMIN);
        _setRoleAdmin(Roles.USER, Roles.ADMIN);
    }

    /// @inheritdoc IRoleManager
    function hasRole(bytes32 role, address account) public view override(AccessControl, IRoleManager) returns (bool) {
        if (!super.hasRole(role, account)) {
            return false;
        }
        uint64 expiry = _roleExpiry[account][role];
        if (expiry != 0 && block.timestamp >= expiry) {
            return false;
        }
        return true;
    }

    /// @inheritdoc IRoleManager
    function hasActiveRole(address account, bytes32 role) public view returns (bool) {
        return hasRole(role, account);
    }

    /// @inheritdoc IRoleManager
    function roleExpiry(address account, bytes32 role) external view returns (uint64) {
        return _roleExpiry[account][role];
    }

    /// @notice Grant `role` to `account`. The grant does not expire.
    /// @dev Restricted to the role admin (Admin for operational roles).
    function grantRole(bytes32 role, address account) public override {
        _roleExpiry[account][role] = 0;
        super.grantRole(role, account);
        emit RoleExpirySet(role, account, 0, msg.sender);
    }

    /// @notice Grant `role` to `account` until `expiry` (unix seconds).
    /// @param role Role identifier.
    /// @param account Recipient.
    /// @param expiry Unix timestamp; must be in the future.
    function grantRoleWithExpiry(bytes32 role, address account, uint64 expiry) external {
        if (account == address(0)) revert ZeroAddress();
        require(expiry > block.timestamp, "expiry must be in the future");
        _checkRole(getRoleAdmin(role));
        _roleExpiry[account][role] = expiry;
        _grantRole(role, account);
        emit RoleExpirySet(role, account, expiry, msg.sender);
    }

    /// @notice Revoke `role` from `account` and clear any stored expiry.
    function revokeRole(bytes32 role, address account) public override {
        _roleExpiry[account][role] = 0;
        super.revokeRole(role, account);
    }

    /// @notice Require that `account` currently holds `role` (including expiry).
    function checkActiveRole(address account, bytes32 role) external view {
        if (!hasRole(role, account)) {
            if (super.hasRole(role, account)) revert RoleExpired(account, role);
            revert AccessControlUnauthorizedAccount(account, role);
        }
    }
}

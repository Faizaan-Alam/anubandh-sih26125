// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Roles} from "./Roles.sol";
import {IRoleManager} from "./interfaces/IRoleManager.sol";
import {IDIDRegistry} from "./interfaces/IDIDRegistry.sol";

/// @title DIDRegistry
/// @notice Registers did:ethr-compatible identifiers and tracks controller keys and status.
/// @dev DID format: did:ethr:<chainId>:<address>. The identifier is stable across key rotation.
contract DIDRegistry is IDIDRegistry {
    struct Record {
        address controller;
        Status status;
        uint64 registeredAt;
        uint64 revokedAt;
    }

    IRoleManager public immutable roleManager;

    mapping(string did => Record record) private _records;
    mapping(address controller => string did) private _didByController;

    event DIDRegistered(string did, address indexed controller, address indexed actor);
    event KeyRotated(string did, address indexed previousController, address indexed newController);
    event DIDRevoked(string did, address indexed controller, address indexed actor);

    error InvalidDID();
    error DIDAlreadyRegistered();
    error DIDNotFound();
    error DIDAlreadyRevoked();
    error Unauthorized();
    error ControllerInUse();
    error ZeroAddress();

    constructor(address roleManager_) {
        if (roleManager_ == address(0)) revert ZeroAddress();
        roleManager = IRoleManager(roleManager_);
    }

    /// @notice Register a new DID bound to `controller`.
    /// @dev Caller must be the controller, or an active Admin registering on someone's behalf.
    /// @param did did:ethr:<chainId>:<address> identifier.
    /// @param controller Current controlling key.
    function register(string calldata did, address controller) external {
        if (controller == address(0)) revert ZeroAddress();
        if (!_validDid(did)) revert InvalidDID();
        if (_records[did].status != Status.None) revert DIDAlreadyRegistered();
        if (bytes(_didByController[controller]).length != 0) revert ControllerInUse();

        bool isAdmin = roleManager.hasActiveRole(msg.sender, Roles.ADMIN);
        if (msg.sender != controller && !isAdmin) revert Unauthorized();

        _records[did] = Record({
            controller: controller,
            status: Status.Active,
            registeredAt: uint64(block.timestamp),
            revokedAt: 0
        });
        _didByController[controller] = did;
        emit DIDRegistered(did, controller, msg.sender);
    }

    /// @notice Rotate the controlling key for an active DID.
    /// @param did Identifier to rotate.
    /// @param newController Replacement controller. Must not already control another DID.
    function rotateKey(string calldata did, address newController) external {
        if (newController == address(0)) revert ZeroAddress();
        Record storage rec = _requireActive(did);
        if (msg.sender != rec.controller) revert Unauthorized();
        if (bytes(_didByController[newController]).length != 0) revert ControllerInUse();

        address previous = rec.controller;
        delete _didByController[previous];
        rec.controller = newController;
        _didByController[newController] = did;
        emit KeyRotated(did, previous, newController);
    }

    /// @notice Revoke a DID. Callable by the current controller or an active Admin.
    /// @param did Identifier to revoke.
    function revoke(string calldata did) external {
        Record storage rec = _requireActive(did);
        bool isAdmin = roleManager.hasActiveRole(msg.sender, Roles.ADMIN);
        if (msg.sender != rec.controller && !isAdmin) revert Unauthorized();

        rec.status = Status.Revoked;
        rec.revokedAt = uint64(block.timestamp);
        emit DIDRevoked(did, rec.controller, msg.sender);
    }

    /// @inheritdoc IDIDRegistry
    function controllerOf(string calldata did) external view returns (address) {
        return _records[did].controller;
    }

    /// @inheritdoc IDIDRegistry
    function statusOf(string calldata did) external view returns (Status) {
        return _records[did].status;
    }

    /// @inheritdoc IDIDRegistry
    function didOfController(address controller) external view returns (string memory) {
        return _didByController[controller];
    }

    /// @inheritdoc IDIDRegistry
    function isActiveController(address controller) external view returns (bool) {
        string storage did = _didByController[controller];
        if (bytes(did).length == 0) return false;
        return _records[did].status == Status.Active && _records[did].controller == controller;
    }

    /// @notice Full record lookup for indexers and UIs.
    function getRecord(string calldata did)
        external
        view
        returns (address controller, Status status, uint64 registeredAt, uint64 revokedAt)
    {
        Record storage rec = _records[did];
        return (rec.controller, rec.status, rec.registeredAt, rec.revokedAt);
    }

    function _requireActive(string calldata did) internal view returns (Record storage rec) {
        rec = _records[did];
        if (rec.status == Status.None) revert DIDNotFound();
        if (rec.status == Status.Revoked) revert DIDAlreadyRevoked();
    }

    /// @dev Accepts did:ethr:<digits>:<0x + 40 hex chars>. Case of hex digits is not restricted.
    function _validDid(string calldata did) internal pure returns (bool) {
        bytes memory b = bytes(did);
        bytes memory prefix = bytes("did:ethr:");
        if (b.length < prefix.length + 1 + 1 + 42) return false;
        for (uint256 i = 0; i < prefix.length; i++) {
            if (b[i] != prefix[i]) return false;
        }
        uint256 i2 = prefix.length;
        bool sawDigit = false;
        while (i2 < b.length && b[i2] >= 0x30 && b[i2] <= 0x39) {
            sawDigit = true;
            i2++;
        }
        if (!sawDigit || i2 >= b.length || b[i2] != ":") return false;
        i2++;
        if (i2 + 42 != b.length) return false;
        if (b[i2] != "0" || b[i2 + 1] != "x") return false;
        for (uint256 j = i2 + 2; j < b.length; j++) {
            bytes1 c = b[j];
            bool hexChar = (c >= "0" && c <= "9") || (c >= "a" && c <= "f") || (c >= "A" && c <= "F");
            if (!hexChar) return false;
        }
        return true;
    }
}

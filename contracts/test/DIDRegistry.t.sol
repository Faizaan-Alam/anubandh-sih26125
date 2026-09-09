// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./Base.t.sol";
import {DIDRegistry} from "../src/DIDRegistry.sol";
import {IDIDRegistry} from "../src/interfaces/IDIDRegistry.sol";

contract DIDRegistryTest is BaseTest {
    function test_registerSucceeds() public view {
        assertEq(didRegistry.controllerOf(_did(user)), user);
        assertEq(uint256(didRegistry.statusOf(_did(user))), uint256(IDIDRegistry.Status.Active));
        assertTrue(didRegistry.isActiveController(user));
    }

    function test_duplicateRegistrationReverts() public {
        vm.prank(user);
        vm.expectRevert(DIDRegistry.DIDAlreadyRegistered.selector);
        didRegistry.register(_did(user), user);
    }

    function test_selfRegisterNewDid() public {
        address newbie = vm.addr(0x1111);
        string memory did = _did(newbie);
        vm.prank(newbie);
        didRegistry.register(did, newbie);
        assertEq(didRegistry.controllerOf(did), newbie);
    }

    function test_unauthorizedRegisterForOtherReverts() public {
        address newbie = vm.addr(0x2222);
        vm.prank(stranger);
        vm.expectRevert(DIDRegistry.Unauthorized.selector);
        didRegistry.register(_did(newbie), newbie);
    }

    function test_invalidDidReverts() public {
        vm.prank(user);
        vm.expectRevert(DIDRegistry.InvalidDID.selector);
        didRegistry.register("not-a-did", user);
    }

    function test_keyRotationSucceeds() public {
        address newKey = vm.addr(0x3333);
        string memory did = _did(user);
        vm.prank(user);
        didRegistry.rotateKey(did, newKey);
        assertEq(didRegistry.controllerOf(did), newKey);
        assertTrue(didRegistry.isActiveController(newKey));
        assertFalse(didRegistry.isActiveController(user));
    }

    function test_unauthorizedRotationReverts() public {
        vm.prank(stranger);
        vm.expectRevert(DIDRegistry.Unauthorized.selector);
        didRegistry.rotateKey(_did(user), stranger);
    }

    function test_controllerRevokeSucceeds() public {
        vm.prank(user);
        didRegistry.revoke(_did(user));
        assertEq(uint256(didRegistry.statusOf(_did(user))), uint256(IDIDRegistry.Status.Revoked));
        assertFalse(didRegistry.isActiveController(user));
    }

    function test_adminRevokeSucceeds() public {
        vm.prank(admin);
        didRegistry.revoke(_did(user));
        assertEq(uint256(didRegistry.statusOf(_did(user))), uint256(IDIDRegistry.Status.Revoked));
    }

    function test_unauthorizedRevocationReverts() public {
        vm.prank(stranger);
        vm.expectRevert(DIDRegistry.Unauthorized.selector);
        didRegistry.revoke(_did(user));
    }

    function test_managerCannotRevokeOthersDid() public {
        vm.prank(manager);
        vm.expectRevert(DIDRegistry.Unauthorized.selector);
        didRegistry.revoke(_did(user));
    }

    function test_rotateAfterRevokeReverts() public {
        vm.prank(user);
        didRegistry.revoke(_did(user));
        vm.prank(user);
        vm.expectRevert(DIDRegistry.DIDAlreadyRevoked.selector);
        didRegistry.rotateKey(_did(user), vm.addr(0x4444));
    }
}

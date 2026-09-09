// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./Base.t.sol";
import {Roles} from "../src/Roles.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract RoleManagerTest is BaseTest {
    function test_adminHasAdminRole() public view {
        assertTrue(roleManager.hasActiveRole(admin, Roles.ADMIN));
        assertTrue(roleManager.hasRole(Roles.ADMIN, admin));
    }

    function test_grantByAdminSucceeds() public {
        address extra = vm.addr(0x5555);
        vm.prank(admin);
        roleManager.grantRole(Roles.USER, extra);
        assertTrue(roleManager.hasActiveRole(extra, Roles.USER));
    }

    function test_grantByNonAdminReverts() public {
        vm.prank(manager);
        vm.expectRevert();
        roleManager.grantRole(Roles.USER, stranger);
    }

    function test_revokeByAdminSucceeds() public {
        vm.prank(admin);
        roleManager.revokeRole(Roles.USER, user);
        assertFalse(roleManager.hasActiveRole(user, Roles.USER));
    }

    function test_revokeByNonAdminReverts() public {
        vm.prank(user);
        vm.expectRevert();
        roleManager.revokeRole(Roles.MANAGER, manager);
    }

    function test_expiredRoleFailsPermissionCheck() public {
        address temp = vm.addr(0x6666);
        vm.prank(admin);
        roleManager.grantRoleWithExpiry(Roles.MANAGER, temp, uint64(block.timestamp + 1 hours));
        assertTrue(roleManager.hasActiveRole(temp, Roles.MANAGER));

        vm.warp(block.timestamp + 1 hours + 1);
        assertFalse(roleManager.hasActiveRole(temp, Roles.MANAGER));
        assertFalse(roleManager.hasRole(Roles.MANAGER, temp));
    }

    function test_expiredRoleCannotMint() public {
        address temp = vm.addr(0x7777);
        vm.prank(admin);
        roleManager.grantRoleWithExpiry(Roles.ADMIN, temp, uint64(block.timestamp + 10));
        vm.warp(block.timestamp + 11);
        vm.prank(temp);
        vm.expectRevert();
        assetNFT.mint(temp, keccak256("x"), keccak256("m"), 0, DEFAULT_WINDOW, false, temp);
    }

    function test_auditorCannotGrantRoles() public {
        vm.prank(auditor);
        vm.expectRevert();
        roleManager.grantRole(Roles.USER, stranger);
    }

    function test_userCannotGrantRoles() public {
        vm.prank(user);
        vm.expectRevert();
        roleManager.grantRole(Roles.USER, stranger);
    }

    function test_directUnauthorizedCallReverts() public {
        // Bypasses UI and backend: stranger calls grantRole on the contract.
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, Roles.ADMIN)
        );
        roleManager.grantRole(Roles.MANAGER, stranger);
    }
}

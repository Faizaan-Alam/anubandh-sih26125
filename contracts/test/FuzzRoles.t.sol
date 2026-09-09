// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./Base.t.sol";
import {Roles} from "../src/Roles.sol";

contract FuzzRolesTest is BaseTest {
    function testFuzz_nonAdminCannotGrant(address attacker) public {
        vm.assume(attacker != admin);
        vm.assume(attacker != address(0));
        vm.assume(!roleManager.hasActiveRole(attacker, Roles.ADMIN));
        vm.prank(attacker);
        vm.expectRevert();
        roleManager.grantRole(Roles.USER, attacker);
    }

    function testFuzz_expiredGrantIsInactive(uint32 ttl) public {
        vm.assume(ttl > 1 && ttl < 365 days);
        address temp = address(0xBEEF);
        vm.prank(admin);
        roleManager.grantRoleWithExpiry(Roles.USER, temp, uint64(block.timestamp + ttl));
        assertTrue(roleManager.hasActiveRole(temp, Roles.USER));
        vm.warp(block.timestamp + uint256(ttl) + 1);
        assertFalse(roleManager.hasActiveRole(temp, Roles.USER));
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./Base.t.sol";
import {AssetNFT} from "../src/AssetNFT.sol";
import {DivergenceRegistry} from "../src/DivergenceRegistry.sol";

contract DivergenceRegistryTest is BaseTest {
    uint256 internal tokenId;

    function setUp() public override {
        super.setUp();
        tokenId = _mintNamed(user, keccak256("div-asset"), false);
    }

    function test_conflictingAttestationsCreateDivergenceAndQuarantine() public {
        _attest(userPk, user, tokenId, 1, user, keccak256("loc-a"), 1, keccak256("n1"));
        _attest(user2Pk, user2, tokenId, 1, user2, keccak256("loc-b"), 2, keccak256("n2"));

        assertTrue(assetNFT.isQuarantined(tokenId));
        uint256 openId = divergenceRegistry.openDivergenceOf(tokenId);
        assertGt(openId, 0);
        DivergenceRegistry.DivergenceRecord memory rec = divergenceRegistry.getDivergence(openId);
        assertEq(rec.tokenId, tokenId);
        assertFalse(rec.resolved);
    }

    function test_matchingAttestationsDoNotDiverge() public {
        _attest(userPk, user, tokenId, 1, user, keccak256("loc-a"), 1, keccak256("m1"));
        _attest(user2Pk, user2, tokenId, 1, user, keccak256("loc-a"), 1, keccak256("m2"));
        assertFalse(assetNFT.isQuarantined(tokenId));
        assertEq(divergenceRegistry.openDivergenceOf(tokenId), 0);
    }

    function test_quarantinedTransferReverts() public {
        _attest(userPk, user, tokenId, 1, user, keccak256("loc-a"), 1, keccak256("q1"));
        _attest(user2Pk, user2, tokenId, 1, user2, keccak256("loc-b"), 1, keccak256("q2"));
        assertTrue(assetNFT.isQuarantined(tokenId));

        vm.prank(manager);
        vm.expectRevert(abi.encodeWithSelector(AssetNFT.AssetQuarantinedError.selector, tokenId));
        assetNFT.transferOwnershipTo(tokenId, user2);

        vm.prank(manager);
        vm.expectRevert(abi.encodeWithSelector(AssetNFT.AssetQuarantinedError.selector, tokenId));
        assetNFT.allocate(tokenId, user2);
    }

    function test_lowValueReconciliationClearsQuarantineAndPreservesRecord() public {
        _attest(userPk, user, tokenId, 1, user, keccak256("loc-a"), 1, keccak256("r1"));
        _attest(user2Pk, user2, tokenId, 1, user2, keccak256("loc-b"), 1, keccak256("r2"));
        uint256 openId = divergenceRegistry.openDivergenceOf(tokenId);

        vm.prank(manager);
        divergenceRegistry.proposeReconciliation(openId, keccak256("evidence"), user, keccak256("loc-a"), 1);

        DivergenceRegistry.DivergenceRecord memory rec = divergenceRegistry.getDivergence(openId);
        assertTrue(rec.resolved);
        assertFalse(assetNFT.isQuarantined(tokenId));
        assertEq(assetNFT.custodianOf(tokenId), user);
        // Original divergence remains readable.
        assertEq(rec.attestationA, 1);
        assertEq(rec.attestationB, 2);

        vm.prank(manager);
        assetNFT.transferOwnershipTo(tokenId, user2);
        assertEq(assetNFT.ownerOf(tokenId), user2);
    }

    function test_highValueRequiresSeparationOfDuties() public {
        uint256 hv = _mintNamed(user, keccak256("hv-asset"), true);
        _attest(userPk, user, hv, 1, user, keccak256("loc-a"), 1, keccak256("h1"));
        _attest(user2Pk, user2, hv, 1, user2, keccak256("loc-b"), 1, keccak256("h2"));
        uint256 openId = divergenceRegistry.openDivergenceOf(hv);

        vm.prank(manager);
        divergenceRegistry.proposeReconciliation(openId, keccak256("ev"), user, keccak256("loc-a"), 1);
        assertTrue(assetNFT.isQuarantined(hv));

        vm.prank(manager);
        vm.expectRevert(DivergenceRegistry.Unauthorized.selector);
        divergenceRegistry.confirmReconciliation(openId);

        // Admin who is also the proposer cannot confirm if they proposed.
        vm.prank(admin);
        divergenceRegistry.confirmReconciliation(openId);
        assertFalse(assetNFT.isQuarantined(hv));

        DivergenceRegistry.DivergenceRecord memory rec = divergenceRegistry.getDivergence(openId);
        assertTrue(rec.resolved);
        assertEq(rec.proposer, manager);
        assertEq(rec.confirmer, admin);
    }

    function test_adminCannotConfirmOwnHighValueProposal() public {
        uint256 hv = _mintNamed(user, keccak256("hv-asset-2"), true);
        _attest(userPk, user, hv, 1, user, keccak256("loc-a"), 1, keccak256("h3"));
        _attest(user2Pk, user2, hv, 1, user2, keccak256("loc-b"), 1, keccak256("h4"));
        uint256 openId = divergenceRegistry.openDivergenceOf(hv);

        vm.prank(admin);
        divergenceRegistry.proposeReconciliation(openId, keccak256("ev"), user, keccak256("loc-a"), 1);

        vm.prank(admin);
        vm.expectRevert(DivergenceRegistry.SeparationOfDuties.selector);
        divergenceRegistry.confirmReconciliation(openId);
    }

    function test_noDeleteFunctionAndHistoryPersists() public {
        _attest(userPk, user, tokenId, 1, user, keccak256("loc-a"), 1, keccak256("p1"));
        _attest(user2Pk, user2, tokenId, 1, user2, keccak256("loc-b"), 1, keccak256("p2"));
        uint256 openId = divergenceRegistry.openDivergenceOf(tokenId);
        vm.prank(manager);
        divergenceRegistry.proposeReconciliation(openId, keccak256("ev"), user, keccak256("loc-a"), 1);

        DivergenceRegistry.DivergenceRecord memory rec = divergenceRegistry.getDivergence(openId);
        assertTrue(rec.resolved);
        uint256[] memory ids = divergenceRegistry.divergencesOf(tokenId);
        assertEq(ids.length, 1);
        assertEq(ids[0], openId);
    }

    function test_outsideFreshnessWindowDoesNotDiverge() public {
        _attest(userPk, user, tokenId, 1, user, keccak256("loc-a"), 1, keccak256("old"));
        vm.warp(block.timestamp + DEFAULT_WINDOW + 1);
        _attest(user2Pk, user2, tokenId, 1, user2, keccak256("loc-b"), 2, keccak256("new"));
        assertFalse(assetNFT.isQuarantined(tokenId));
    }

    function test_unauthorizedReconciliationReverts() public {
        _attest(userPk, user, tokenId, 1, user, keccak256("loc-a"), 1, keccak256("u1"));
        _attest(user2Pk, user2, tokenId, 1, user2, keccak256("loc-b"), 1, keccak256("u2"));
        uint256 openId = divergenceRegistry.openDivergenceOf(tokenId);
        vm.prank(user);
        vm.expectRevert(DivergenceRegistry.Unauthorized.selector);
        divergenceRegistry.proposeReconciliation(openId, keccak256("ev"), user, keccak256("loc-a"), 1);
    }
}

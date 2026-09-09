// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./Base.t.sol";
import {AttestationRegistry} from "../src/AttestationRegistry.sol";
import {IAttestationRegistry} from "../src/interfaces/IAttestationRegistry.sol";

contract AttestationRegistryTest is BaseTest {
    uint256 internal tokenId;

    function setUp() public override {
        super.setUp();
        tokenId = _mintNamed(user, keccak256("att-asset"), false);
    }

    function test_validSignedAttestationSucceeds() public {
        uint256 attId = _attest(
            userPk, user, tokenId, 1, user, keccak256("warehouse-a"), 1, keccak256("nonce-1")
        );
        IAttestationRegistry.Observation memory obs = attestationRegistry.getAttestation(attId);
        assertEq(obs.observer, user);
        assertEq(obs.tokenId, tokenId);
        assertEq(obs.evidenceTier, 1);
        assertEq(obs.custodian, user);
        assertEq(obs.condition, 1);
    }

    function test_identifierScanTierSucceeds() public {
        uint256 attId = _attest(
            userPk, user, tokenId, 0, user, keccak256("warehouse-a"), 1, keccak256("nonce-scan")
        );
        IAttestationRegistry.Observation memory obs = attestationRegistry.getAttestation(attId);
        assertEq(obs.evidenceTier, 0);
    }

    function test_reusedNonceReverts() public {
        bytes32 nonce = keccak256("reuse-me");
        _attest(userPk, user, tokenId, 1, user, keccak256("loc"), 1, nonce);
        uint256 validUntil = block.timestamp + 1 hours;
        bytes memory sig = _signAttestation(userPk, tokenId, 1, user, keccak256("loc"), 1, nonce, validUntil);
        vm.expectRevert(AttestationRegistry.NonceReused.selector);
        vm.prank(user);
        attestationRegistry.submitAttestation(
            user, tokenId, 1, user, keccak256("loc"), 1, nonce, validUntil, keccak256("obs"), sig
        );
    }

    function test_invalidSignatureReverts() public {
        uint256 validUntil = block.timestamp + 1 hours;
        bytes32 nonce = keccak256("bad-sig");
        // Sign with the wrong key.
        bytes memory sig = _signAttestation(strangerPk, tokenId, 1, user, keccak256("loc"), 1, nonce, validUntil);
        vm.prank(user);
        vm.expectRevert(AttestationRegistry.InvalidSignature.selector);
        attestationRegistry.submitAttestation(
            user, tokenId, 1, user, keccak256("loc"), 1, nonce, validUntil, keccak256("obs"), sig
        );
    }

    function test_tamperedPayloadReverts() public {
        uint256 validUntil = block.timestamp + 1 hours;
        bytes32 nonce = keccak256("tamper");
        bytes memory sig = _signAttestation(userPk, tokenId, 1, user, keccak256("loc"), 1, nonce, validUntil);
        vm.prank(user);
        vm.expectRevert(AttestationRegistry.InvalidSignature.selector);
        // Custodian in the call differs from what was signed.
        attestationRegistry.submitAttestation(
            user, tokenId, 1, user2, keccak256("loc"), 1, nonce, validUntil, keccak256("obs"), sig
        );
    }

    function test_unauthorizedObserverReverts() public {
        vm.prank(admin);
        didRegistry.register(_did(stranger), stranger);
        uint256 validUntil = block.timestamp + 1 hours;
        bytes32 nonce = keccak256("unauth");
        bytes memory sig = _signAttestation(strangerPk, tokenId, 1, user, keccak256("loc"), 1, nonce, validUntil);
        vm.prank(stranger);
        vm.expectRevert(AttestationRegistry.Unauthorized.selector);
        attestationRegistry.submitAttestation(
            stranger, tokenId, 1, user, keccak256("loc"), 1, nonce, validUntil, keccak256("obs"), sig
        );
    }

    function test_auditorCannotAttest() public {
        uint256 validUntil = block.timestamp + 1 hours;
        bytes32 nonce = keccak256("aud-att");
        bytes memory sig = _signAttestation(auditorPk, tokenId, 1, user, keccak256("loc"), 1, nonce, validUntil);
        vm.prank(auditor);
        vm.expectRevert(AttestationRegistry.Unauthorized.selector);
        attestationRegistry.submitAttestation(
            auditor, tokenId, 1, user, keccak256("loc"), 1, nonce, validUntil, keccak256("obs"), sig
        );
    }

    function test_expiredPayloadReverts() public {
        uint256 validUntil = block.timestamp + 10;
        bytes32 nonce = keccak256("expired");
        bytes memory sig = _signAttestation(userPk, tokenId, 1, user, keccak256("loc"), 1, nonce, validUntil);
        vm.warp(validUntil + 1);
        vm.prank(user);
        vm.expectRevert(AttestationRegistry.ExpiredPayload.selector);
        attestationRegistry.submitAttestation(
            user, tokenId, 1, user, keccak256("loc"), 1, nonce, validUntil, keccak256("obs"), sig
        );
    }

    function test_revokedDidCannotAttest() public {
        vm.prank(user);
        didRegistry.revoke(_did(user));
        uint256 validUntil = block.timestamp + 1 hours;
        bytes32 nonce = keccak256("revoked");
        bytes memory sig = _signAttestation(userPk, tokenId, 1, user, keccak256("loc"), 1, nonce, validUntil);
        vm.expectRevert(AttestationRegistry.ObserverRevoked.selector);
        vm.prank(user);
        attestationRegistry.submitAttestation(
            user, tokenId, 1, user, keccak256("loc"), 1, nonce, validUntil, keccak256("obs"), sig
        );
    }

    function test_invalidTierReverts() public {
        uint256 validUntil = block.timestamp + 1 hours;
        bytes32 nonce = keccak256("tier");
        bytes memory sig = _signAttestation(userPk, tokenId, 9, user, keccak256("loc"), 1, nonce, validUntil);
        vm.prank(user);
        vm.expectRevert(AttestationRegistry.InvalidTier.selector);
        attestationRegistry.submitAttestation(
            user, tokenId, 9, user, keccak256("loc"), 1, nonce, validUntil, keccak256("obs"), sig
        );
    }
}

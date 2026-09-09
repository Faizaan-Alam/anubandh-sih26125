// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {RoleManager} from "../src/RoleManager.sol";
import {DIDRegistry} from "../src/DIDRegistry.sol";
import {AssetNFT} from "../src/AssetNFT.sol";
import {AttestationRegistry} from "../src/AttestationRegistry.sol";
import {DivergenceRegistry} from "../src/DivergenceRegistry.sol";
import {Roles} from "../src/Roles.sol";

contract BaseTest is Test {
    RoleManager internal roleManager;
    DIDRegistry internal didRegistry;
    AssetNFT internal assetNFT;
    AttestationRegistry internal attestationRegistry;
    DivergenceRegistry internal divergenceRegistry;

    uint256 internal adminPk = 0xA11CE;
    uint256 internal managerPk = 0xB0B;
    uint256 internal auditorPk = 0xC0DE;
    uint256 internal userPk = 0xD00D;
    uint256 internal user2Pk = 0xE11E;
    uint256 internal strangerPk = 0xF00D;

    address internal admin;
    address internal manager;
    address internal auditor;
    address internal user;
    address internal user2;
    address internal stranger;

    uint64 internal constant DEFAULT_WINDOW = 7 days;

    function setUp() public virtual {
        admin = vm.addr(adminPk);
        manager = vm.addr(managerPk);
        auditor = vm.addr(auditorPk);
        user = vm.addr(userPk);
        user2 = vm.addr(user2Pk);
        stranger = vm.addr(strangerPk);

        vm.prank(admin);
        roleManager = new RoleManager(admin);

        vm.startPrank(admin);
        didRegistry = new DIDRegistry(address(roleManager));
        assetNFT = new AssetNFT(address(roleManager));
        attestationRegistry =
            new AttestationRegistry(address(roleManager), address(didRegistry), address(assetNFT));
        divergenceRegistry =
            new DivergenceRegistry(address(roleManager), address(assetNFT), address(attestationRegistry));
        assetNFT.setDivergenceRegistry(address(divergenceRegistry));
        assetNFT.setAttestationRegistry(address(attestationRegistry));
        attestationRegistry.setDivergenceRegistry(address(divergenceRegistry));

        roleManager.grantRole(Roles.MANAGER, manager);
        roleManager.grantRole(Roles.AUDITOR, auditor);
        roleManager.grantRole(Roles.USER, user);
        roleManager.grantRole(Roles.USER, user2);

        didRegistry.register(_did(admin), admin);
        didRegistry.register(_did(manager), manager);
        didRegistry.register(_did(auditor), auditor);
        didRegistry.register(_did(user), user);
        didRegistry.register(_did(user2), user2);
        vm.stopPrank();
    }

    function _did(address account) internal view returns (string memory) {
        return string.concat("did:ethr:", vm.toString(block.chainid), ":", vm.toString(account));
    }

    function _mintAsset(address to, bool highValue) internal returns (uint256 tokenId) {
        vm.prank(admin);
        tokenId = assetNFT.mint(to, keccak256(abi.encodePacked("asset", to, block.timestamp, tokenId)), keccak256("meta"), 0, DEFAULT_WINDOW, highValue, to);
    }

    function _mintNamed(address to, bytes32 id, bool highValue) internal returns (uint256 tokenId) {
        vm.prank(admin);
        tokenId = assetNFT.mint(to, id, keccak256("meta"), 0, DEFAULT_WINDOW, highValue, to);
    }

    function _signAttestation(
        uint256 pk,
        uint256 tokenId,
        uint8 evidenceTier,
        address custodian,
        bytes32 locationId,
        uint8 condition,
        bytes32 nonce,
        uint256 validUntil
    ) internal view returns (bytes memory sig) {
        bytes32 structHash = keccak256(
            abi.encode(
                attestationRegistry.ATTESTATION_TYPEHASH(),
                tokenId,
                evidenceTier,
                custodian,
                locationId,
                condition,
                nonce,
                validUntil
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", attestationRegistry.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        sig = abi.encodePacked(r, s, v);
    }

    function _attest(
        uint256 pk,
        address observer,
        uint256 tokenId,
        uint8 tier,
        address custodian,
        bytes32 locationId,
        uint8 condition,
        bytes32 nonce
    ) internal returns (uint256 attId) {
        uint256 validUntil = block.timestamp + 1 hours;
        bytes memory sig =
            _signAttestation(pk, tokenId, tier, custodian, locationId, condition, nonce, validUntil);
        vm.prank(observer);
        attId = attestationRegistry.submitAttestation(
            observer, tokenId, tier, custodian, locationId, condition, nonce, validUntil, keccak256("obs"), sig
        );
    }
}

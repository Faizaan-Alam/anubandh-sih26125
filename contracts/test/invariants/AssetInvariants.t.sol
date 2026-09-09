// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {RoleManager} from "../../src/RoleManager.sol";
import {DIDRegistry} from "../../src/DIDRegistry.sol";
import {AssetNFT} from "../../src/AssetNFT.sol";
import {AttestationRegistry} from "../../src/AttestationRegistry.sol";
import {DivergenceRegistry} from "../../src/DivergenceRegistry.sol";
import {Roles} from "../../src/Roles.sol";

/// @dev Handler used by Foundry invariant tests. Bound functions only touch authorized paths.
contract AssetHandler is Test {
    RoleManager public roleManager;
    AssetNFT public assetNFT;
    AttestationRegistry public attestationRegistry;
    DivergenceRegistry public divergenceRegistry;

    address public admin;
    uint256 public adminPk;
    address public manager;
    address public userA;
    uint256 public userAPk;
    address public userB;
    uint256 public userBPk;

    uint256 public ghostMinted;
    mapping(uint256 => address) public ownerWhenQuarantined;
    mapping(uint256 => bool) public sawQuarantine;

    bytes32 internal nonceSalt;

    constructor(
        RoleManager roleManager_,
        AssetNFT assetNFT_,
        AttestationRegistry attestationRegistry_,
        DivergenceRegistry divergenceRegistry_,
        address admin_,
        uint256 adminPk_,
        address manager_,
        address userA_,
        uint256 userAPk_,
        address userB_,
        uint256 userBPk_
    ) {
        roleManager = roleManager_;
        assetNFT = assetNFT_;
        attestationRegistry = attestationRegistry_;
        divergenceRegistry = divergenceRegistry_;
        admin = admin_;
        adminPk = adminPk_;
        manager = manager_;
        userA = userA_;
        userAPk = userAPk_;
        userB = userB_;
        userBPk = userBPk_;
    }

    function mint(uint8 classSeed, bool highValue) external {
        vm.prank(admin);
        bytes32 ident = keccak256(abi.encodePacked("inv", ghostMinted, classSeed, block.timestamp));
        address to = classSeed % 2 == 0 ? userA : userB;
        assetNFT.mint(to, ident, keccak256("meta"), classSeed % 3, 7 days, highValue, to);
        ghostMinted += 1;
    }

    function allocate(uint256 seed) external {
        uint256 minted = assetNFT.totalMinted();
        if (minted == 0) return;
        uint256 tokenId = (seed % minted) + 1;
        if (assetNFT.isQuarantined(tokenId)) return;
        address next = seed % 2 == 0 ? userA : userB;
        vm.prank(manager);
        try assetNFT.allocate(tokenId, next) {} catch {}
    }

    function transfer(uint256 seed) external {
        uint256 minted = assetNFT.totalMinted();
        if (minted == 0) return;
        uint256 tokenId = (seed % minted) + 1;
        if (assetNFT.isQuarantined(tokenId)) return;
        address next = seed % 2 == 0 ? userB : userA;
        vm.prank(manager);
        try assetNFT.transferOwnershipTo(tokenId, next) {} catch {}
    }

    function attestPair(uint256 seed, bool conflict) external {
        uint256 minted = assetNFT.totalMinted();
        if (minted == 0) return;
        uint256 tokenId = (seed % minted) + 1;
        nonceSalt = keccak256(abi.encodePacked(nonceSalt, seed, block.timestamp));
        bool wasQuarantined = assetNFT.isQuarantined(tokenId);
        _submit(userAPk, userA, tokenId, userA, keccak256("loc-a"), 1, nonceSalt);
        bytes32 loc = conflict ? keccak256("loc-b") : keccak256("loc-a");
        address cust = conflict ? userB : userA;
        _submit(userBPk, userB, tokenId, cust, loc, conflict ? uint8(2) : uint8(1), keccak256(abi.encodePacked(nonceSalt, "b")));
        if (assetNFT.isQuarantined(tokenId) && !wasQuarantined) {
            sawQuarantine[tokenId] = true;
            ownerWhenQuarantined[tokenId] = assetNFT.ownerOf(tokenId);
        }
    }

    function reconcile(uint256 seed) external {
        uint256 minted = assetNFT.totalMinted();
        if (minted == 0) return;
        uint256 tokenId = (seed % minted) + 1;
        uint256 openId = divergenceRegistry.openDivergenceOf(tokenId);
        if (openId == 0) return;
        vm.prank(manager);
        try divergenceRegistry.proposeReconciliation(openId, keccak256("ev"), userA, keccak256("loc-a"), 1) {} catch {}
        if (assetNFT.isHighValue(tokenId) && divergenceRegistry.openDivergenceOf(tokenId) != 0) {
            vm.prank(admin);
            try divergenceRegistry.confirmReconciliation(openId) {} catch {}
        }
    }

    function _submit(
        uint256 pk,
        address observer,
        uint256 tokenId,
        address custodian,
        bytes32 locationId,
        uint8 condition,
        bytes32 nonce
    ) internal {
        uint256 validUntil = block.timestamp + 1 hours;
        bytes32 structHash = keccak256(
            abi.encode(
                attestationRegistry.ATTESTATION_TYPEHASH(),
                tokenId,
                uint8(1),
                custodian,
                locationId,
                condition,
                nonce,
                validUntil
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", attestationRegistry.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);
        vm.prank(observer);
        try attestationRegistry.submitAttestation(
            observer, tokenId, 1, custodian, locationId, condition, nonce, validUntil, keccak256("obs"), sig
        ) {} catch {}
    }
}

contract AssetInvariants is Test {
    AssetHandler internal handler;
    AssetNFT internal assetNFT;
    RoleManager internal roleManager;

    function setUp() public {
        uint256 adminPk = 0xA11CE;
        uint256 managerPk = 0xB0B;
        uint256 userAPk = 0xD00D;
        uint256 userBPk = 0xE11E;
        address admin = vm.addr(adminPk);
        address manager = vm.addr(managerPk);
        address userA = vm.addr(userAPk);
        address userB = vm.addr(userBPk);

        vm.startPrank(admin);
        roleManager = new RoleManager(admin);
        DIDRegistry didRegistry = new DIDRegistry(address(roleManager));
        assetNFT = new AssetNFT(address(roleManager));
        AttestationRegistry attestationRegistry =
            new AttestationRegistry(address(roleManager), address(didRegistry), address(assetNFT));
        DivergenceRegistry divergenceRegistry =
            new DivergenceRegistry(address(roleManager), address(assetNFT), address(attestationRegistry));
        assetNFT.setDivergenceRegistry(address(divergenceRegistry));
        assetNFT.setAttestationRegistry(address(attestationRegistry));
        attestationRegistry.setDivergenceRegistry(address(divergenceRegistry));
        roleManager.grantRole(Roles.MANAGER, manager);
        roleManager.grantRole(Roles.USER, userA);
        roleManager.grantRole(Roles.USER, userB);
        didRegistry.register(_did(admin), admin);
        didRegistry.register(_did(manager), manager);
        didRegistry.register(_did(userA), userA);
        didRegistry.register(_did(userB), userB);
        vm.stopPrank();

        handler = new AssetHandler(
            roleManager,
            assetNFT,
            attestationRegistry,
            divergenceRegistry,
            admin,
            adminPk,
            manager,
            userA,
            userAPk,
            userB,
            userBPk
        );

        targetContract(address(handler));
        bytes4[] memory selectors = new bytes4[](5);
        selectors[0] = AssetHandler.mint.selector;
        selectors[1] = AssetHandler.allocate.selector;
        selectors[2] = AssetHandler.transfer.selector;
        selectors[3] = AssetHandler.attestPair.selector;
        selectors[4] = AssetHandler.reconcile.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    /// @notice Supply grows only through AssetHandler.mint, which is the authorized Admin mint path.
    function invariant_supplyOnlyGrowsViaMint() public view {
        assertEq(assetNFT.totalMinted(), handler.ghostMinted());
    }

    /// @notice While quarantine is true the ERC-721 owner must not have changed.
    function invariant_quarantinedNeverTransferred() public view {
        uint256 minted = assetNFT.totalMinted();
        for (uint256 i = 1; i <= minted; i++) {
            if (assetNFT.isQuarantined(i) && handler.sawQuarantine(i)) {
                assertEq(assetNFT.ownerOf(i), handler.ownerWhenQuarantined(i));
            }
        }
    }

    function _did(address account) internal view returns (string memory) {
        return string.concat("did:ethr:", vm.toString(block.chainid), ":", vm.toString(account));
    }
}

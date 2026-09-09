// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./Base.t.sol";
import {AssetNFT} from "../src/AssetNFT.sol";

contract AssetNFTTest is BaseTest {
    function test_mintByAdminSucceeds() public {
        uint256 id = _mintNamed(user, keccak256("serial-1"), false);
        assertEq(assetNFT.ownerOf(id), user);
        assertEq(assetNFT.custodianOf(id), user);
        assertEq(assetNFT.totalMinted(), 1);
        assertFalse(assetNFT.isQuarantined(id));
    }

    function test_mintByNonAdminReverts() public {
        vm.prank(manager);
        vm.expectRevert(AssetNFT.Unauthorized.selector);
        assetNFT.mint(user, keccak256("s"), keccak256("m"), 0, DEFAULT_WINDOW, false, user);

        vm.prank(user);
        vm.expectRevert(AssetNFT.Unauthorized.selector);
        assetNFT.mint(user, keccak256("s2"), keccak256("m"), 0, DEFAULT_WINDOW, false, user);

        vm.prank(stranger);
        vm.expectRevert(AssetNFT.Unauthorized.selector);
        assetNFT.mint(stranger, keccak256("s3"), keccak256("m"), 0, DEFAULT_WINDOW, false, stranger);
    }

    function test_duplicateIdentifierReverts() public {
        _mintNamed(user, keccak256("dup"), false);
        vm.prank(admin);
        vm.expectRevert(AssetNFT.IdentifierTaken.selector);
        assetNFT.mint(user, keccak256("dup"), keccak256("m"), 0, DEFAULT_WINDOW, false, user);
    }

    function test_allocateByManagerSucceeds() public {
        uint256 id = _mintNamed(user, keccak256("alloc"), false);
        vm.prank(manager);
        assetNFT.allocate(id, user2);
        assertEq(assetNFT.custodianOf(id), user2);
        assertEq(assetNFT.ownerOf(id), user);
    }

    function test_allocateByUserReverts() public {
        uint256 id = _mintNamed(user, keccak256("alloc2"), false);
        vm.prank(user);
        vm.expectRevert(AssetNFT.Unauthorized.selector);
        assetNFT.allocate(id, user2);
    }

    function test_transferByManagerSucceeds() public {
        uint256 id = _mintNamed(user, keccak256("xfer"), false);
        vm.prank(manager);
        assetNFT.transferOwnershipTo(id, user2);
        assertEq(assetNFT.ownerOf(id), user2);
    }

    function test_transferByOwnerUserReverts() public {
        uint256 id = _mintNamed(user, keccak256("xfer2"), false);
        vm.prank(user);
        vm.expectRevert(AssetNFT.Unauthorized.selector);
        assetNFT.transferFrom(user, user2, id);
    }

    function test_approvalsDisabled() public {
        uint256 id = _mintNamed(user, keccak256("appr"), false);
        vm.prank(user);
        vm.expectRevert(AssetNFT.ApprovalsDisabled.selector);
        assetNFT.approve(user2, id);
    }

    function test_auditorCannotMintOrTransfer() public {
        vm.prank(auditor);
        vm.expectRevert(AssetNFT.Unauthorized.selector);
        assetNFT.mint(auditor, keccak256("aud"), keccak256("m"), 0, DEFAULT_WINDOW, false, auditor);
    }

    function test_strangerDirectMintReverts() public {
        vm.prank(stranger);
        vm.expectRevert(AssetNFT.Unauthorized.selector);
        assetNFT.mint(stranger, keccak256("str"), keccak256("m"), 0, DEFAULT_WINDOW, false, stranger);
    }
}

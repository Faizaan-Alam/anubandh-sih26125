// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RoleManager} from "../src/RoleManager.sol";
import {DIDRegistry} from "../src/DIDRegistry.sol";
import {AssetNFT} from "../src/AssetNFT.sol";
import {AttestationRegistry} from "../src/AttestationRegistry.sol";
import {DivergenceRegistry} from "../src/DivergenceRegistry.sol";
import {Roles} from "../src/Roles.sol";

/// @title Deploy
/// @notice Deploys the ANUBANDH contract set and writes addresses for app consumers.
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address admin = vm.addr(pk);

        address manager = vm.envOr("DEMO_MANAGER_ADDRESS", address(0));
        address auditor = vm.envOr("DEMO_AUDITOR_ADDRESS", address(0));
        address user_ = vm.envOr("DEMO_USER_ADDRESS", address(0));

        vm.startBroadcast(pk);

        RoleManager roleManager = new RoleManager(admin);
        DIDRegistry didRegistry = new DIDRegistry(address(roleManager));
        AssetNFT assetNFT = new AssetNFT(address(roleManager));
        AttestationRegistry attestationRegistry =
            new AttestationRegistry(address(roleManager), address(didRegistry), address(assetNFT));
        DivergenceRegistry divergenceRegistry =
            new DivergenceRegistry(address(roleManager), address(assetNFT), address(attestationRegistry));

        assetNFT.setDivergenceRegistry(address(divergenceRegistry));
        assetNFT.setAttestationRegistry(address(attestationRegistry));
        attestationRegistry.setDivergenceRegistry(address(divergenceRegistry));

        if (manager != address(0)) {
            roleManager.grantRole(Roles.MANAGER, manager);
        }
        if (auditor != address(0)) {
            roleManager.grantRole(Roles.AUDITOR, auditor);
        }
        if (user_ != address(0)) {
            roleManager.grantRole(Roles.USER, user_);
        }

        vm.stopBroadcast();

        string memory network = vm.envOr("ANUBANDH_NETWORK", string("anvil"));
        string memory obj = "deploy";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeString(obj, "network", network);
        vm.serializeAddress(obj, "RoleManager", address(roleManager));
        vm.serializeAddress(obj, "DIDRegistry", address(didRegistry));
        vm.serializeAddress(obj, "AssetNFT", address(assetNFT));
        vm.serializeAddress(obj, "AttestationRegistry", address(attestationRegistry));
        string memory finalJson =
            vm.serializeAddress(obj, "DivergenceRegistry", address(divergenceRegistry));

        string memory path = string.concat("../packages/shared/deployments/", network, ".json");
        vm.writeJson(finalJson, path);

        console2.log("RoleManager", address(roleManager));
        console2.log("DIDRegistry", address(didRegistry));
        console2.log("AssetNFT", address(assetNFT));
        console2.log("AttestationRegistry", address(attestationRegistry));
        console2.log("DivergenceRegistry", address(divergenceRegistry));
        console2.log("wrote", path);
    }
}

-- CreateTable
CREATE TABLE "ChainEvent" (
    "id" TEXT NOT NULL,
    "contractName" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChainEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChainEvent_txHash_logIndex_key" ON "ChainEvent"("txHash", "logIndex");
CREATE INDEX "ChainEvent_eventName_timestamp_idx" ON "ChainEvent"("eventName", "timestamp");
CREATE INDEX "ChainEvent_timestamp_idx" ON "ChainEvent"("timestamp");
CREATE INDEX "ChainEvent_contractName_eventName_idx" ON "ChainEvent"("contractName", "eventName");

CREATE TABLE "DidRecord" (
    "did" TEXT NOT NULL,
    "controller" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DidRecord_pkey" PRIMARY KEY ("did")
);
CREATE INDEX "DidRecord_controller_idx" ON "DidRecord"("controller");

CREATE TABLE "RoleGrant" (
    "id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "RoleGrant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RoleGrant_account_role_idx" ON "RoleGrant"("account", "role");
CREATE INDEX "RoleGrant_grantedAt_idx" ON "RoleGrant"("grantedAt");

CREATE TABLE "Asset" (
    "tokenId" TEXT NOT NULL,
    "assetIdentifier" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "custodian" TEXT NOT NULL,
    "metadataHash" TEXT NOT NULL,
    "freshnessTimestamp" TIMESTAMP(3),
    "freshnessWindow" INTEGER NOT NULL,
    "assetClass" INTEGER NOT NULL,
    "quarantined" BOOLEAN NOT NULL DEFAULT false,
    "highValue" BOOLEAN NOT NULL DEFAULT false,
    "mintedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Asset_pkey" PRIMARY KEY ("tokenId")
);
CREATE UNIQUE INDEX "Asset_assetIdentifier_key" ON "Asset"("assetIdentifier");
CREATE INDEX "Asset_owner_idx" ON "Asset"("owner");
CREATE INDEX "Asset_custodian_idx" ON "Asset"("custodian");
CREATE INDEX "Asset_quarantined_idx" ON "Asset"("quarantined");

CREATE TABLE "Attestation" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "observer" TEXT NOT NULL,
    "evidenceTier" INTEGER NOT NULL,
    "custodian" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "condition" INTEGER NOT NULL,
    "nonce" TEXT NOT NULL,
    "observationHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Attestation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Attestation_nonce_key" ON "Attestation"("nonce");
CREATE INDEX "Attestation_tokenId_timestamp_idx" ON "Attestation"("tokenId", "timestamp");

CREATE TABLE "Divergence" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "attestationA" TEXT NOT NULL,
    "attestationB" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "proposer" TEXT,
    "confirmer" TEXT,
    "evidenceHash" TEXT,
    "acceptedCustodian" TEXT,
    "acceptedLocation" TEXT,
    "acceptedCondition" INTEGER,
    CONSTRAINT "Divergence_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Divergence_tokenId_idx" ON "Divergence"("tokenId");
CREATE INDEX "Divergence_resolved_idx" ON "Divergence"("resolved");

CREATE TABLE "LoginNonce" (
    "nonce" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginNonce_pkey" PRIMARY KEY ("nonce")
);
CREATE INDEX "LoginNonce_address_used_idx" ON "LoginNonce"("address", "used");

CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "subjectDid" TEXT NOT NULL,
    "issuerDid" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "document" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Credential_subjectDid_idx" ON "Credential"("subjectDid");

CREATE TABLE "OfflineDecision" (
    "id" TEXT NOT NULL,
    "actorDid" TEXT NOT NULL,
    "actorAddress" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "riskTier" TEXT NOT NULL,
    "snapshotAgeSeconds" INTEGER NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "nonce" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconcileAccepted" BOOLEAN,
    "reconcileReason" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfflineDecision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OfflineDecision_nonce_key" ON "OfflineDecision"("nonce");
CREATE INDEX "OfflineDecision_actorDid_idx" ON "OfflineDecision"("actorDid");

CREATE TABLE "IndexerCursor" (
    "id" TEXT NOT NULL,
    "lastBlock" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IndexerCursor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoredDocument" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoredDocument_pkey" PRIMARY KEY ("id")
);

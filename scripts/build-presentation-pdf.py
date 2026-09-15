#!/usr/bin/env python3
"""Build the SIH presentation briefing PDF for ANUBANDH."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).resolve().parents[1] / "learn-these" / "ANUBANDH_Presentation_Briefing.pdf"

NAVY = colors.HexColor("#1b3a2f")
FOREST = colors.HexColor("#2f5d50")
GOLD = colors.HexColor("#c4a35a")
INK = colors.HexColor("#1a1a1a")
MUTED = colors.HexColor("#4a5560")
PAPER = colors.HexColor("#f4f1ea")
LINE = colors.HexColor("#d5d0c4")
WHITE = colors.white


def styles():
    base = getSampleStyleSheet()
    s = {
        "cover_kicker": ParagraphStyle(
            "cover_kicker",
            parent=base["Normal"],
            fontName="Times-Bold",
            fontSize=10,
            textColor=FOREST,
            alignment=TA_CENTER,
            tracking=1,
        ),
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Title"],
            fontName="Times-Bold",
            fontSize=28,
            textColor=WHITE,
            alignment=TA_CENTER,
            leading=34,
            spaceAfter=8,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub",
            parent=base["Normal"],
            fontName="Times-Italic",
            fontSize=12,
            textColor=colors.HexColor("#dce8e2"),
            alignment=TA_CENTER,
            leading=16,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="Times-Bold",
            fontSize=16,
            textColor=NAVY,
            spaceBefore=4,
            spaceAfter=8,
            leading=20,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Times-Bold",
            fontSize=12.5,
            textColor=FOREST,
            spaceBefore=10,
            spaceAfter=6,
            leading=16,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Times-Roman",
            fontSize=10.5,
            textColor=INK,
            leading=15,
            alignment=TA_JUSTIFY,
            spaceAfter=7,
        ),
        "say": ParagraphStyle(
            "say",
            parent=base["Normal"],
            fontName="Times-Italic",
            fontSize=10.5,
            textColor=FOREST,
            leading=15,
            leftIndent=8,
            rightIndent=8,
            spaceBefore=4,
            spaceAfter=8,
            borderPadding=6,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=base["Normal"],
            fontName="Times-Roman",
            fontSize=10.5,
            textColor=INK,
            leading=14.5,
            leftIndent=4,
        ),
        "cell": ParagraphStyle(
            "cell",
            parent=base["Normal"],
            fontName="Times-Roman",
            fontSize=9,
            textColor=INK,
            leading=12,
        ),
        "cell_h": ParagraphStyle(
            "cell_h",
            parent=base["Normal"],
            fontName="Times-Bold",
            fontSize=9,
            textColor=WHITE,
            leading=12,
        ),
        "footer": ParagraphStyle(
            "footer",
            parent=base["Normal"],
            fontName="Times-Roman",
            fontSize=8,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "caption": ParagraphStyle(
            "caption",
            parent=base["Normal"],
            fontName="Times-Italic",
            fontSize=9,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=10,
        ),
    }
    return s


def bullets(items, st):
    return ListFlowable(
        [ListItem(Paragraph(x, st["bullet"]), leftIndent=12, bulletColor=FOREST) for x in items],
        bulletType="bullet",
        leftIndent=16,
        bulletFontName="Times-Bold",
        bulletFontSize=10,
        spaceAfter=8,
    )


def table(headers, rows, col_widths, st):
    data = [[Paragraph(h, st["cell_h"]) for h in headers]]
    for row in rows:
        data.append([Paragraph(c, st["cell"]) for c in row])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("BACKGROUND", (0, 1), (-1, -1), WHITE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PAPER]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("GRID", (0, 0), (-1, -1), 0.4, LINE),
            ]
        )
    )
    return t


def header_footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(NAVY)
    canvas.rect(0, h - 12 * mm, w, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Times-Bold", 8)
    canvas.drawString(18 * mm, h - 7.5 * mm, "ANUBANDH  |  SIH26125  |  Presentation briefing")
    canvas.setFont("Times-Roman", 8)
    canvas.drawRightString(w - 18 * mm, h - 7.5 * mm, "Faizaan Alam")
    canvas.setFillColor(FOREST)
    canvas.rect(0, 0, w, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Times-Roman", 8)
    canvas.drawString(18 * mm, 5 * mm, "Not a password login. Challenge-response. Contracts are the security boundary.")
    canvas.drawRightString(w - 18 * mm, 5 * mm, f"Page {doc.page}")
    canvas.restoreState()


def cover_page(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    canvas.setFillColor(FOREST)
    canvas.rect(0, 0, 18 * mm, h, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.rect(18 * mm, h - 28 * mm, w - 18 * mm, 3, fill=1, stroke=0)
    canvas.restoreState()
    header_footer(canvas, doc)


def build():
    st = styles()
    story = []
    usable = 210 * mm - 36 * mm

    # COVER content (drawn over navy via first page template - actually platypus first page
    # will still have white body. Better make cover with flowables on navy using a special first page.
    # I'll use a simple first-page flow with a table banner instead of full-bleed navy for reliability.

    story.append(Paragraph("SMART INDIA HACKATHON  |  PROBLEM SIH26125", st["cover_kicker"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("ANUBANDH", st["h1"]))
    story.append(
        Paragraph(
            "A Decentralized Blockchain Platform for Identity, Access Control and Digital Asset Management",
            st["body"],
        )
    )
    story.append(
        Paragraph(
            "Organization: Bharat Electronics Limited (BEL) &nbsp;&nbsp; Domain: Software / Blockchain and Cybersecurity<br/>"
            "Developer: Faizaan Alam, B.Tech CSE (AI and ML)<br/>"
            "Live UI: https://anubandh-web.vercel.app/ &nbsp;&nbsp; Local demo: http://localhost:3000",
            st["caption"],
        )
    )
    story.append(
        Paragraph(
            "<b>How to use this PDF tomorrow.</b> It is a speaking script, not slides. "
            "Read the italic lines out loud. The rest is backup if a judge asks a follow-up. "
            "Aim for 8 to 12 minutes of talk, then a live demo.",
            st["body"],
        )
    )

    story.append(Paragraph("0. How to open (30 seconds)", st["h1"]))
    story.append(
        Paragraph(
            "<i>Say:</i> \"Good morning. I am Faizaan Alam. Our problem is SIH26125 from Bharat Electronics Limited. "
            "ANUBANDH is a software-first blockchain platform for identity, roles, digital assets, and an audit trail "
            "that cannot be silently rewritten.\"",
            st["say"],
        )
    )
    story.append(
        bullets(
            [
                "Do not start with the tech stack. Start with the pain.",
                "Do not claim QR codes are unclonable. We never do that.",
                "Do not claim Anvil is Hyperledger Besu. Local demo is Anvil. Production target is Besu.",
                "If the live Vercel site is open, say it is the UI only. Login needs the local stack.",
                "For the live demo, use http://localhost:3000. There is no password. Pick Admin and click Sign challenge.",
            ],
            st,
        )
    )

    story.append(Paragraph("1. The problem being solved", st["h1"]))
    story.append(
        Paragraph(
            "<i>Say:</i> \"BEL and similar organizations track people and high-value equipment in centralized databases. "
            "If that database is tampered with, history can be rewritten and nobody can prove who changed a role, "
            "who held an asset, or when a record was altered. Identity, access control, and asset custody live in "
            "separate systems that do not share a single, tamper-evident trail.\"",
            st["say"],
        )
    )
    story.append(Paragraph("What actually goes wrong today", st["h2"]))
    story.append(
        bullets(
            [
                "<b>Single point of failure.</b> One admin database is the source of truth. Compromise it, rewrite history.",
                "<b>Identity is an account, not a key.</b> Passwords and tickets can be shared. You cannot prove which key acted.",
                "<b>Roles live in the application.</b> Hiding a button is not security. A direct API call can still succeed.",
                "<b>Assets are rows, not unique tokens.</b> Custody and ownership can drift with no cryptographic object.",
                "<b>Observations are not signed.</b> Two depots can disagree and the system has no freeze, no evidence tier, no freshness.",
                "<b>Audits see the latest row.</b> They cannot reconstruct \"what was true at 14:03 last Tuesday\" from an immutable log.",
            ],
            st,
        )
    )
    story.append(
        Paragraph(
            "SIH26125 therefore asks for a <b>permissioned blockchain platform</b> that unifies decentralized identity, "
            "NFT-based asset management, smart-contract RBAC, and a tamper-evident audit trail. "
            "Hardware (ESP32, PUFs) is explicitly out of scope for this software-first version.",
            st["body"],
        )
    )

    story.append(Paragraph("2. What we built (one sentence)", st["h1"]))
    story.append(
        Paragraph(
            "<i>Say:</i> \"ANUBANDH puts identity, roles, and assets on a permissioned EVM chain. "
            "The browser is only a window. Every privileged write goes through a Policy Enforcement Point "
            "that re-reads the on-chain role, then a smart contract that will revert an unauthorized caller. "
            "Observations can go stale or conflict. When they conflict, the asset is quarantined until a recorded reconciliation.\"",
            st["say"],
        )
    )

    story.append(Paragraph("3. How the problem is solved", st["h1"]))
    story.append(Paragraph("3.1 Identity", st["h2"]))
    story.append(
        Paragraph(
            "Each person gets a DID of the form <b>did:ethr:chainId:address</b>. The address is the controller key. "
            "Login is not a password. The backend issues a one-time nonce. The user's key signs DID + address + nonce. "
            "The backend recovers the signer, checks DIDRegistry that this key still controls an active DID, "
            "and reads the role live from RoleManager. The session token does not store a trusted role.",
            st["body"],
        )
    )
    story.append(Paragraph("3.2 Access control", st["h2"]))
    story.append(
        Paragraph(
            "Four roles: Admin, Manager, Auditor, User. Grants can expire. "
            "The UI may hide a Mint button. That is convenience. "
            "<b>RoleManager and AssetNFT still revert</b> if a User calls mint directly. We have a Foundry test that does exactly that.",
            st["body"],
        )
    )
    story.append(
        table(
            ["Role", "Can do", "Cannot do"],
            [
                ["Admin", "Mint, grant/revoke roles, revoke DIDs, confirm high-value unfreeze", "Nothing privileged is hidden from the chain log"],
                ["Manager", "Allocate custody, transfer, propose reconciliation, attest", "Mint, grant roles, confirm their own high-value proposal"],
                ["Auditor", "Read history and reconstruct a point in time", "Change assets or roles"],
                ["User", "Submit signed observations", "Mint or transfer"],
            ],
            [22 * mm, 85 * mm, 68 * mm],
            st,
        )
    )
    story.append(Spacer(1, 8))
    story.append(Paragraph("3.3 Assets", st["h2"]))
    story.append(
        Paragraph(
            "Each managed item is an ERC-721 NFT with owner (title), custodian (possession), a metadata hash "
            "(the document stays off-chain), freshness, and a quarantine flag. Marketplace-style approvals are disabled. "
            "This is a permissioned registry, not an open NFT shop.",
            st["body"],
        )
    )
    story.append(Paragraph("3.4 Trust: observations, freshness, conflict", st["h2"]))
    story.append(
        Paragraph(
            "People sign observations (attestations). Two evidence tiers: "
            "<b>SignedInspection</b> (weight 1.0, a role-bound signed statement) and "
            "<b>IdentifierScan</b> (weight 0.4, QR/NFC-style, weaker, not unclonable). "
            "Confidence = evidence weight x freshness decay x divergence penalty, shown as 0 to 100 with a breakdown. "
            "If two recent observations disagree on custodian, location, or condition, the chain writes an immutable "
            "divergence record and quarantines the asset. Transfers revert until reconciliation. History is never deleted. "
            "High-value assets need a Manager proposal and a <b>different</b> Admin to confirm (separation of duties).",
            st["body"],
        )
    )
    story.append(
        Paragraph(
            "<i>Say if asked \"so the NFT means the radio is in the depot?\":</i> "
            "\"No. Cryptographic proof, human attestation, and physical-world truth are three different claims. "
            "The chain proves who signed what, when. Confidence models freshness and disagreement. It is not GPS.\"",
            st["say"],
        )
    )
    story.append(Paragraph("3.5 Audit", st["h2"]))
    story.append(
        Paragraph(
            "Every important action emits an on-chain event. An indexer copies events into PostgreSQL. "
            "The audit page reconstructs state at time T by replaying events with timestamp less than or equal to T, "
            "not by reading only the latest row. The chain remains authoritative if the database disagrees.",
            st["body"],
        )
    )
    story.append(
        KeepTogether(
            [
                Paragraph("3.6 Offline", st["h2"]),
                Paragraph(
                    "The verifier PWA caches identity, credentials, and policy. Offline, low-risk scans can proceed against a "
                    "cache up to 7 days old. High-risk actions (transfer, role change) are denied if the snapshot is older than "
                    "15 minutes. Decisions are signed locally and reconciled when the network returns.",
                    st["body"],
                ),
            ]
        )
    )

    story.append(Paragraph("4. Architecture you can draw on the board", st["h1"]))
    story.append(
        Paragraph(
            "<i>Say while drawing left to right:</i> \"Browser, then Policy Enforcement Point, then smart contracts, "
            "then the chain, then the indexer, then Postgres, then the audit screen.\"",
            st["say"],
        )
    )
    story.append(
        Paragraph(
            "<b>Portal / PWA</b> &rarr; <b>Express PEP</b> &rarr; <b>Solidity contracts on Anvil</b> "
            "&rarr; <b>Indexer</b> &rarr; <b>PostgreSQL</b> &rarr; <b>Audit UI</b>",
            st["caption"],
        )
    )
    story.append(
        bullets(
            [
                "<b>Chain is truth.</b> Postgres is a search index.",
                "<b>UI is not security.</b> Contracts revert unauthorized callers.",
                "<b>JWT has no role claim.</b> Every privileged API re-reads RoleManager.",
                "Local chain is Anvil. Production mapping is Hyperledger Besu (same bytecode, permissioned network).",
            ],
            st,
        )
    )
    story.append(
        table(
            ["Contract", "Job"],
            [
                ["DIDRegistry", "Register DID, rotate key, revoke"],
                ["RoleManager", "Admin / Manager / Auditor / User, with expiry"],
                ["AssetNFT", "Permissioned ERC-721, quarantine blocks movement"],
                ["AttestationRegistry", "EIP-712 signed observations, nonce replay protection"],
                ["DivergenceRegistry", "Conflict, freeze, reconcile. No delete."],
            ],
            [45 * mm, 130 * mm],
            st,
        )
    )

    story.append(Paragraph("5. Live demo script (the five acts)", st["h1"]))
    story.append(
        Paragraph(
            "Use <b>http://localhost:3000</b>. Pick the role from the dropdown. There is no password. "
            "The public site https://anubandh-web.vercel.app/ shows the UI (Forest theme) but cannot reach your laptop API.",
            st["body"],
        )
    )
    story.append(Paragraph("Act 1. Identity and RBAC (2 minutes)", st["h2"]))
    story.append(
        bullets(
            [
                "Login as Admin. Point at \"RoleManager.hasActiveRole (fresh on-chain check)\".",
                "Assets: mint a token or open seed token #1. Show the transaction is real.",
                "Sign out. Login as User. Click Mint. Show the 403: on-chain role is User.",
                "<i>Say:</i> \"If someone bypasses this UI and calls the contract, Foundry tests show it still reverts.\"",
            ],
            st,
        )
    )
    story.append(Paragraph("Act 2. Asset lifecycle (1 minute)", st["h2"]))
    story.append(
        bullets(
            [
                "Open token #1. Owner versus custodian. Metadata hash only on-chain.",
                "As Manager, allocate custody. Show the new custodian and later the audit event.",
            ],
            st,
        )
    )
    story.append(Paragraph("Act 3. Divergence and quarantine (3 minutes)", st["h2"]))
    story.append(
        bullets(
            [
                "As User, Attestations: SignedInspection, BEL-depot-A, Good.",
                "As User 2: different location or Damaged.",
                "Divergence page: open record. Asset is Quarantined. Confidence collapses.",
                "As Manager, try Transfer. It fails.",
                "Propose reconciliation. History remains. <i>Say:</i> \"We freeze on disagreement. We never delete the conflict.\"",
            ],
            st,
        )
    )
    story.append(Paragraph("Act 4. Offline PWA (2 minutes, if time)", st["h2"]))
    story.append(
        bullets(
            [
                "http://localhost:3001. Login and cache snapshot. Go offline.",
                "Low-risk identifier scan: allowed. Age snapshot. High-risk transfer: denied.",
                "Reconnect and reconcile.",
            ],
            st,
        )
    )
    story.append(Paragraph("Act 5. Audit reconstruction (1 minute)", st["h2"]))
    story.append(
        bullets(
            [
                "As Auditor, Audit Trail, token 1, Reconstruct at now versus an earlier time.",
                "<i>Say:</i> \"This is replayed from indexed chain events, not the latest derived row.\"",
            ],
            st,
        )
    )

    story.append(Paragraph("6. Tech stack (only if asked, or 30 seconds)", st["h1"]))
    story.append(
        table(
            ["Layer", "Choice"],
            [
                ["Local chain", "Anvil (Foundry). Target production: Hyperledger Besu"],
                ["Contracts", "Solidity 0.8.24, OpenZeppelin 5, Foundry tests"],
                ["PEP", "Node.js, TypeScript, Express"],
                ["Database", "PostgreSQL + Prisma (index, not source of truth)"],
                ["Portal / PWA", "Next.js, DaisyUI (Forest default), ethers v6"],
                ["Offline", "Service worker, IndexedDB, risk-tier policy"],
            ],
            [40 * mm, 135 * mm],
            st,
        )
    )

    story.append(Paragraph("7. What is real vs what you must not oversell", st["h1"]))
    story.append(
        table(
            ["Real", "Do not claim"],
            [
                [
                    "On-chain txs, contract reverts, signed attestations, quarantine, indexer, offline tests",
                    "QR/NFC is unclonable or tamper-proof",
                ],
                [
                    "Confidence formula with a visible breakdown",
                    "The NFT proves the physical radio is in the depot",
                ],
                [
                    "Vercel hosts the UI at anubandh-web.vercel.app",
                    "The Vercel site is a full production BEL deployment with Besu",
                ],
                [
                    "Anvil demo keys labeled demo/seed",
                    "We store user keys this way in production (we do not; it is a prototype convenience)",
                ],
            ],
            [88 * mm, 87 * mm],
            st,
        )
    )

    story.append(Paragraph("8. Likely judge questions", st["h1"]))
    story.append(
        bullets(
            [
                "<b>Why blockchain?</b> Shared, ordered, tamper-evident log across identity, roles, and assets. Not for speed. For non-repudiation.",
                "<b>Why not just PostgreSQL?</b> A DB admin can rewrite history. An auditor here reconstructs from chain events.",
                "<b>Is the UI the access control?</b> No. Contracts revert. PEP re-checks RoleManager.",
                "<b>ESP32 / PUF?</b> Out of scope. Software-first synopsis. IdentifierScan is weaker evidence on purpose.",
                "<b>Anvil vs Besu?</b> Same EVM bytecode. Anvil is local. Besu is the permissioned production mapping.",
                "<b>What if two people disagree?</b> Divergence record, quarantine, blocked transfer, reconciliation without delete.",
                "<b>Limitations?</b> Demo key custody on the PEP, no live Besu cluster, no BEL ERP, VC-shaped credentials not full VC-JWT.",
            ],
            st,
        )
    )

    story.append(
        KeepTogether(
            [
                Paragraph("9. Close (20 seconds)", st["h1"]),
                Paragraph(
                    "<i>Say:</i> \"ANUBANDH does not pretend a token is physical truth. It makes identity, permission, "
                    "custody, and disagreement auditable. The chain is the security boundary. The UI is how you look at it. "
                    "I can take questions, or I can run the User-mint-fails demo again.\"",
                    st["say"],
                ),
                Spacer(1, 8),
                Paragraph(
                    "Local: http://localhost:3000 &nbsp; Verifier: http://localhost:3001 &nbsp; "
                    "Public UI: https://anubandh-web.vercel.app/ &nbsp; Code: github.com/Faizaan-Alam/anubandh-sih26125<br/>"
                    "Reading order: learn-these/README.md",
                    st["caption"],
                ),
            ]
        )
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=18 * mm,
        title="ANUBANDH Presentation Briefing (SIH26125)",
        author="Faizaan Alam",
        subject="How to explain ANUBANDH: problem, solution, demo",
    )
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print("wrote", OUT)


if __name__ == "__main__":
    build()

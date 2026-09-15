#!/usr/bin/env python3
"""Simple-language explainer PDF for ANUBANDH."""

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
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).resolve().parents[1] / "learn-these" / "ANUBANDH_Simple_Explainer.pdf"

NAVY = colors.HexColor("#1b3a2f")
FOREST = colors.HexColor("#2f5d50")
INK = colors.HexColor("#1a1a1a")
MUTED = colors.HexColor("#4a5560")
PAPER = colors.HexColor("#f4f1ea")
LINE = colors.HexColor("#d5d0c4")
WHITE = colors.white


def styles():
    base = getSampleStyleSheet()
    return {
        "kicker": ParagraphStyle(
            "kicker",
            parent=base["Normal"],
            fontName="Times-Bold",
            fontSize=10,
            textColor=FOREST,
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="Times-Bold",
            fontSize=18,
            textColor=NAVY,
            spaceBefore=2,
            spaceAfter=8,
            leading=22,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Times-Bold",
            fontSize=13,
            textColor=FOREST,
            spaceBefore=10,
            spaceAfter=6,
            leading=17,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Times-Roman",
            fontSize=11.5,
            textColor=INK,
            leading=16.5,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
        ),
        "big": ParagraphStyle(
            "big",
            parent=base["Normal"],
            fontName="Times-Italic",
            fontSize=12,
            textColor=FOREST,
            leading=17,
            alignment=TA_LEFT,
            spaceBefore=2,
            spaceAfter=10,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=base["Normal"],
            fontName="Times-Roman",
            fontSize=11.5,
            textColor=INK,
            leading=16,
        ),
        "cell": ParagraphStyle(
            "cell",
            parent=base["Normal"],
            fontName="Times-Roman",
            fontSize=10,
            textColor=INK,
            leading=13.5,
        ),
        "cell_h": ParagraphStyle(
            "cell_h",
            parent=base["Normal"],
            fontName="Times-Bold",
            fontSize=10,
            textColor=WHITE,
            leading=13,
        ),
        "caption": ParagraphStyle(
            "caption",
            parent=base["Normal"],
            fontName="Times-Italic",
            fontSize=10,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
    }


def bullets(items, st):
    return ListFlowable(
        [ListItem(Paragraph(x, st["bullet"]), leftIndent=12, bulletColor=FOREST) for x in items],
        bulletType="bullet",
        leftIndent=18,
        bulletFontName="Times-Bold",
        bulletFontSize=11,
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
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PAPER]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
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
    canvas.setFont("Times-Bold", 9)
    canvas.drawString(18 * mm, h - 7.5 * mm, "ANUBANDH in simple words")
    canvas.setFont("Times-Roman", 8)
    canvas.drawRightString(w - 18 * mm, h - 7.5 * mm, "SIH26125")
    canvas.setFillColor(FOREST)
    canvas.rect(0, 0, w, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Times-Roman", 8)
    canvas.drawString(18 * mm, 5 * mm, "No password. Pick Admin. Click Sign challenge.")
    canvas.drawRightString(w - 18 * mm, 5 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build():
    st = styles()
    story = []

    story.append(Paragraph("SMART INDIA HACKATHON  |  BEL", st["kicker"]))
    story.append(Paragraph("ANUBANDH, explained simply", st["h1"]))
    story.append(
        Paragraph(
            "This note uses easy words. If you can explain it to a 13-year-old, you can explain it to a judge.",
            st["big"],
        )
    )
    story.append(
        Paragraph(
            "Faizaan Alam &nbsp;|&nbsp; Live website: https://anubandh-web.vercel.app/ &nbsp;|&nbsp; Demo on your laptop: http://localhost:3000",
            st["caption"],
        )
    )

    story.append(Paragraph("1. What is the problem?", st["h1"]))
    story.append(
        Paragraph(
            "Imagine a school keeps a big notebook of who owns which radio, who is allowed to move it, and who last saw it. "
            "The notebook sits on one teacher's desk. If someone erases a line and writes a new one, it looks like the new line "
            "was always there. Nobody can prove the old line existed.",
            st["body"],
        )
    )
    story.append(
        Paragraph(
            "Big companies like BEL have the same kind of problem, but with real people and real equipment. "
            "Today that notebook is a normal computer database. One person with admin access can change history. "
            "Names, keys, and \"who held this radio\" live in different places. If two people disagree about where the radio is, "
            "the system often just keeps the latest guess.",
            st["body"],
        )
    )
    story.append(Paragraph("In short, three things go wrong:", st["h2"]))
    story.append(
        bullets(
            [
                "<b>Anyone with the master password can rewrite the past.</b>",
                "<b>Hiding a button is not real security.</b> A clever person can still call the system directly.",
                "<b>Seeing something is not the same as proving it.</b> A note that says \"radio is in Depot A\" can be fake, old, or clash with another note.",
            ],
            st,
        )
    )
    story.append(
        Paragraph(
            "The government problem (SIH26125) asks: can we build a software system, on a blockchain, where identity, "
            "permission, and assets share one trail that is very hard to secretly edit?",
            st["body"],
        )
    )

    story.append(Paragraph("2. What did we build?", st["h1"]))
    story.append(
        Paragraph(
            "<b>ANUBANDH</b> is a website plus a private blockchain. Think of the blockchain as a shared diary. "
            "Every important action is a new page. You can add pages. You cannot quietly rip an old page out.",
            st["body"],
        )
    )
    story.append(
        Paragraph(
            "The website is just the window. The diary is the real lock. If a student tries to do a teacher's job, "
            "the diary itself says no, even if the student finds a hidden door around the website.",
            st["big"],
        )
    )

    story.append(Paragraph("3. How we solve it (simple pieces)", st["h1"]))
    story.append(Paragraph("Your name is a lock, not a password", st["h2"]))
    story.append(
        Paragraph(
            "Each person gets a DID. That is a digital name tied to a secret key, like a unique wax seal. "
            "To log in you do not type a password. Your key signs a one-time puzzle. The system checks: "
            "\"Is this still the real key for this name?\" If the name was cancelled, login fails.",
            st["body"],
        )
    )

    story.append(Paragraph("Jobs have ranks, and the chain enforces them", st["h2"]))
    story.append(
        table(
            ["Rank", "Like at school", "What they can do here"],
            [
                ["Admin", "Head teacher", "Create new items, give ranks, cancel names"],
                ["Manager", "Sports captain", "Move items, hand them to someone, suggest a fix after a fight"],
                ["Auditor", "Inspector", "Read the diary. Cannot move items."],
                ["User", "Student on duty", "Write a signed note: I saw this item here, in this state"],
            ],
            [28 * mm, 42 * mm, 105 * mm],
            st,
        )
    )
    story.append(Spacer(1, 8))
    story.append(
        Paragraph(
            "A User who clicks \"create item\" is refused. That is not only the website being polite. "
            "The chain program itself refuses. We even have a test that tries it the sneaky way, skipping the website. It still fails.",
            st["body"],
        )
    )

    story.append(Paragraph("Each thing is a unique token", st["h2"]))
    story.append(
        Paragraph(
            "A radio is not just a row in a spreadsheet. It is a unique digital token (an NFT). "
            "The token remembers <b>owner</b> (who it belongs to) and <b>custodian</b> (who is holding it right now). "
            "Those two can be different, like owning a cricket bat but lending it to a friend. "
            "The long document about the radio stays on a normal computer. Only a fingerprint of that document goes on the chain.",
            st["body"],
        )
    )

    story.append(Paragraph("People sign what they saw", st["h2"]))
    story.append(
        Paragraph(
            "When someone checks a radio, they sign a note. There are two kinds of notes:",
            st["body"],
        )
    )
    story.append(
        bullets(
            [
                "<b>Signed inspection</b> (strong): \"I am allowed to check this, and I sign with my key.\" Weight 1.0.",
                "<b>Identifier scan</b> (weaker): like scanning a barcode. Easy to copy. Weight 0.4. We never say a QR code cannot be faked.",
            ],
            st,
        )
    )
    story.append(
        Paragraph(
            "We also score how much we <b>trust the current picture</b>. Fresh signed notes score high. Old notes fade. "
            "If two recent notes disagree, trust crashes. The number on the screen always explains itself: "
            "which notes, how old, and whether there is a fight.",
            st["body"],
        )
    )

    story.append(Paragraph("If two people disagree, freeze the item", st["h2"]))
    story.append(
        Paragraph(
            "User A says the radio is in Depot A and looks fine. User 2, soon after, says Depot B or \"broken\". "
            "The system writes a <b>divergence</b>: a permanent record of the clash. Then it <b>quarantines</b> the radio. "
            "Nobody can transfer it until a manager records an official decision. The fight is never erased. "
            "For extra-important items, a manager proposes the fix and a <b>different</b> admin must agree. Two people, not one.",
            st["body"],
        )
    )

    story.append(Paragraph("Inspectors can rewind time", st["h2"]))
    story.append(
        Paragraph(
            "Every important action leaves a mark in the diary. A helper program copies those marks into a fast search box (Postgres). "
            "An auditor can ask: \"At 2pm yesterday, who owned this, and was it frozen?\" "
            "The answer is rebuilt from the marks, not from \"whatever the last row says now\". "
            "If the search box and the diary ever disagree, the diary wins.",
            st["body"],
        )
    )

    story.append(Paragraph("It can work a bit without internet", st["h2"]))
    story.append(
        Paragraph(
            "Field staff can save a snapshot on their phone (a PWA). Small checks can still happen offline. "
            "Big, dangerous actions (like transferring ownership) are blocked if the saved snapshot is older than 15 minutes. "
            "When the network comes back, the signed decisions are sent in and checked again.",
            st["body"],
        )
    )

    story.append(
        KeepTogether(
            [
                Paragraph("4. The path of one click", st["h1"]),
                Paragraph(
                    "You in the browser &rarr; a gatekeeper program (the PEP) &rarr; smart contracts on the chain &rarr; "
                    "a listener copies events &rarr; a database for search &rarr; the audit screen.",
                    st["big"],
                ),
            ]
        )
    )
    story.append(
        bullets(
            [
                "The website never gets to cheat. The chain has the last word.",
                "Login is a signature, not a password.",
                "Local demo chain is Anvil (a practice chain). Real-world target is Hyperledger Besu. Same kind of programs, stricter network.",
            ],
            st,
        )
    )

    story.append(Paragraph("5. How you show it (no password)", st["h1"]))
    story.append(
        Paragraph(
            "Use the laptop site http://localhost:3000. The public site shows the look, but login needs your laptop's backend.",
            st["body"],
        )
    )
    story.append(
        bullets(
            [
                "<b>Admin:</b> pick Admin in the list. Click Sign challenge and enter. Show token #1.",
                "<b>User cannot mint:</b> sign out, pick User, try Mint. It should fail. That is the point.",
                "<b>Two stories clash:</b> User signs \"Depot A, Good\". User 2 signs something different. The radio freezes.",
                "<b>Manager:</b> transfer should fail while frozen. Then propose a fix. The clash stays in history.",
                "<b>Auditor:</b> open Audit Trail and rebuild an earlier moment.",
            ],
            st,
        )
    )

    story.append(Paragraph("6. What you must not say", st["h1"]))
    story.append(
        table(
            ["True", "Not true"],
            [
                ["The chain records who signed what, and when.", "The token proves the real radio is sitting in the depot."],
                ["A QR-style scan is a weak clue.", "A QR or NFC tag cannot be copied."],
                ["The website on Vercel is the front door.", "Vercel is the full BEL production system with Besu."],
                ["This is a working prototype with real tests.", "We already plugged into BEL's live factory software."],
            ],
            [88 * mm, 87 * mm],
            st,
        )
    )

    story.append(Spacer(1, 10))
    story.append(Paragraph("7. One line to remember", st["h1"]))
    story.append(
        Paragraph(
            "ANUBANDH does not pretend a computer token is the real world. "
            "It makes names, permissions, custody, and disagreements hard to secretly rewrite. "
            "The chain is the lock. The website is the window.",
            st["big"],
        )
    )
    story.append(
        Paragraph(
            "Code: github.com/Faizaan-Alam/anubandh-sih26125 &nbsp;|&nbsp; "
            "More detail: ANUBANDH_Presentation_Briefing.pdf in this folder",
            st["caption"],
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
        title="ANUBANDH in simple words",
        author="Faizaan Alam",
        subject="Easy-language explainer for SIH26125",
    )
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print("wrote", OUT)


if __name__ == "__main__":
    build()

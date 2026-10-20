from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "AttestAI-Whitepaper.pdf"

NAVY = colors.HexColor("#07111F")
PANEL = colors.HexColor("#0D1C31")
BLUE = colors.HexColor("#6FA8FF")
CYAN = colors.HexColor("#54D6D2")
TEXT = colors.HexColor("#E9F1FB")
MUTED = colors.HexColor("#A8B7CB")
GOLD = colors.HexColor("#F2C66D")

try:
    pdfmetrics.registerFont(TTFont("DejaVu", "C:/Windows/Fonts/arial.ttf"))
    pdfmetrics.registerFont(TTFont("DejaVu-Bold", "C:/Windows/Fonts/arialbd.ttf"))
    BODY = "DejaVu"
    BOLD = "DejaVu-Bold"
except Exception:
    BODY = "Helvetica"
    BOLD = "Helvetica-Bold"

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", fontName=BOLD, fontSize=34, leading=38, textColor=TEXT, alignment=TA_LEFT, spaceAfter=12))
styles.add(ParagraphStyle(name="CoverSub", fontName=BODY, fontSize=15, leading=21, textColor=MUTED, spaceAfter=20))
styles.add(ParagraphStyle(name="H1x", fontName=BOLD, fontSize=23, leading=28, textColor=TEXT, spaceBefore=2, spaceAfter=14))
styles.add(ParagraphStyle(name="H2x", fontName=BOLD, fontSize=14, leading=18, textColor=BLUE, spaceBefore=8, spaceAfter=7))
styles.add(ParagraphStyle(name="Bodyx", fontName=BODY, fontSize=9.4, leading=14, textColor=TEXT, spaceAfter=8))
styles.add(ParagraphStyle(name="Smallx", fontName=BODY, fontSize=8, leading=11, textColor=MUTED, spaceAfter=5))
styles.add(ParagraphStyle(name="Bulletx", fontName=BODY, fontSize=9.2, leading=13.5, leftIndent=11, firstLineIndent=-7, textColor=TEXT, spaceAfter=5))
styles.add(ParagraphStyle(name="Quote", fontName=BOLD, fontSize=12, leading=17, textColor=CYAN, leftIndent=12, borderPadding=8, backColor=PANEL, spaceBefore=7, spaceAfter=12))

def P(text, style="Bodyx"):
    return Paragraph(text.replace("&", "&amp;"), styles[style])

def bullets(items):
    return [P("• " + item, "Bulletx") for item in items]

def panel(text, color=PANEL):
    t = Table([[P(text, "Bodyx")]], colWidths=[164*mm])
    t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), color), ("BOX", (0,0), (-1,-1), 0.5, colors.HexColor("#1F385B")), ("LEFTPADDING", (0,0), (-1,-1), 10), ("RIGHTPADDING", (0,0), (-1,-1), 10), ("TOPPADDING", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 4)]))
    return t

def flow_table():
    labels = ["Source\nChain", "USC\nProof", "0x0FD2\nVerification", "Semantic\nValidation", "Deterministic\nGuardrails", "AI\nDecision", "Creditcoin\nRecord"]
    cells = [[P(x.replace("\n", "<br/>"), "Smallx") for x in labels]]
    t = Table(cells, colWidths=[23.5*mm]*7, rowHeights=[27*mm])
    t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), PANEL), ("BOX", (0,0), (-1,-1), 0.6, colors.HexColor("#27476D")), ("INNERGRID", (0,0), (-1,-1), 0.5, colors.HexColor("#27476D")), ("TEXTCOLOR", (0,0), (-1,-1), TEXT), ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("ALIGN", (0,0), (-1,-1), "CENTER"), ("LEFTPADDING", (0,0), (-1,-1), 5), ("RIGHTPADDING", (0,0), (-1,-1), 5)]))
    return t

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    if doc.page > 1:
        canvas.setStrokeColor(colors.HexColor("#1B3455"))
        canvas.setLineWidth(0.5)
        canvas.line(18*mm, A4[1]-16*mm, A4[0]-18*mm, A4[1]-16*mm)
        canvas.setFont(BOLD, 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(18*mm, A4[1]-12*mm, "ATTESTAI  /  WHITEPAPER")
        canvas.drawRightString(A4[0]-18*mm, 12*mm, f"{doc.page:02d}")
    canvas.restoreState()

doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=24*mm, bottomMargin=18*mm)
doc.addPageTemplates([PageTemplate(id="dark", frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")], onPage=header_footer)])
story = []

story += [Spacer(1, 35*mm), P("ATTESTAI", "Smallx"), P("Verify First.<br/>Decide Second.", "CoverTitle"), P("A proof-aware AI agent for cross-chain decisions", "CoverSub"), panel("DoraHacks BUIDL CTC 2026 Fall submission edition<br/><br/>Ethereum Sepolia  →  Creditcoin CC3 Testnet<br/>English project source  |  Receipt-backed live verification"), Spacer(1, 68*mm), P("Current status: Onchain Verified. The CC3 receipt 0xe8b2a92dc044bdd6d8a05b25ef731ad7f61ac614d0fcf6944b2a1e1fbcfb7d0f accepted the existing Sepolia proof and recorded the HOLD decision. No real-money execution is enabled.", "Smallx"), PageBreak()]

def page(title, intro, *parts):
    story.extend([P(title, "H1x"), P(intro, "Bodyx")])
    for part in parts:
        if isinstance(part, list):
            for item in part:
                story.extend(item if isinstance(item, list) else [item])
        else:
            story.append(part)
    story.append(PageBreak())

page("Executive Summary", "AttestAI is a proof-aware AI decision agent for cross-chain market intelligence.", [P("A signal is emitted on Ethereum Sepolia. The worker waits for the source block to be attested, obtains USC proof material, and submits the encoded source transaction to a Creditcoin destination contract. The contract calls the USC Native Query Verifier at <font name='DejaVu-Bold'>0x0FD2</font> before accepting the signal. Only then do deterministic risk guardrails and the AI decision adapter run.", "Bodyx"), P("The application does not enable real-money trading. Demo Mode uses deterministic fixtures and labels the Proof Inspector state <font color='#F2C66D'>Simulated</font>; fixtures are never represented as onchain verification.", "Quote"), P("What the system contributes", "H2x"), bullets(["A verifiable cross-chain input boundary for AI decisions.", "Semantic validation beyond proof inclusion.", "Fail-closed guardrails that keep unsafe data away from the AI.", "A visible provenance model for reviewers and users."])])

page("Problem and Design Principles", "Trustworthy automation needs evidence, meaning, and policy to remain separate.", [P("AI agents can turn plausible but untrusted cross-chain data into confident actions. A source transaction may be included in a chain but still be irrelevant, failed, emitted by the wrong contract, sent by the wrong account, or replayed. Proof of inclusion alone does not prove that the payload is the intended signal.", "Bodyx"), P("AttestAI makes the trust boundary explicit: cryptographic verification happens in a Creditcoin smart contract, semantic checks happen before the signal is accepted, and the AI is downstream of deterministic policy.", "Bodyx"), P("Principles", "H2x"), bullets(["Verify before interpretation.", "Keep the worker transport-oriented; Creditcoin is the trust boundary.", "Separate cryptographic validity from semantic relevance.", "Fail closed to HOLD when evidence is unsafe or unavailable.", "Keep Demo Mode deterministic and visibly distinct from live verification.", "Never imply an unobserved deployment, proof, metric, transaction, or integration state."])])

page("Architecture", "The intended evidence-to-decision path is linear and inspectable.", [flow_table(), Spacer(1, 10), P("Ethereum Sepolia hosts SignalEmitter, which emits MarketSignal. The worker transports source transaction data and proof material. AttestAIDecision decodes the transaction and receipt, calls the native verifier, emits VerifiedSignalAccepted, and records the decision. The web dashboard and Proof Inspector expose the provenance state.", "Bodyx"), P("The worker is not a trust authority. Creditcoin is the trust boundary; the destination contract accepts a source signal only after verifier success and semantic checks.", "Quote")])

page("Creditcoin USC v2 Integration", "The repository targets the official CC3 USC v2 shape documented by Creditcoin.", [P("CC3 Testnet is configured with Creditcoin chain ID 102031. Ethereum Sepolia is represented by USC source-chain key 1, distinct from EVM chain ID 11155111. The configured native verifier address is 0x0000000000000000000000000000000000000FD2.", "Bodyx"), P("The live worker uses the official USC SDK proof-builder path: it requests proof data for a source transaction, passes the returned header number, encoded transaction, Merkle proof, and continuity proof to verifyAndRecord, and waits for the Creditcoin receipt. The destination contract calls verify synchronously, derives a query key from source chain, block height, and transaction index, and stores replay protection after verification.", "Bodyx"), panel("Validation result<br/>The existing Sepolia source transaction was accepted on CC3 Testnet. Receipt 0xe8b2a92dc044bdd6d8a05b25ef731ad7f61ac614d0fcf6944b2a1e1fbcfb7d0f emitted VerifiedSignalAccepted and DecisionRecorded."), P("Official references", "H2x"), bullets(["Creditcoin USC Universal Smart Contracts documentation.", "Creditcoin USC network manifest.", "Project traceability and live validation records in docs/."])])

page("Semantic Validation", "A valid cross-chain proof can still be the wrong fact.", [P("After decoding the proof payload, AttestAIDecision checks the following before it calls the native verifier or accepts the query:", "Bodyx"), bullets(["Source chain key matches the configured chain.", "Receipt status equals 1.", "Transaction sender matches the expected source sender.", "Transaction destination matches SignalEmitter.", "Calldata begins with emitSignal(bytes32,int256,uint256).", "Asset, price, and liquidity are non-zero and positive where required.", "Exactly one MarketSignal log is present at the expected contract.", "Logged price and liquidity match calldata and the event timestamp is non-zero.", "The query key has not already been processed.", "USC Merkle inclusion and continuity verification succeeds."]), P("These checks are intentionally separate from the AI layer. A valid proof can still be rejected if its payload is not the expected signal.", "Quote")])

page("Risk Guardrails and AI Boundary", "The AI explains and prioritizes accepted evidence; it does not define what evidence is safe.", [P("applyGuardrails requires cryptographic source verification, a positive price, liquidity of at least 100000, and absolute price movement no greater than 20%. It returns an acceptance flag, risk score, and reasons. If any check fails, decide returns HOLD and the AI is not allowed to reinterpret the blocked input.", "Bodyx"), panel("AI boundary<br/>Source proof → semantic checks → deterministic guardrails → decision adapter<br/><br/>The application records BUY, HOLD, or SELL with confidence, risk score, concise reasoning, and guardrail results. It does not execute trades or move real money."), P("The policy is intentionally legible: reviewers can inspect why data was rejected, and tests exercise both blocked unverified input and accepted verified liquid input.", "Bodyx")])

page("Proof Inspector and Security", "Evidence state is a product feature, not a hidden implementation detail.", [P("The Proof Inspector distinguishes three states:", "Bodyx"), bullets(["Simulated: deterministic fixture data used by Demo Mode; not cryptographically verified.", "Locally Validated: local checks and guardrails passed, but no Creditcoin receipt proves the flow.", "Onchain Verified: a real USC proof was accepted by the destination contract and the receipt and events were checked."]), P("Threat model", "H2x"), bullets(["Forged or irrelevant payloads are constrained by source chain, sender, destination, selector, event, and value checks.", "Failed source transactions are rejected by receipt-status validation.", "Replay is constrained by a query key derived from source chain, block height, and transaction index.", "Unavailable infrastructure fails closed through explicit Demo Mode and no live-state claim.", "AI overreach is constrained by deterministic guardrails and a no-trading boundary."]), P("The worker may transport malformed or adversarial data, but it cannot unilaterally make that data trusted.", "Quote")])

page("Implementation and Testing", "The repository is organized so each trust step has a visible home.", [P("The monorepo contains a Next.js dashboard, a worker for relay and decision logic, and Hardhat contracts. The dashboard surfaces the current mode, source reference, guardrails, decision, and inspector timeline. The worker contains the proof provider boundary, relay trace, risk policy, and decision adapter.", "Bodyx"), P("Contract tests cover wrong chain, malformed payload, wrong source contract, failed source transaction, invalid proof, and replay rejection. Worker tests cover blocking unverified data and accepting a verified liquid signal. The live end-to-end checklist remains deployment- and funding-dependent.", "Bodyx"), P("Review posture", "H2x"), bullets(["Deterministic fixtures make the UI reviewable without credentials.", "No private key or secret is required for Demo Mode.", "Live paths remain configuration-driven and are not run while official endpoints are unreachable.", "Repository content is English-only for judging and reuse."])])

page("Current Status and Roadmap", "The current state is receipt-backed, reproducible, and ready for broader policy coverage.", [P("On 2026-09-12, the existing Sepolia source transaction was proven through CC3 Testnet. Receipt 0xe8b2a92dc044bdd6d8a05b25ef731ad7f61ac614d0fcf6944b2a1e1fbcfb7d0f finalized with status 1 and recorded HOLD with confidence 78 and risk score 10.", "Bodyx"), panel("Current Live Status<br/>ONCHAIN VERIFIED - CC3 receipt confirmed<br/><br/>Demo Mode remains available for deterministic fixture review, and the application does not execute real-money trades."), P("Roadmap", "H2x"), bullets(["Add richer source event schemas and stronger policy configuration.", "Extend the boundary to lending risk, treasury controls, insurance claims, compliance attestations, DAO operations, and agent-to-agent permissions.", "Add proof export and independent verification views."])])

page("Links and Conclusion", "AttestAI treats AI decisions as downstream of evidence.", [P("Links", "H2x"), bullets(["GitHub repository: https://github.com/noboru59631/attestai", "Live demo: not published in the current repository", "Demo video: not published in the current repository", "Verified Creditcoin receipt: https://creditcoin-testnet.blockscout.com/tx/0xe8b2a92dc044bdd6d8a05b25ef731ad7f61ac614d0fcf6944b2a1e1fbcfb7d0f", "USC documentation: https://docs.creditcoin.org/usc/dapp-builder-infrastructure/universal-smart-contracts", "USC network manifest: https://github.com/gluwa/creditcoin-usc-networks/blob/master/networks.json"]), P("The live demo and demo-video entries are intentionally marked as unpublished because no verified public URL is present in the current project source.", "Smallx"), Spacer(1, 12), P("Creditcoin USC supplies the cross-chain verification boundary; the destination contract supplies semantic validation and replay protection; deterministic guardrails define the AI boundary; and the Proof Inspector makes the receipt-backed evidence state visible. The application remains honest and reviewable in both live and Demo Mode.", "Quote"), Spacer(1, 22), P("Prepared for DoraHacks BUIDL CTC 2026 Fall submission", "Smallx")])

OUT.parent.mkdir(parents=True, exist_ok=True)
doc.build(story)
print(OUT)

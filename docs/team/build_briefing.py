"""Build the team briefing PDF. Drafted with AI assistance (Claude Code) — see docs/submission/si_usage.md."""
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table,
                                TableStyle, PageBreak, CondPageBreak, KeepTogether, NextPageTemplate)

OUT = sys.argv[1]
F = "/usr/share/fonts/TTF/"
pdfmetrics.registerFont(TTFont("DV", F + "DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DVB", F + "DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("DVI", F + "DejaVuSans-Oblique.ttf"))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily("DV", normal="DV", bold="DVB", italic="DVI", boldItalic="DVB")

NAVY = colors.HexColor("#14325C")
BLUE = colors.HexColor("#2E6DA4")
SKY = colors.HexColor("#E8F0F8")
AMBER = colors.HexColor("#C77D12")
SAND = colors.HexColor("#FBF3E4")
GREEN = colors.HexColor("#2F7D4F")
MINT = colors.HexColor("#E7F3EC")
RED = colors.HexColor("#A33A3A")
GREY = colors.HexColor("#5B6573")
LINE = colors.HexColor("#C9D3DF")

S = {}
S["body"] = ParagraphStyle("body", fontName="DV", fontSize=9.6, leading=13.6, spaceAfter=5, textColor=colors.HexColor("#1E2430"))
S["small"] = ParagraphStyle("small", parent=S["body"], fontSize=8.4, leading=11.2, spaceAfter=2)
S["cell"] = ParagraphStyle("cell", parent=S["body"], fontSize=8.4, leading=11, spaceAfter=0)
S["cellb"] = ParagraphStyle("cellb", parent=S["cell"], fontName="DVB")
S["cellh"] = ParagraphStyle("cellh", parent=S["cell"], fontName="DVB", textColor=colors.white)
S["h1"] = ParagraphStyle("h1", fontName="DVB", fontSize=17, leading=21, textColor=NAVY, spaceBefore=2, spaceAfter=8)
S["h2"] = ParagraphStyle("h2", fontName="DVB", fontSize=12, leading=15, textColor=BLUE, spaceBefore=9, spaceAfter=4)
S["h3"] = ParagraphStyle("h3", fontName="DVB", fontSize=10, leading=13, textColor=NAVY, spaceBefore=6, spaceAfter=3)
S["bullet"] = ParagraphStyle("bullet", parent=S["body"], bulletFontName="DV", leftIndent=13, bulletIndent=3, spaceAfter=2.5)
S["box"] = ParagraphStyle("box", parent=S["body"], fontSize=9.2, leading=12.8, spaceAfter=2)
S["boxh"] = ParagraphStyle("boxh", parent=S["box"], fontName="DVB", spaceAfter=3)
S["diag"] = ParagraphStyle("diag", parent=S["cell"], alignment=TA_CENTER, fontSize=8.6, leading=11)
S["diagb"] = ParagraphStyle("diagb", parent=S["diag"], fontName="DVB", fontSize=9.5, leading=12, textColor=colors.white)
S["diagw"] = ParagraphStyle("diagw", parent=S["diag"], textColor=colors.white, fontSize=7.8, leading=10)
S["arrow"] = ParagraphStyle("arrow", parent=S["diag"], fontSize=14, textColor=GREY)

W = A4[0] - 36 * mm  # content width


def P(t, s="body"): return Paragraph(t, S[s])
def H1(t): return P(t, "h1")
def H2(t): return P(t, "h2")
def H3(t): return P(t, "h3")
def B(items): return [Paragraph(i, S["bullet"], bulletText="•") for i in items]
def N(items): return [Paragraph(i, S["bullet"], bulletText=f"{k}.") for k, i in enumerate(items, 1)]


def table(rows, widths, header=True, zebra=True, hdr=NAVY):
    data = []
    for r, row in enumerate(rows):
        st = "cellh" if (header and r == 0) else "cell"
        data.append([c if not isinstance(c, str) else Paragraph(c, S[st]) for c in row])
    t = Table(data, colWidths=[w * W for w in widths], repeatRows=1 if header else 0)
    style = [("VALIGN", (0, 0), (-1, -1), "TOP"),
             ("GRID", (0, 0), (-1, -1), 0.4, LINE),
             ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
             ("TOPPADDING", (0, 0), (-1, -1), 3.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5)]
    if header:
        style.append(("BACKGROUND", (0, 0), (-1, 0), hdr))
    if zebra:
        for r in range(1 if header else 0, len(rows)):
            if r % 2 == 0:
                style.append(("BACKGROUND", (0, r), (-1, r), colors.HexColor("#F5F7FA")))
    t.setStyle(TableStyle(style))
    return t


def box(title, content, bg=SKY, edge=BLUE):
    inner = [P(title, "boxh")] + [c if not isinstance(c, str) else P(c, "box") for c in content]
    t = Table([[inner]], colWidths=[W])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), bg),
                           ("LINEBEFORE", (0, 0), (0, -1), 3, edge),
                           ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                           ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    return KeepTogether([Spacer(1, 4), t, Spacer(1, 6)])


def feedback(section, questions):
    items = [Paragraph(q, S["bullet"], bulletText="□") for q in questions]
    items.append(P("<i>Reply format: “§%s / Q# — agree / disagree / suggestion — why”.</i>" % section, "small"))
    return box("Your feedback on §%s" % section, items, bg=SAND, edge=AMBER)


def flow(steps, colors_, widths=None, sub=None, fs=None):
    """Horizontal flow diagram: coloured boxes separated by arrows."""
    n = len(steps)
    arrow_w = 0.04
    box_w = (1 - arrow_w * (n - 1)) / n
    row, cw, st = [], [], []
    for i, s in enumerate(steps):
        sty = S["diagb"] if not fs else ParagraphStyle("x", parent=S["diagb"], fontSize=fs, leading=fs + 2)
        cell = [Paragraph(s, sty)]
        if sub:
            cell.append(P(sub[i], "diagw"))
        row.append(cell); cw.append(box_w * W)
        col = len(row) - 1
        st += [("BACKGROUND", (col, 0), (col, 0), colors_[i])]
        if i < n - 1:
            row.append(P("→", "arrow")); cw.append(arrow_w * W)
    t = Table([row], colWidths=cw)
    st += [("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 4),
           ("RIGHTPADDING", (0, 0), (-1, -1), 4), ("TOPPADDING", (0, 0), (-1, -1), 6),
           ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]
    t.setStyle(TableStyle(st))
    return t


def layered():
    """Three-layer diagram with sub-text in white panels."""
    heads = ["LAYER 01 · Trend detection", "LAYER 02 · Atmospheric structure", "LAYER 03 · Physical interpretation"]
    qs = ["<b>What is changing?</b><br/>Long-term NASA records<br/>GPM IMERG · MERRA-2 · MODIS · GPCP",
          "<b>What happens inside the atmosphere?</b><br/>Vertical profiles<br/>EarthCARE CPR · ATLID · L2 (+ CloudSat/CALIPSO?)",
          "<b>Why might it happen?</b><br/>Mechanisms, consistency checks<br/>Data + physics + literature"]
    cols = [NAVY, BLUE, GREEN]
    hrow, qrow, cw, st = [], [], [], []
    for i in range(3):
        hrow.append(P(heads[i], "diagb")); qrow.append(P(qs[i], "diag")); cw.append(0.30 * W)
        c = len(hrow) - 1
        st += [("BACKGROUND", (c, 0), (c, 0), cols[i]), ("BOX", (c, 0), (c, 1), 0.8, cols[i]),
               ("BACKGROUND", (c, 1), (c, 1), colors.white)]
        if i < 2:
            hrow.append(P("→", "arrow")); qrow.append(P("", "diag")); cw.append(0.05 * W)
    t = Table([hrow, qrow], colWidths=cw)
    st += [("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 6),
           ("BOTTOMPADDING", (0, 0), (-1, -1), 6), ("SPAN", (1, 0), (1, 1)), ("SPAN", (3, 0), (3, 1))]
    t.setStyle(TableStyle(st))
    return t


# ---------------------------------------------------------------- page decorations
def cover_page(c, d):
    c.saveState()
    c.setFillColor(NAVY); c.rect(0, A4[1] - 118 * mm, A4[0], 118 * mm, stroke=0, fill=1)
    c.setFillColor(AMBER); c.rect(0, A4[1] - 121 * mm, A4[0], 3 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont("DV", 10); c.drawString(18 * mm, A4[1] - 30 * mm, "NASA SPACE APPS CHALLENGE 2026  ·  EARTH SCIENCE DATA TREND DETECTIVE")
    c.setFont("DVB", 30); c.drawString(18 * mm, A4[1] - 55 * mm, "Earth System")
    c.drawString(18 * mm, A4[1] - 68 * mm, "Trend Detective")
    c.setFont("DV", 13); c.drawString(18 * mm, A4[1] - 82 * mm, "Team briefing & feedback request")
    c.setFont("DVI", 10.5)
    c.drawString(18 * mm, A4[1] - 100 * mm, "Detect atmospheric change · look inside the atmosphere · explain it honestly")
    c.restoreState()


def normal_page(c, d):
    c.saveState()
    c.setStrokeColor(LINE); c.setLineWidth(0.5)
    c.line(18 * mm, A4[1] - 13 * mm, A4[0] - 18 * mm, A4[1] - 13 * mm)
    c.setFont("DV", 7.8); c.setFillColor(GREY)
    c.drawString(18 * mm, A4[1] - 11 * mm, "Earth System Trend Detective — Team briefing v0.1 (13 Nov 2026)")
    c.drawRightString(A4[0] - 18 * mm, A4[1] - 11 * mm, "Internal · for team feedback")
    c.line(18 * mm, 13 * mm, A4[0] - 18 * mm, 13 * mm)
    c.drawString(18 * mm, 9 * mm, "Drafted with AI assistance (Claude Code) from the team's research plan — to be reviewed by the team.")
    c.drawRightString(A4[0] - 18 * mm, 9 * mm, "Page %d" % d.page)
    c.restoreState()


doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
                      title="Earth System Trend Detective — Team briefing v0.1",
                      author="Earth System Trend Detective team",
                      subject="NASA Space Apps 2026 — project briefing and feedback request",
                      creator="Drafted with AI assistance (Claude Code, Anthropic); content from the team's research plan",
                      keywords="SI-assisted; NASA Space Apps; Sahel; precipitation; trend detection")
fr = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
cover_fr = Frame(doc.leftMargin, doc.bottomMargin, doc.width, A4[1] - 130 * mm - doc.bottomMargin, id="c")
doc.addPageTemplates([PageTemplate("cover", [cover_fr], onPage=cover_page),
                      PageTemplate("normal", [fr], onPage=normal_page)])

st = []
# ---------------------------------------------------------------- COVER
st += [NextPageTemplate("normal"), Spacer(1, 4)]
st.append(table([
    ["Document", "Team briefing v0.1: what we are building, why, how, and what is still undecided"],
    ["Date", "13 November 2026"],
    ["Status", "Phase 01, scientific framing. Region and focus decided; data verification next."],
    ["Audience", "All team members, including non-specialists (glossary in §12)"],
    ["What we need from you", "Read it (about 25 minutes), then answer the yellow <b>feedback boxes</b> and the questionnaire in §11."],
], [0.24, 0.76], header=False, zebra=False))
st.append(Spacer(1, 10))
st.append(H3("Contents"))
toc = ["1. Executive summary", "2. The challenge and how we will be judged", "3. Our idea: three layers of evidence",
       "4. Flagship investigation: rainfall in the Sahel", "5. Data sources", "6. Methods and statistics",
       "7. Scientific rigor rules", "8. The application", "9. Roadmap and demo plan",
       "10. Decisions made, open decisions, risks", "11. Feedback questionnaire", "12. Glossary",
       "Appendix: workspace and references"]
st.append(Table([[P(a, "small"), P(b, "small")] for a, b in zip(toc[:7], toc[7:] + [""])], colWidths=[W / 2, W / 2]))
st.append(PageBreak())

# ---------------------------------------------------------------- 1 EXEC SUMMARY
st.append(H1("1. Executive summary"))
st.append(P("<b>In one sentence:</b> we are building a web app that lets anyone pick an atmospheric variable, a region and a time period, "
            "then detects whether there is a statistically significant trend. Our flagship case study goes further and asks <i>why</i>: "
            "is rainfall in the African Sahel changing, especially extreme rain, and are the storms and dust that satellites see inside the "
            "atmosphere consistent with that change?"))
st.append(table([
    ["Question", "Short answer"],
    ["What are we building?", "A “trend detective” app (FastAPI backend + light web front-end) that does the five steps required by the challenge, plus a deep-dive investigation mode."],
    ["Flagship case study", "Sahel rainfall, 2001–2025: total amount <b>and</b> extremes (heaviest days, share of rain from very wet days)."],
    ["Main data", "NASA GPM IMERG (rain), MERRA-2 (moisture, wind, dust), MODIS (aerosols, clouds), with GPCP for long-term context. ESA/JAXA EarthCARE for vertical structure."],
    ["What makes it different", "Most trend tools stop at “the line goes up”. We link the trend (Layer 1) to what is happening inside the atmosphere (Layer 2) and to physical explanations (Layer 3), and we show the uncertainty."],
    ["Why it matters", "Sahel rainfall drives farming, food security and water for a very large population. More intense rain means more floods even when total rain does not change."],
    ["Where we are", "Workspace organised, decision log started, region and focus decided. Next: verify each dataset and download the first real sample."],
], [0.27, 0.73]))
st.append(Spacer(1, 6))
st.append(box("The core reasoning in four steps", N([
    "A long NASA record shows whether a trend exists, and whether it is statistically significant.",
    "EarthCARE (2024 onwards) shows <i>in detail</i> what the relevant clouds, storms and dust layers look like today.",
    "We check whether those structures are <i>consistent with</i> mechanisms that could produce the trend.",
    "We compare with reanalysis and published research, and state clearly what we cannot prove.",
]) + [P("<b>This is evidence-based interpretation, not proof of causation.</b> We say this explicitly in the app and the presentation.", "box")]))
st.append(feedback("1", ["Q1. After reading this page, could you explain the project to a friend in two sentences? If not, what is unclear?",
                         "Q2. Is the Sahel story compelling enough to win attention in a ≤30-second video or ≤7 slides?"]))
st.append(CondPageBreak(90*mm))

# ---------------------------------------------------------------- 2 CHALLENGE
st.append(H1("2. The challenge and how we will be judged"))
st.append(H2("2.1 What the app must do (hard requirements)"))
st.append(P("The official brief says <i>“Your app should be able to do this”</i>:"))
st.append(flow(["1. Variable", "2. Region", "3. Time period", "4. Time series", "5. Significance"],
               [NAVY, NAVY, NAVY, BLUE, GREEN],
               sub=["Pick the data variable(s)", "Pick the area", "Pick start and end", "Build it; is there a trend?", "Test the trend statistically"]))
st.append(Spacer(1, 6))
st.append(P("<b>Consequence (decision D-001):</b> the product is a <b>general tool</b> that any user can drive through these five steps. "
            "Our Sahel investigation is the showcase that proves the tool works and shows what it can reveal. A one-off study without "
            "a usable tool would miss the brief."))
st.append(H2("2.2 Submission rules"))
st.extend(B([
    "<b>Demo:</b> a slide deck of <b>no more than 7 slides</b> (title and intro included) <b>or</b> a video of <b>30 seconds or less</b>, on a public link with no login.",
    "<b>Project link:</b> public (website, GitHub, Drive…) with no password, permission or registration.",
    "<b>Project details</b> must answer: what it does and how; its benefits; intended impact; tools used; how it is creative; factors considered (energy, accessibility, cost…).",
    "<b>NASA data is mandatory</b> for Global Award eligibility, and every NASA resource used must be listed.",
    "No recognisable names, voices or likenesses of people under 18.",
]))
st.append(H2("2.3 AI (“Super Intelligence”) policy"))
st.extend(B([
    "AI use is allowed, but we must say <b>where and how</b> it was used.",
    "AI-generated images and videos need a <b>visible watermark</b>. AI-generated code, data and audio must be acknowledged in descriptive text <b>and</b> in metadata.",
    "AI-generated content must <b>never</b> use or modify NASA logos, flags or mission identifiers.",
    "We keep a running log in <font face='DVI'>docs/submission/si_usage.md</font>. <b>Everyone must add a row whenever they use an AI tool.</b> (This document is itself AI-assisted and is marked as such.)",
]))
st.append(H2("2.4 Judging criteria (each scored out of 5) and our strategy"))
st.append(table([
    ["Criterion", "What earns a 5", "How we aim for it"],
    ["Impact", "Significant problem, large audience, could change the world", "Sahel rainfall ties directly to food security, floods and water. We present results in terms people can act on."],
    ["Creativity", "Novel approach, inventive execution", "A three-layer “detective” chain from trend to structure to mechanism, combining a long NASA record with brand-new EarthCARE profiles."],
    ["Validity", "Scientifically sound, feasible, usable, user-friendly", "Proper statistics (seasonality, autocorrelation, start-year sensitivity), uncertainty shown everywhere, a working app."],
    ["Relevance", "NASA data integral, not superficial", "Every Layer-1 trend comes from NASA data. EarthCARE only complements it and is clearly labelled as ESA/JAXA."],
    ["Presentation", "Clear, compelling, well-structured story", "One question, one main chart, one “look inside the storm” image, one honest conclusion."],
], [0.15, 0.33, 0.52]))
st.append(feedback("2", ["Q3. Did we miss any rule or requirement from the challenge page?",
                         "Q4. Slides or video for the demo? Who in the team is best placed to produce it?"]))
st.append(CondPageBreak(90*mm))

# ---------------------------------------------------------------- 3 IDEA
st.append(H1("3. Our idea: three layers of evidence"))
st.append(P("We do not want a tool that only says “temperature is rising” or “rainfall is falling”. We want to investigate "
            "<b>what</b> is changing, <b>how</b> the atmosphere is structured where it changes, and <b>which physical processes</b> "
            "could explain it. We organise the investigation in three connected layers:"))
st.append(Spacer(1, 4)); st.append(layered()); st.append(Spacer(1, 8))
st.append(H2("3.1 Who does what: each data source has one job"))
st.append(table([
    ["Scientific job", "Main source", "Agency", "Purpose"],
    ["Long-term rainfall trend", "GPM IMERG", "NASA", "Change in rain amount and extremes since 2000"],
    ["Long-term rainfall context", "GPCP", "NASA-supported", "Back to 1979; includes the drought years"],
    ["Moisture, temperature, vertical air motion", "MERRA-2", "NASA (reanalysis)", "Possible drivers: more water vapour, stronger uplift"],
    ["Aerosol / dust trends", "MODIS, MERRA-2 aerosol", "NASA", "Changes in dust optical depth"],
    ["Cloud and storm vertical structure", "EarthCARE CPR (radar)", "ESA / JAXA", "Storm height, rain, Doppler vertical velocity"],
    ["Aerosol and thin-cloud vertical structure", "EarthCARE ATLID (lidar)", "ESA / JAXA", "Where the dust sits relative to clouds"],
    ["Cloud microphysics, radiation", "EarthCARE L2 synergy products", "ESA / JAXA", "Particle properties, radiative effect"],
    ["(Option) long vertical record", "CloudSat / CALIPSO", "NASA", "About 17 years of profiles: a NASA bridge to EarthCARE (undecided)"],
], [0.30, 0.22, 0.16, 0.32]))
st.append(Spacer(1, 4))
st.append(box("Important limitation: EarthCARE cannot show long-term change", [
    "EarthCARE was launched in 2024, so its record is about two years long. It <b>cannot</b> tell us that cloud structure has changed over decades. "
    "We use it only to describe today's atmosphere in detail and to check whether that picture is consistent with the mechanisms behind "
    "the long-term NASA trend. Its narrow ground track also means it samples only a thin slice of each storm, so how often it <i>sees</i> "
    "a structure is not the same as how often that structure <i>occurs</i>."], bg=colors.HexColor("#F8EAEA"), edge=RED))
st.append(H2("3.2 What is new about this"))
st.extend(B([
    "<b>From “what” to “why”:</b> the app does not stop at a slope and a p-value. It shows the evidence chain and the uncertainty at every step.",
    "<b>Old and new satellites together:</b> a 25-year NASA record is combined with first-generation EarthCARE Doppler radar and lidar profiles.",
    "<b>Honesty as a feature:</b> an evidence ledger behind every claim, alternative explanations listed, and confidence levels shown to the user.",
]))
st.append(feedback("3", ["Q5. Is the three-layer idea clear? Would a judge with 3–5 minutes understand it?",
                         "Q6. Should we add CloudSat/CALIPSO (NASA) for vertical structure? It strengthens “Relevance” but adds work."]))
st.append(CondPageBreak(90*mm))

# ---------------------------------------------------------------- 4 FLAGSHIP
st.append(H1("4. Flagship investigation: rainfall in the Sahel"))
st.append(H2("4.1 Why the Sahel, and not all of North Africa (decision D-003)"))
st.extend(B([
    "<b>The signal is real and documented.</b> The Sahel went through a severe drought in the 1970s–80s, followed by a partial recovery of rainfall. "
    "Studies also report that extreme storms have become more frequent. That gives us a known result to <b>check our pipeline against</b>. <i>[literature to verify, L-01 to L-03]</i>",
    "<b>The Sahara is a poor place to measure rain trends.</b> Rainfall there is close to zero, so trends are dominated by a few rare events and noise.",
    "<b>It fits Layer 2.</b> Sahelian rain comes mostly from large organised thunderstorm clusters (mesoscale convective systems), which EarthCARE's radar can observe. "
    "Saharan dust layers above them can be seen by its lidar.",
    "<b>It has high impact.</b> Rain-fed agriculture and pastoralism depend on the rainy season; floods follow intense storms. <i>[population figure to verify, E-003]</i>",
]))
st.append(P("The Sahara and the Mediterranean remain available in the app as <b>comparison regions</b>."))
st.append(H2("4.2 Scientific question (decision D-004)"))
st.append(box("Flagship question", [
    "<b>Is rainfall in the Sahel changing in amount and in intensity (extremes) over 2001–2025, and are the moisture, storm structure "
    "and dust we observe consistent with the mechanisms that could explain this change?</b>"], bg=MINT, edge=GREEN))
st.append(H2("4.3 Working hypotheses: what we will test"))
st.append(table([
    ["#", "Hypothesis", "How we test it", "Data"],
    ["H1", "Rainy-season (June–September) total rainfall shows a trend over 2001–2025.", "Seasonal totals, Mann-Kendall + Sen's slope, start-year sensitivity", "GPM IMERG monthly; GPCP for context"],
    ["H2", "Extremes are changing faster than the mean: rain falls in fewer, heavier events.", "Indices: wettest day (Rx1day), very-wet-day share (R95p), intensity per wet day (SDII), wet-day count", "GPM IMERG daily"],
    ["H3", "The air holds more water vapour, which is consistent with warming (about 7% more per °C, the Clausius–Clapeyron relation).", "Trend in total column water vapour and temperature, compared with the rainfall trend", "MERRA-2 (reanalysis)"],
    ["H4", "Today's storms show deep convection with strong updrafts, and dust layers interact with cloud levels.", "Composite vertical profiles: echo-top height, Doppler velocity, dust layer altitude", "EarthCARE CPR, ATLID, L2"],
], [0.05, 0.36, 0.34, 0.25]))
st.append(Spacer(1, 4))
st.append(P("<b>A “no trend” result is a valid result.</b> If H1 or H2 are not significant, we report that honestly. Showing that the tool "
            "<i>refuses</i> to over-claim is part of its scientific value."))
st.append(feedback("4", ["Q7. Do you agree with the Sahel choice? Any local knowledge or contacts (farmers, meteorological services) we could use for the impact story?",
                         "Q8. Are H1–H4 the right hypotheses? Is any of them too ambitious for our timeline?"]))
st.append(CondPageBreak(90*mm))

# ---------------------------------------------------------------- 5 DATA
st.append(H1("5. Data sources"))
st.append(P("All entries are currently <b>CANDIDATES</b>. Each must be checked against its official product page (status VERIFIED) and opened "
            "as a real sample file (status ACQUIRED) before it is used. The live list is in <font face='DVI'>docs/research/dataset_inventory.md</font>."))
st.append(table([
    ["L.", "Dataset", "Agency", "Variables", "Resolution", "Since", "Access"],
    ["1", "GPM IMERG Final, monthly (V07)", "NASA", "Precipitation", "0.1°, monthly", "2000 →", "GES DISC, Giovanni"],
    ["1", "GPM IMERG Final, daily (V07)", "NASA", "Precipitation (for extremes)", "0.1°, daily", "2000 →", "GES DISC"],
    ["1", "MERRA-2", "NASA (reanalysis)", "Temperature, water vapour, humidity, vertical motion", "0.5° × 0.625°", "1980 →", "GES DISC, Giovanni"],
    ["1", "MERRA-2 aerosol", "NASA (reanalysis)", "Dust and total AOD", "0.5° × 0.625°", "1980 →", "GES DISC"],
    ["1", "MODIS L3 (Terra/Aqua)", "NASA", "AOD (Deep Blue over desert), cloud fraction", "1°, monthly", "2000 →", "LAADS, Giovanni"],
    ["1", "GPCP monthly", "NASA-supported", "Precipitation (long context)", "2.5° / 0.5°", "1979 →", "GES DISC"],
    ["1", "AIRS L3", "NASA", "Temperature and humidity profiles", "1°, monthly", "2002 →", "GES DISC"],
    ["2", "EarthCARE CPR", "ESA / JAXA", "Radar reflectivity, Doppler velocity", "along track", "2024 →", "ESA MAAP / OADS"],
    ["2", "EarthCARE ATLID", "ESA / JAXA", "Backscatter, extinction, target class", "along track", "2024 →", "ESA MAAP / OADS"],
    ["2", "EarthCARE L2 synergy", "ESA / JAXA", "Cloud/aerosol properties, radiative fluxes", "along track", "2024 →", "ESA MAAP / OADS"],
    ["2", "CloudSat / CALIPSO (option)", "NASA", "Cloud and aerosol profiles", "along track", "2006–2023", "GES DISC / ASDC"],
], [0.04, 0.22, 0.12, 0.25, 0.13, 0.10, 0.14]))
st.append(Spacer(1, 4))
st.append(P("<i>Resolutions and coverage dates above come from our preliminary research and will be confirmed during verification.</i>", "small"))
st.append(H2("5.1 Things to keep in mind about the data"))
st.extend(B([
    "<b>MERRA-2 is a reanalysis:</b> a weather model constrained by observations. It is not a direct measurement, so we label it that way everywhere.",
    "<b>GPM IMERG merges many satellites</b> calibrated with rain gauges. Gauges are sparse in the Sahel, so uncertainty is higher there. Changes in the satellite constellation over time could create artificial trends.",
    "<b>Different grids:</b> datasets must be put on a common grid and time step before comparison (“harmonisation”).",
    "<b>Access:</b> the team already has <b>NASA Earthdata Login</b> and <b>ESA EarthCARE</b> accounts. Do not commit credentials to the repository.",
]))
st.append(feedback("5", ["Q9. Has anyone already worked with any of these datasets or tools (Giovanni, xarray, NetCDF/HDF5)?",
                         "Q10. Any NASA dataset we should add or drop?"]))
st.append(CondPageBreak(90*mm))

# ---------------------------------------------------------------- 6 METHODS
st.append(H1("6. Methods and statistics"))
st.append(H2("6.1 The pipeline, from question to explanation"))
st.append(flow(["1<br/>Define", "2<br/>Acquire", "3<br/>Prepare", "4<br/>Trend", "5<br/>Profiles", "6<br/>Explain", "7<br/>Report"],
               [NAVY, NAVY, NAVY, BLUE, BLUE, GREEN, GREEN], fs=7.6))
st.append(Spacer(1, 5))
st.append(table([
    ["Step", "What happens"],
    ["1 Define", "Region box, time period, variable, season, hypothesis"],
    ["2 Acquire", "Download NASA and EarthCARE files; record source, version, resolution, units, quality flags"],
    ["3 Harmonise", "Missing values, common grid, monthly or seasonal aggregation, unit conversion, area-weighted regional mean"],
    ["4 Detect trend", "Statistical tests below, with significance and confidence intervals"],
    ["5 Vertical structure", "EarthCARE profiles over the region: storm height, Doppler velocity, dust layers"],
    ["6 Mechanisms", "Compare variables (rain vs moisture vs dust), check consistency with physics and literature"],
    ["7 Report", "Charts, maps, profiles, statistics, and an interpretation with its confidence level"],
], [0.2, 0.8]))
st.append(H2("6.2 Statistical toolbox"))
st.append(table([
    ["Method", "What it tells us", "Plain-language meaning"],
    ["Linear regression", "Direction and rate of change", "“The line goes up by X mm per decade.”"],
    ["Mann-Kendall test (seasonal and autocorrelation-corrected variants)", "Is there a consistent upward or downward trend that is unlikely to be chance?", "“Values tend to be higher later than earlier, more often than chance would give.”"],
    ["Sen's slope", "Robust size of the trend", "“The typical rate of change, not thrown off by one extreme year.”"],
    ["Confidence intervals", "Uncertainty around the trend", "“The true rate is probably between A and B.”"],
    ["Seasonal decomposition", "Separates the yearly cycle from the long-term change", "“Remove the normal wet/dry season to see the real change.”"],
], [0.27, 0.36, 0.37]))
st.append(H2("6.3 Traps we must avoid"))
st.extend(B([
    "<b>Seasonality:</b> the Sahel rains mostly in June–September. Monthly trends without handling the season are misleading.",
    "<b>Autocorrelation:</b> one year tends to resemble the next. This makes standard tests over-confident, so we use corrected tests.",
    "<b>Start-year sensitivity:</b> starting during the drought makes any trend look like an increase. We will show how the result changes with the start year (no cherry-picking).",
    "<b>Multiple testing:</b> testing many grid cells means some will look “significant” by chance. Maps will use a correction such as the false discovery rate (FDR).",
    "<b>Significant does not mean important or causal:</b> statistical significance is not physical meaning, and correlation is not causation.",
]))
st.append(P("<b>Still open (D-007):</b> the exact set of extreme-rain indices and the precise test variant.", "small"))
st.append(feedback("6", ["Q11. Is anything in the statistics section unclear? Which terms should we explain better in the app?",
                         "Q12. Who wants to own the statistics module (tests, uncertainty, sensitivity)?"]))
st.append(CondPageBreak(90*mm))

# ---------------------------------------------------------------- 7 RIGOR
st.append(H1("7. Scientific rigor rules"))
st.append(P("These six rules are <b>non-negotiable</b>. They protect our Validity score and our credibility."))
st.append(table([
    ["#", "Rule", "In practice"],
    ["1", "No invented observations", "Every number, chart and claim must trace back to a real file and version."],
    ["2", "Correlation is not causation", "We write “consistent with” and “may contribute to”, never “causes”, unless the literature firmly establishes it."],
    ["3", "Never ignore uncertainty", "Every trend comes with a p-value, a confidence interval and its limitations."],
    ["4", "Never mix incompatible measurements", "Check resolution, coverage, units and definitions before comparing."],
    ["5", "Never extrapolate EarthCARE backwards", "Its 2024+ record describes the present, not the past."],
    ["6", "A model is not an observation", "MERRA-2 is labelled as a reanalysis everywhere."],
], [0.05, 0.33, 0.62]))
st.append(H2("7.1 The evidence ledger"))
st.append(P("Every claim we show goes into <font face='DVI'>docs/research/evidence_ledger.md</font> with: the claim · dataset and variables · "
            "period and region · statistical evidence · supporting publications · alternative explanations · limitations and confidence · "
            "status (TO-VERIFY → VERIFIED → USED)."))
st.append(P("Literature follows the same rule: a paper is only cited once someone has actually read it (status READ in "
            "<font face='DVI'>docs/research/literature.md</font>)."))
st.append(feedback("7", ["Q13. Are these rules practical for a hackathon pace? Any rule you would change?"]))

# ---------------------------------------------------------------- 8 APP
st.append(CondPageBreak(90*mm))
st.append(H1("8. The application"))
st.append(H2("8.1 User journey"))
st.append(flow(["Choose variable", "Pick region", "Choose period &amp; season", "See time series", "Trend + significance", "Deep-dive investigation"],
               [NAVY, NAVY, NAVY, BLUE, BLUE, GREEN], fs=8))
st.append(Spacer(1, 6))
st.append(P("Steps 1–5 cover the mandatory challenge flow and work for any region and variable we support. Step 6 is our "
            "<b>investigation mode</b>: vertical profiles, linked variables, and an interpretation card showing its confidence level."))
st.append(H2("8.2 Architecture (decision D-005)"))
st.append(table([
    ["Component", "Choice for the MVP", "Later, if time allows"],
    ["Front-end", "Light JavaScript web page (map, controls, Plotly charts)", "Richer UI framework (React)"],
    ["Backend / API", "Python FastAPI", "Unchanged"],
    ["Science core", "<font face='DVI'>src/earth_detective</font>: data access, harmonisation, trend statistics (xarray, pandas, NumPy, SciPy, pymannkendall)", "Unchanged"],
    ["Data", "Pre-processed regional files (NetCDF / Parquet) plus small on-demand requests", "Object storage, PostGIS"],
    ["Prototyping", "Jupyter notebooks first, then move stable code into the library", "—"],
    ["Deployment", "One public host (link with no login, required by the rules)", "Docker"],
], [0.18, 0.50, 0.32]))
st.append(Spacer(1, 4))
st.append(P("<b>Why keep it light:</b> judges see a public link plus ≤7 slides or ≤30 seconds of video. A small app that works and is honest beats a large platform that is half built."))
st.append(feedback("8", ["Q14. Who has front-end skills? Do you have a preferred hosting option for a free public link?",
                         "Q15. Which variables beyond precipitation should the general tool offer at launch (temperature, AOD, water vapour…)?"]))
st.append(CondPageBreak(90*mm))

# ---------------------------------------------------------------- 9 ROADMAP
st.append(H1("9. Roadmap and demo plan"))
st.append(H2("9.1 Phases: each one produces something testable"))
st.append(table([
    ["Phase", "Deliverable", "“Done” means", "Status"],
    ["01 Scientific framing", "Question, hypotheses, region, variables", "Decision log agreed by the team (this document)", "IN PROGRESS"],
    ["02 Data acquisition", "Working NASA (and EarthCARE) retrieval", "One real Sahel IMERG sample opened; variables, units and flags confirmed", "NEXT"],
    ["03 Trend analysis", "Trend detection + statistical validation", "Notebook reproduces the Sahel rainfall series with tests and sensitivity", "TO DO"],
    ["04 Data fusion", "Vertical structure + interpretation", "EarthCARE composite profiles + evidence ledger rows filled", "TO DO"],
    ["05 Application", "Public app + report generation", "Anyone can run steps 1–5 from a public link", "TO DO"],
    ["06 Submission", "Demo (≤7 slides / ≤30 s), write-up, NASA data list, AI log", "All submission form fields complete", "TO DO"],
], [0.20, 0.29, 0.38, 0.13]))
st.append(H2("9.2 Draft 7-slide demo storyline"))
st.append(table([
    ["Slide", "Content"],
    ["1", "Title + one-line hook: “Is the Sahel's rain changing, and what is happening inside the storms?”"],
    ["2", "Why it matters: people, farming, floods (verified figures only)"],
    ["3", "The app: variable → region → period → trend → significance (screenshot)"],
    ["4", "<b>Main chart:</b> Sahel rainfall and extremes, 2001–2025, with trend, confidence interval and significance"],
    ["5", "Inside the storm: EarthCARE vertical profile of a Sahel convective system and its dust layer"],
    ["6", "Interpretation: what is consistent, what is uncertain, alternative explanations"],
    ["7", "Impact and next steps + NASA data used + AI-use statement"],
], [0.1, 0.9]))
st.append(feedback("9", ["Q16. What are your availability and preferred role (science, data, backend, front-end, design/story, submission)?",
                         "Q17. What is the real deadline we are working towards, and is this roadmap realistic for it?"]))
st.append(CondPageBreak(90*mm))

# ---------------------------------------------------------------- 10 DECISIONS
st.append(H1("10. Decisions made, open decisions, risks"))
st.append(H2("10.1 Decision log (summary of docs/decisions/DECISIONS.md)"))
st.append(table([
    ["ID", "Decision", "Status"],
    ["D-001", "Product = general trend tool (5 required steps) + flagship case study", "ACCEPTED"],
    ["D-002", "NASA data carries all trend analysis; EarthCARE complements it and is labelled ESA/JAXA", "ACCEPTED"],
    ["D-003", "Flagship region = Sahel; Sahara and Mediterranean kept as comparison regions", "ACCEPTED"],
    ["D-004", "Flagship = rainfall amount + extremes; dust/aerosol is the backup track", "ACCEPTED"],
    ["D-005", "MVP stack = FastAPI + light JS front-end; PostGIS, React and Docker deferred", "ACCEPTED"],
    ["D-006", "Main period 2001–2025 (IMERG); GPCP and MERRA-2 for long context; EarthCARE 2024–2025", "PROPOSED"],
], [0.1, 0.72, 0.18]))
st.append(H2("10.2 Open decisions: your input is welcome"))
st.append(table([
    ["ID", "Question", "Current leaning"],
    ["D-003b", "Exact Sahel bounding box (and comparison boxes)", "About 10°N–20°N, 18°W–20°E, to be checked against literature definitions"],
    ["D-006", "Confirm the analysis period", "2001–2025 main period, with a start-year sensitivity test"],
    ["D-007", "Extreme-rain indices and test variant", "Rx1day, R95p, SDII, wet-day count; seasonal or modified Mann-Kendall"],
    ["D-008", "Add CloudSat/CALIPSO (NASA) for vertical structure?", "Leaning yes if time allows (strengthens Relevance)"],
    ["—", "Team roles and deadline", "Needed now"],
], [0.1, 0.45, 0.45]))
st.append(H2("10.3 Main risks"))
st.append(table([
    ["Risk", "Impact", "Mitigation"],
    ["Data download and processing take longer than expected", "High", "Start with monthly regional means and the Giovanni / GES DISC subsetting services before full-resolution files"],
    ["No significant trend found", "Medium", "Valid result: report honestly, show sensitivity, and lean on extremes and the investigation layers"],
    ["EarthCARE products hard to access or interpret", "Medium", "Begin with a few overpasses only; fall back to CloudSat/CALIPSO or MERRA-2 vertical fields"],
    ["Over-claiming causation", "High (Validity)", "Rigor rules + evidence ledger + “consistent with” wording"],
    ["Scope creep", "High", "MVP first; every phase must produce something testable"],
    ["Breaking submission rules (AI use, NASA branding, public link)", "Disqualification", "AI log, no NASA logos in generated content, test the link in a private browser window"],
], [0.38, 0.17, 0.45]))
st.append(feedback("10", ["Q18. Which open decision do you have an opinion on? Which risk worries you most?"]))
st.append(PageBreak())

# ---------------------------------------------------------------- 11 QUESTIONNAIRE
st.append(H1("11. Feedback questionnaire"))
st.append(P("Please answer what you can and skip what you can't. Short answers are fine. Send them back as a message, a comment, "
            "or edits in the shared document, using the question number."))
qs = [
    ("Understanding", ["Rate how clearly you understand the project (1 = lost, 5 = could present it).",
                       "Which section was hardest to follow, and why?",
                       "Which terms in the glossary (§12) were new to you?"]),
    ("Science", ["Do you agree with Sahel + rainfall extremes as the flagship? If not, what would you choose?",
                 "Which hypothesis (H1–H4) is the most and the least convincing?",
                 "Is there any claim in this document you think is wrong or needs a source?"]),
    ("Product", ["What would you, as a user, expect to see first when opening the app?",
                 "Which feature should we cut if we run out of time?"]),
    ("Team & logistics", ["Your preferred role(s) and weekly availability.",
                          "Skills you bring (Python, statistics, web, design, video, writing, domain knowledge).",
                          "Deadline and any constraints we should plan around."]),
    ("Judging", ["Which judging criterion (Impact, Creativity, Validity, Relevance, Presentation) do you think is our weakest today?",
                 "One idea that would make the project stand out."]),
]
for title, items in qs:
    st.append(KeepTogether([H3(title)] + [Paragraph(i, S["bullet"], bulletText="□") for i in items]))
st.append(Spacer(1, 6))
st.append(box("How we will process feedback", B([
    "All feedback is collected and summarised. Every change to a decision becomes a new entry in DECISIONS.md, so nothing is silently overwritten.",
    "Disagreements on scientific choices are settled with evidence (data or literature), not majority vote.",
    "A version v0.2 of this briefing will be issued with the outcomes.",
])))
st.append(PageBreak())

# ---------------------------------------------------------------- 12 GLOSSARY
st.append(H1("12. Glossary"))
st.append(table([
    ["Term", "Meaning"],
    ["Sahel", "Semi-arid belt south of the Sahara, stretching from Senegal towards Sudan. It has one rainy season (about June–September)."],
    ["Trend", "A long-term, persistent change in a variable, as opposed to year-to-year ups and downs."],
    ["Statistical significance / p-value", "How unlikely the observed trend would be if there were really no trend. p < 0.05 is a common threshold."],
    ["Mann-Kendall test", "A test for a consistent upward or downward trend that does not assume a straight line or normally distributed data."],
    ["Sen's slope", "The median of all pairwise slopes: a robust estimate of the rate of change."],
    ["Autocorrelation", "When one value resembles the previous one (wet years following wet years). Ignoring it exaggerates significance."],
    ["Confidence interval", "A range that probably contains the true value (for example 95%)."],
    ["Reanalysis (MERRA-2)", "A weather model run over past decades and continuously corrected with observations. Complete in space and time, but not a pure measurement."],
    ["GPM IMERG", "NASA's merged multi-satellite precipitation product, about 10 km resolution, available from 2000."],
    ["GPCP", "Global Precipitation Climatology Project: a long, coarse-resolution precipitation record from 1979."],
    ["MODIS", "Imaging instrument on NASA's Terra and Aqua satellites (aerosols, clouds…)."],
    ["AOD (aerosol optical depth)", "How much the aerosols (dust, smoke, pollution) in a column of air dim sunlight."],
    ["EarthCARE", "ESA–JAXA satellite launched in 2024 carrying a cloud radar, a lidar, an imager and a radiometer."],
    ["CPR (Cloud Profiling Radar)", "EarthCARE radar. It sees inside clouds and rain, and its Doppler capability measures vertical motion of particles."],
    ["ATLID", "EarthCARE lidar (laser). It sees aerosol layers and thin clouds."],
    ["Doppler velocity", "Speed of particles towards or away from the radar, which reveals updrafts and falling rain."],
    ["MCS (mesoscale convective system)", "A large organised cluster of thunderstorms, hundreds of km across. It brings most Sahel rain."],
    ["Convection", "Warm, moist air rising, forming tall storm clouds."],
    ["Clausius–Clapeyron", "A physical law: warmer air can hold about 7% more water vapour per °C, which can intensify heavy rain."],
    ["Rx1day / R95p / SDII", "Extreme-rain indices: wettest day of the season / rain from very wet days (above the 95th percentile) / average rain per wet day."],
    ["Harmonisation", "Putting datasets on the same grid, time step and units so they can be compared."],
    ["Evidence ledger", "Our table that links every claim to its data, statistics, sources, alternatives and confidence."],
], [0.3, 0.7]))

# ---------------------------------------------------------------- APPENDIX
st.append(H1("Appendix: workspace and references"))
st.append(H2("A. Where things live"))
st.append(table([
    ["Path", "Content"],
    ["README.md", "Project overview"],
    ["docs/challenge/", "Original brief, judging criteria, submission rules, CHALLENGE_SUMMARY.md"],
    ["docs/decisions/DECISIONS.md", "Decision log: read this first"],
    ["docs/research/", "project_framework.md, dataset_inventory.md, evidence_ledger.md, literature.md"],
    ["docs/submission/", "si_usage.md (AI log, everyone fills it), nasa_data_used.md"],
    ["notebooks/", "Scientific prototypes"],
    ["src/earth_detective/", "Core Python library"],
    ["data/raw, data/processed", "Local data (not committed)"],
    ["outputs/figures/", "Charts and maps for the app and slides"],
], [0.32, 0.68]))
st.append(H2("B. Reference shortlist (all TO-VERIFY: not yet read by the team, do not cite yet)"))
st.extend(B([
    "L-01 Nicholson (2013). The West African Sahel: a review of recent studies on the rainfall regime and its interannual variability. <i>ISRN Meteorology.</i>",
    "L-02 Biasutti (2019). Rainfall trends in the African Sahel: characteristics, processes, and causes. <i>WIREs Climate Change.</i>",
    "L-03 Taylor et al. (2017). Frequency of extreme Sahelian storms tripled since 1982. <i>Nature.</i>",
    "L-04 Huffman et al. GPM IMERG Algorithm Theoretical Basis Document / technical documentation (V07).",
    "L-05 Gelaro et al. (2017). The Modern-Era Retrospective Analysis for Research and Applications, Version 2 (MERRA-2). <i>Journal of Climate.</i>",
    "L-06 Wehr et al. (2023). The EarthCARE mission – science and system overview. <i>Atmospheric Measurement Techniques.</i>",
    "L-07 Hamed &amp; Rao (1998). A modified Mann-Kendall trend test for autocorrelated data. <i>Journal of Hydrology.</i>",
]))
st.append(Spacer(1, 8))
st.append(box("AI-use statement (Space Apps policy)", [
    "This briefing was drafted with AI assistance (Claude Code, Anthropic), based on the team's own research plan and the challenge "
    "material. It is logged in docs/submission/si_usage.md and acknowledged in the PDF metadata. It contains no NASA logos or branding. "
    "All scientific claims marked TO-VERIFY must be checked by a team member before they are used."], bg=colors.HexColor("#F1F1F4"), edge=GREY))

doc.build(st)
print("ok", OUT)

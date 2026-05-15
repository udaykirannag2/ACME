"use strict";
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");

const C = {
  navy: "1e293b", navyDark: "0f172a",
  blue: "2563eb", blueLight: "dbeafe",
  green: "16a34a", greenLight: "dcfce7",
  red: "dc2626", redLight: "fee2e2",
  amber: "f59e0b", amberLight: "fef3c7",
  white: "FFFFFF", bgLight: "f8fafc", bgGray: "f1f5f9",
  text: "1e293b", textMid: "334155", muted: "64748b",
  border: "e2e8f0",
};

const FH = "Calibri";
const FB = "Calibri";
const OUT = path.join(__dirname, "Finance-Glossary-Quick-Reference.pptx");
fs.mkdirSync(__dirname, { recursive: true });

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "ACME Finance Course";
pres.title = "Finance Glossary Quick Reference";

const sh = () => ({ type: "outer", blur: 5, offset: 2, angle: 135, color: "000000", opacity: 0.1 });

function titleBar(s, text, dark = false) {
  s.background = { color: dark ? C.navy : C.bgLight };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.05, fill: { color: C.blue }, line: { color: C.blue } });
  s.addText(text, { x: 0.38, y: 0.35, w: 9.0, h: 0.62, fontSize: 22, bold: true, color: dark ? C.white : C.navy, fontFace: FH, margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.38, y: 0.82, w: 9.0, h: 0.02, fill: { color: dark ? "334155" : C.border }, line: { color: dark ? "334155" : C.border } });
}

function footer(s, text) {
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.31, w: 10, h: 0.315, fill: { color: C.bgGray }, line: { color: C.border } });
  s.addText(text, { x: 0.38, y: 5.325, w: 9.0, h: 0.29, fontSize: 8.5, italic: true, color: C.muted, fontFace: FB, valign: "middle", margin: 0 });
}

// Slide 1: Title
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.blue }, line: { color: C.blue } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 0.8, w: 0.07, h: 3.8, fill: { color: C.blue }, line: { color: C.blue } });
  s.addText("Finance Glossary\nQuick Reference", { x: 0.7, y: 0.85, w: 8.5, h: 2.0, fontSize: 44, bold: true, color: C.white, fontFace: FH, valign: "top" });
  s.addText("AI Finance Transformation: Strategy to Working Agents on AWS", { x: 0.7, y: 2.9, w: 8.5, h: 0.5, fontSize: 14, color: "94a3b8", fontFace: FB });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 3.5, w: 2.8, h: 0.38, fill: { color: C.green }, line: { color: C.green }, shadow: sh() });
  s.addText("Section 2 Artifact", { x: 0.7, y: 3.5, w: 2.8, h: 0.38, fontSize: 11, bold: true, color: C.white, fontFace: FH, align: "center", valign: "middle", margin: 0 });
  s.addText("ACME Finance Course", { x: 0.7, y: 4.0, w: 5, h: 0.35, fontSize: 12, color: "64748b", fontFace: FB });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.33, w: 10, h: 0.295, fill: { color: "0f172a" }, line: { color: "0f172a" } });
  s.addText("Keep this open while working through the course labs", { x: 0.38, y: 5.335, w: 9.0, h: 0.28, fontSize: 9, italic: true, color: "64748b", fontFace: FB, valign: "middle", margin: 0 });
}

// Slide 2: Finance Org
{
  const s = pres.addSlide();
  titleBar(s, "Understanding the Finance Organization");
  const colX = [0.38, 2.1, 5.3];
  const colW = [1.65, 3.05, 4.27];
  ["Role", "Owns", "Relevant to AI Build"].forEach((h, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: colX[i], y: 0.84, w: colW[i], h: 0.38, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(h, { x: colX[i], y: 0.84, w: colW[i], h: 0.38, fontSize: 10, bold: true, color: C.white, fontFace: FH, align: "center", valign: "middle", margin: 4 });
  });
  const rows = [
    { role: "CFO", owns: "Budget, strategy,\nboard reporting", ai: "Business case sponsor", hl: false },
    { role: "FP&A\n(Financial Planning\n& Analysis)", owns: "Budgeting, forecasting,\nvariance analysis,\nmanagement reporting", ai: "PRIMARY USERS of\nwhat we build", hl: true },
    { role: "Accounting /\nController", owns: "Close the books,\nGL entries, compliance", ai: "Source of actuals data\n(fct_gl_entries)", hl: false },
    { role: "Treasury", owns: "Cash management,\nAR collection", ai: "AR aging data\nconsumers", hl: false },
    { role: "Tax", owns: "Tax provision, filings", ai: "Out of scope for\nPhase 1–8", hl: false }
  ];
  rows.forEach((row, ri) => {
    const y = 1.22 + ri * 0.72, h = 0.68, bg = row.hl ? C.greenLight : (ri % 2 === 0 ? C.white : "f8fafc");
    [0, 1, 2].forEach(ci => s.addShape(pres.shapes.RECTANGLE, { x: colX[ci], y, w: colW[ci], h, fill: { color: bg }, line: { color: C.border } }));
    [row.role, row.owns, row.ai].forEach((txt, ci) => s.addText(txt, { x: colX[ci] + 0.06, y: y + 0.04, w: colW[ci] - 0.12, h: h - 0.08, fontSize: row.hl ? 9.5 : 9, bold: row.hl && ci === 2, color: row.hl ? "14532d" : C.textMid, fontFace: FB, valign: "middle" }));
  });
  footer(s, "We are building for FP&A. Everything else is context.");
}

// Slide 3: Three Financial Statements
{
  const s = pres.addSlide();
  titleBar(s, "Three Financial Statements Every Architect Should Know");
  const cards = [
    { title: "P&L / Income Statement", color: C.green, light: C.greenLight, dark: "14532d", items: ["Revenue", "− Cost of Goods Sold (COGS)", "= Gross Profit", "− Operating Expenses (OpEx)", "  • Sales & Marketing", "  • R&D", "  • G&A", "= Operating Income"], mart: "ACME mart: mart_pl" },
    { title: "Balance Sheet", color: C.blue, light: C.blueLight, dark: "1e3a8a", items: ["Snapshot at a point in time", "Assets vs Liabilities", " ", "Assets: Cash, AR, Property", "Liabilities: AP, Debt", "Equity: Assets − Liabilities", " ", "Key: AR balance, DSO"], mart: "ACME mart: mart_ar_aging" },
    { title: "Cash Flow Statement", color: C.amber, light: C.amberLight, dark: "78350f", items: ["When cash actually moves", "(differs from P&L recognition)", " ", "Operating: Cash from core biz", "Investing: CapEx, acquisitions", "Financing: Debt, equity", " ", "Key: Free Cash Flow"], mart: "ACME mart: Not modeled Phase 1–8" }
  ];
  const colX = [0.38, 3.56, 6.74], colW = 3.0;
  cards.forEach((card, ci) => {
    const x = colX[ci];
    s.addShape(pres.shapes.RECTANGLE, { x, y: 0.84, w: colW, h: 4.3, fill: { color: C.white }, line: { color: C.border }, shadow: sh() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 0.84, w: colW, h: 0.44, fill: { color: card.color }, line: { color: card.color } });
    s.addText(card.title, { x: x + 0.1, y: 0.84, w: colW - 0.2, h: 0.44, fontSize: 10.5, bold: true, color: C.white, fontFace: FH, valign: "middle", margin: 0 });
    card.items.forEach((item, ii) => s.addText(item, { x: x + 0.12, y: 1.32 + ii * 0.265, w: colW - 0.24, h: 0.26, fontSize: 8.5, bold: item.startsWith("="), color: item.startsWith("=") ? card.dark : C.textMid, fontFace: FB, valign: "middle" }));
    s.addShape(pres.shapes.RECTANGLE, { x, y: 4.8, w: colW, h: 0.34, fill: { color: card.light }, line: { color: card.color } });
    s.addText(card.mart, { x: x + 0.08, y: 4.8, w: colW - 0.16, h: 0.34, fontSize: 8, bold: true, color: card.dark, fontFace: "Consolas", valign: "middle", margin: 0 });
  });
  footer(s, "P&L is the primary report for Phases 1–8.");
}

// Slide 4: Core P&L Metrics
{
  const s = pres.addSlide();
  titleBar(s, "Core P&L Metrics — Memorize These");
  const colX = [0.38, 2.0, 5.15], colW = [1.55, 3.0, 2.1];
  ["Metric", "Formula", "Typical SaaS Range"].forEach((h, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: colX[i], y: 0.84, w: colW[i], h: 0.36, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(h, { x: colX[i], y: 0.84, w: colW[i], h: 0.36, fontSize: 9, bold: true, color: C.white, fontFace: FH, align: "center", valign: "middle", margin: 3 });
  });
  const rows = [["Revenue", "Sum of subscription + services", "N/A"], ["COGS", "Direct cost of product (hosting, support)", "15–30%"], ["Gross Profit", "Revenue − COGS", "70–85%"], ["Gross Margin %", "Gross Profit / Revenue × 100", "70–85%"], ["Total OpEx", "S&M + R&D + G&A", "80–120%"], ["Op Income", "Gross Profit − OpEx", ">15% target"], ["Op Margin %", "Op Income / Revenue × 100", "ACME: −9.4%"], ["EBITDA", "Op Income + D&A", "Cash proxy"]];
  rows.forEach((row, ri) => {
    const y = 1.2 + ri * 0.44, h = 0.42, bg = ri === 3 ? C.greenLight : ri === 6 ? "fef9c3" : (ri % 2 === 0 ? C.white : "f8fafc");
    row.forEach((cell, ci) => {
      s.addShape(pres.shapes.RECTANGLE, { x: colX[ci], y, w: colW[ci], h, fill: { color: bg }, line: { color: C.border } });
      s.addText(cell, { x: colX[ci] + 0.06, y: y + 0.02, w: colW[ci] - 0.12, h: h - 0.04, fontSize: 8, bold: ci === 0, color: ri === 3 ? "14532d" : ri === 6 ? "713f12" : C.textMid, fontFace: ci === 0 ? FH : FB, valign: "middle" });
    });
  });
  s.addShape(pres.shapes.RECTANGLE, { x: 7.45, y: 0.84, w: 2.17, h: 4.66, fill: { color: C.navy }, line: { color: C.blue }, shadow: sh() });
  s.addText("ACME FY2024", { x: 7.55, y: 0.9, w: 1.97, h: 0.35, fontSize: 10, bold: true, color: C.white, fontFace: FH, align: "center" });
  s.addShape(pres.shapes.RECTANGLE, { x: 7.55, y: 1.25, w: 1.97, h: 0.02, fill: { color: "334155" }, line: { color: "334155" } });
  [{ l: "Revenue", v: "$1.81B", c: C.white }, { l: "Gross Margin", v: "77.5%", c: "86efac" }, { l: "Op Margin", v: "−9.4%", c: "fca5a5" }].forEach((x, i) => {
    s.addText(x.l, { x: 7.55, y: 1.35 + i * 0.7, w: 1.97, h: 0.28, fontSize: 8, color: "94a3b8", fontFace: FB, align: "center" });
    s.addText(x.v, { x: 7.55, y: 1.6 + i * 0.7, w: 1.97, h: 0.35, fontSize: 15, bold: true, color: x.c, fontFace: FH, align: "center" });
  });
  s.addShape(pres.shapes.RECTANGLE, { x: 7.45, y: 3.8, w: 2.17, h: 0.9, fill: { color: "0c1a2e" }, line: { color: "1d4ed8" } });
  s.addText("R&D −15%\nWhat-If", { x: 7.52, y: 3.84, w: 2.03, h: 0.32, fontSize: 8, bold: true, color: "93c5fd", fontFace: FH, align: "center" });
  s.addText("+348 bps margin\n+$62.9M op income", { x: 7.52, y: 4.2, w: 2.03, h: 0.48, fontSize: 8.5, color: "a3e635", fontFace: FB, align: "center" });
  footer(s, "Gross Margin & Operating Margin drive every FP&A conversation.");
}

// Slide 5: SaaS Metrics
{
  const s = pres.addSlide();
  titleBar(s, "SaaS Metrics — What Makes B2B SaaS Finance Different");
  const colX = [0.38, 1.18, 3.42, 6.52], colW = [0.72, 2.12, 2.98, 3.1];
  ["Metric", "Full Name", "Formula", "Why It Matters"].forEach((h, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: colX[i], y: 0.84, w: colW[i], h: 0.36, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(h, { x: colX[i], y: 0.84, w: colW[i], h: 0.36, fontSize: 9, bold: true, color: C.white, fontFace: FH, align: "center", valign: "middle", margin: 3 });
  });
  const rows = [["ARR", "Annual Recurring Revenue", "Sum of subscriptions annualized", "Primary growth metric"], ["MRR", "Monthly Recurring Revenue", "ARR / 12", "Operational tracking"], ["NRR", "Net Revenue Retention", "(Beg ARR + Exp − Churn) / Beg", "Holy grail: >100%"], ["GRR", "Gross Revenue Retention", "(Beg − Churn) / Beg ARR", "Floor of NRR"], ["Churn", "Revenue Churn Rate", "Churned ARR / Beg ARR", "Customer loss %"], ["CAC", "Customer Acq Cost", "S&M spend / new customers", "Growth efficiency"], ["LTV", "Customer Lifetime Value", "ARR × GM% / Churn", "LTV/CAC > 3 healthy"], ["DSO", "Days Sales Outstanding", "(AR / Revenue) × days", "Collection speed"]];
  rows.forEach((row, ri) => {
    const y = 1.2 + ri * 0.475, h = 0.45, hl = ri === 2, bg = hl ? C.greenLight : (ri % 2 === 0 ? C.white : "f8fafc");
    row.forEach((cell, ci) => {
      s.addShape(pres.shapes.RECTANGLE, { x: colX[ci], y, w: colW[ci], h, fill: { color: bg }, line: { color: C.border } });
      s.addText(cell, { x: colX[ci] + 0.05, y: y + 0.02, w: colW[ci] - 0.1, h: h - 0.04, fontSize: 7.5, bold: ci === 0 || (hl && ci === 3), color: hl ? "14532d" : C.textMid, fontFace: ci === 0 ? FH : FB, valign: "middle" });
    });
  });
  footer(s, "ACME fct_arr tracks all movements monthly: new, expansion, contraction, churn");
}

// Slide 6: FP&A Calendar
{
  const s = pres.addSlide();
  titleBar(s, "The FP&A Calendar — What Finance Teams Do Every Month");
  const cols = [{ freq: "ANNUAL", color: C.amber, title: "Annual Planning", items: ["Set targets, budgets, headcount", "Output: stg_epm__plan_line", "AI: forecast baseline, what-if"] }, { freq: "MONTHLY", color: C.blue, title: "Month-End Close & Report", items: ["Close (3–5d): GL finalized", "Flash (d3–5): Revenue vs budget", "Variance (d7–10): By entity/dept", "Commentary: AI drafts numbers"] }, { freq: "QUARTERLY", color: C.green, title: "Board Package", items: ["Full P&L, ARR, AR aging, forecast", "AI: all dashboards + analyst", "Audience: Board, investors"] }];
  const colX = [0.38, 3.56, 6.74], colW = 3.0;
  cols.forEach((col, ci) => {
    const x = colX[ci];
    s.addShape(pres.shapes.RECTANGLE, { x, y: 0.84, w: colW, h: 4.3, fill: { color: C.white }, line: { color: C.border }, shadow: sh() });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.12, y: 0.94, w: 0.9, h: 0.28, fill: { color: col.color }, line: { color: col.color } });
    s.addText(col.freq, { x: x + 0.12, y: 0.94, w: 0.9, h: 0.28, fontSize: 7.5, bold: true, color: C.white, fontFace: FH, align: "center", valign: "middle", margin: 0 });
    s.addText(col.title, { x: x + 0.12, y: 1.28, w: colW - 0.24, h: 0.42, fontSize: 10, bold: true, color: C.navy, fontFace: FH });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.12, y: 1.7, w: colW - 0.24, h: 0.02, fill: { color: C.border }, line: { color: C.border } });
    col.items.forEach((item, ii) => {
      const iy = 1.78 + ii * 0.6;
      s.addShape(pres.shapes.OVAL, { x: x + 0.12, y: iy + 0.06, w: 0.18, h: 0.18, fill: { color: col.color }, line: { color: col.color } });
      s.addText(item, { x: x + 0.38, y: iy, w: colW - 0.5, h: 0.56, fontSize: 8, color: C.textMid, fontFace: FB, valign: "top" });
    });
  });
  footer(s, "We automate data retrieval inside these steps — not the steps themselves");
}

// Slide 7: Finance Data Vocab
{
  const s = pres.addSlide();
  titleBar(s, "Finance Data Vocabulary for ACME Codebase");
  const colX = [0.38, 1.88, 5.8], colW = [1.42, 3.78, 3.42];
  ["Term", "Definition", "ACME Location"].forEach((h, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: colX[i], y: 0.84, w: colW[i], h: 0.33, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(h, { x: colX[i], y: 0.84, w: colW[i], h: 0.33, fontSize: 9, bold: true, color: C.white, fontFace: FH, align: "center", valign: "middle", margin: 3 });
  });
  const rows = [["Fiscal Year", "Company's 12-month accounting period", "fiscal_year in marts"], ["Period (YYYYMM)", "6-digit month ID (e.g., 202403)", "period_yyyymm key"], ["Chart of Accounts", "Master taxonomy: revenue, COGS, OpEx", "account_id in fct_gl_entries"], ["Cost Center", "Org unit incurring costs", "Used in variance-rca"], ["Entity", "Geographic subsidiary (US/EMEA/APAC)", "entity_id grouping"], ["Actuals", "Real results (what happened)", "fct_gl_entries truth"], ["Plan/Budget", "Targets (what was expected)", "stg_epm__plan_line"], ["Variance", "Actuals − Plan", "variance-rca Lambda"], ["GL Entry", "Journal entry in GL", "fct_gl_entries rows"], ["AR", "Money owed by customers", "mart_ar_aging"], ["Aging Bucket", "AR by days overdue", "0-30, 31-60, 61-90, 90+"], ["ARR Movement", "Monthly ARR change", "fct_arr movement_type"]];
  rows.forEach((row, ri) => {
    const y = 1.17 + ri * 0.347, h = 0.33, bg = ri % 2 === 0 ? C.white : "f8fafc";
    row.forEach((cell, ci) => {
      s.addShape(pres.shapes.RECTANGLE, { x: colX[ci], y, w: colW[ci], h, fill: { color: bg }, line: { color: C.border } });
      s.addText(cell, { x: colX[ci] + 0.05, y: y + 0.01, w: colW[ci] - 0.1, h: h - 0.02, fontSize: 7.5, bold: ci === 0, color: ci === 2 ? "1e40af" : C.textMid, fontFace: ci === 2 ? "Consolas" : (ci === 0 ? FH : FB), valign: "middle" });
    });
  });
}

// Slide 8: dbt Model Map
{
  const s = pres.addSlide();
  titleBar(s, "How Finance Concepts Map to dbt Models");
  const layers = [
    { title: "STAGING", sub: "raw → cleaned", color: C.amber, light: C.amberLight, dark: "78350f", models: [{ n: "stg_erp__gl_entries", d: "Raw GL entries" }, { n: "stg_erp__invoices", d: "Customer invoices (AR)" }, { n: "stg_erp__subscriptions", d: "Subscription records" }, { n: "stg_epm__plan_line", d: "Budget/plan data" }] },
    { title: "INTERMEDIATE", sub: "logic applied", color: C.blue, light: C.blueLight, dark: "1e3a8a", models: [{ n: "int_revenue", d: "Revenue by entity/period" }, { n: "int_arr_movements", d: "ARR categorized" }, { n: "int_ar_aging", d: "Invoices bucketed" }, { n: "int_pl_components", d: "P&L assembled" }] },
    { title: "MARTS", sub: "final analytics only", color: C.green, light: C.greenLight, dark: "14532d", models: [{ n: "mart_pl", d: "Full P&L → tab" }, { n: "fct_arr", d: "ARR → tab" }, { n: "mart_ar_aging", d: "AR → tab" }, { n: "fct_gl_entries", d: "Actuals → variance-rca" }] }
  ];
  const colX = [0.38, 3.56, 6.74], colW = 3.0;
  layers.forEach((layer, ci) => {
    const x = colX[ci];
    s.addShape(pres.shapes.RECTANGLE, { x, y: 0.84, w: colW, h: 4.3, fill: { color: C.white }, line: { color: C.border }, shadow: sh() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 0.84, w: colW, h: 0.6, fill: { color: layer.color }, line: { color: layer.color } });
    s.addText(layer.title, { x: x + 0.1, y: 0.84, w: colW - 0.2, h: 0.34, fontSize: 10, bold: true, color: C.white, fontFace: FH, valign: "middle", margin: 0 });
    s.addText(layer.sub, { x: x + 0.1, y: 1.14, w: colW - 0.2, h: 0.28, fontSize: 8, italic: true, color: "e2e8f0", fontFace: FB, valign: "middle", margin: 0 });
    layer.models.forEach((m, mi) => {
      const my = 1.5 + mi * 0.86;
      s.addShape(pres.shapes.RECTANGLE, { x: x + 0.12, y: my, w: colW - 0.24, h: 0.78, fill: { color: layer.light }, line: { color: layer.color } });
      s.addText(m.n, { x: x + 0.18, y: my + 0.05, w: colW - 0.36, h: 0.3, fontSize: 8.5, bold: true, color: layer.dark, fontFace: "Consolas" });
      s.addText(m.d, { x: x + 0.18, y: my + 0.38, w: colW - 0.36, h: 0.34, fontSize: 8, color: C.textMid, fontFace: FB });
    });
  });
  footer(s, "All AI tools query marts layer — never staging or intermediate");
}

// Slide 9: Quick Reference
{
  const s = pres.addSlide();
  s.background = { color: "0d1117" };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.05, fill: { color: C.blue }, line: { color: C.blue } });
  s.addText("Finance Quick Reference — Keep This Open While Building", { x: 0.38, y: 0.1, w: 9.0, h: 0.54, fontSize: 18, bold: true, color: C.white, fontFace: FH, margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.38, y: 0.64, w: 9.0, h: 0.02, fill: { color: "334155" }, line: { color: "334155" } });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.38, y: 0.72, w: 4.62, h: 4.66, fill: { color: "0f172a" }, line: { color: "1d4ed8" }, shadow: sh() });
  s.addText("Key Ratios", { x: 0.55, y: 0.79, w: 4.28, h: 0.36, fontSize: 11, bold: true, color: "93c5fd", fontFace: FH });
  const ratios = [{ f: "Gross Margin = Gross Profit / Revenue × 100", r: "ACME: 77.5% (healthy)", c: "86efac" }, { f: "Operating Margin = Op Income / Revenue × 100", r: "ACME: −9.4% (growth stage)", c: "fca5a5" }, { f: "NRR = (Beg + Exp − Churn) / Beg × 100", r: ">100% holy grail; target 110%+", c: "86efac" }, { f: "DSO = (AR / Revenue) × days", r: "Lower better; <30d ideal", c: "fcd34d" }, { f: "R&D −15% what-if", r: "+348 bps margin, +$62.9M op inc", c: "a3e635" }];
  ratios.forEach((x, i) => {
    const ry = 1.22 + i * 0.84;
    s.addText(x.f, { x: 0.55, y: ry, w: 4.28, h: 0.42, fontSize: 7.5, color: "e2e8f0", fontFace: "Consolas" });
    s.addText(x.r, { x: 0.55, y: ry + 0.4, w: 4.28, h: 0.34, fontSize: 7.5, italic: true, color: x.c, fontFace: FB });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 0.72, w: 4.42, h: 4.66, fill: { color: "0f172a" }, line: { color: "16a34a" }, shadow: sh() });
  s.addText("Lab Validation Numbers", { x: 5.36, y: 0.79, w: 4.08, h: 0.36, fontSize: 11, bold: true, color: "86efac", fontFace: FH });
  const nums = [["FY2024 Revenue", "$1.81B"], ["FY2024 Gross Profit", "$1.40B"], ["Gross Margin", "77.5%"], ["Op Income", "−$170.4M"], ["Op Margin", "−9.4%"], ["Entities", "US|EMEA|APAC"], ["Quarters", "Q1–Q4"], ["Period range", "202401–202412"], ["AR buckets", "0-30,31-60,61-90,90+"], ["ARR moves", "new|exp|contr|churn"]];
  nums.forEach((n, i) => {
    const ny = 1.22 + i * 0.43;
    s.addText(n[0] + ":", { x: 5.36, y: ny, w: 2.2, h: 0.38, fontSize: 8, color: "94a3b8", fontFace: FB, valign: "middle" });
    s.addText(n[1], { x: 7.6, y: ny, w: 1.84, h: 0.38, fontSize: 8, bold: true, color: C.white, fontFace: "Consolas", valign: "middle" });
  });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.31, w: 10, h: 0.315, fill: { color: "0f172a" }, line: { color: "1e293b" } });
  s.addText("These are your ground truth. If queries differ, check dbt model logic.", { x: 0.38, y: 5.325, w: 9.0, h: 0.29, fontSize: 8.5, italic: true, color: "64748b", fontFace: FB, valign: "middle", margin: 0 });
}

// Slide 10: Recap
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.05, fill: { color: C.green }, line: { color: C.green } });
  s.addText("Section 2 Recap — What You Now Know", { x: 0.38, y: 0.1, w: 9.0, h: 0.54, fontSize: 22, bold: true, color: C.white, fontFace: FH, margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.38, y: 0.64, w: 9.0, h: 0.02, fill: { color: "334155" }, line: { color: "334155" } });

  const checks = ["How the finance org is structured & who FP&A is", "The three financial statements — P&L is primary focus", "Core P&L metrics: Gross Margin, Op Margin, EBITDA", "SaaS metrics: ARR, NRR, GRR, Churn, CAC, LTV", "FP&A cycle: monthly & quarterly activities", "Finance data vocabulary mapped to dbt models", "Five CFO pain points this system solves", "Why finance AI works now (not 2019)", "Four-level maturity: Assisted→Augmented→Integrated→Autonomous"];
  checks.forEach((item, i) => {
    const cy = 0.76 + i * 0.38;
    s.addShape(pres.shapes.OVAL, { x: 0.38, y: cy + 0.05, w: 0.24, h: 0.24, fill: { color: C.green }, line: { color: C.green } });
    s.addText("✓", { x: 0.38, y: cy + 0.03, w: 0.24, h: 0.28, fontSize: 9, bold: true, color: C.white, fontFace: FH, align: "center", valign: "middle", margin: 0 });
    s.addText(item, { x: 0.72, y: cy, w: 9.0, h: 0.36, fontSize: 10.5, color: "e2e8f0", fontFace: FB, valign: "middle" });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.38, y: 4.22, w: 9.0, h: 0.82, fill: { color: "0c1a3d" }, line: { color: C.blue }, shadow: sh() });
  s.addText("You now have enough finance domain knowledge to design AI systems\nthat solve real FP&A problems — not just technically correct ones.", { x: 0.55, y: 4.27, w: 8.9, h: 0.72, fontSize: 12, italic: true, bold: true, color: C.white, fontFace: FH, align: "center", valign: "middle" });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.31, w: 10, h: 0.315, fill: { color: "0f172a" }, line: { color: "0f172a" } });
  s.addText("Next: Section 3 — Transformation Strategy: Use Cases and Business Cases", { x: 0.38, y: 5.325, w: 9.0, h: 0.29, fontSize: 9, color: "64748b", fontFace: FB, valign: "middle", margin: 0 });
}

pres.writeFile({ fileName: OUT }).then(() => console.log("✅ Written:", OUT)).catch(err => { console.error("❌ Error:", err.message); process.exit(1); });

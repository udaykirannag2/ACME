"use strict";
const pptxgen = require("pptxgenjs");
const path = require("path");

// Atlas Design Tokens — no # prefix for pptxgenjs
const A = {
  bg:'f6f7f9', bgS:'eef0f4', card:'ffffff',
  ink:'0b1220', inkS:'3b475a', inkD:'6b7689', inkM:'9aa3b2',
  rule:'e6e9ef', ruleH:'d3d8e0',
  brand:'0b66e4', brandS:'e7f0ff', brandD:'0a4fb0',
  nav:'0e1525', navI:'cbd2dd', navM:'7d8595',
  ok:'1a8754', okS:'e2f3e9',
  warn:'c4671b', warnS:'fcefdf',
  red:'c63232', redS:'fbe5e5',
  violet:'6c4ad9', violetS:'ede9f7',
  teal:'137a7b', tealS:'e1f4f4',
  orange:'e07a3a', orangeS:'fdf0e5',
  cyan:'3093a8', W:'FFFFFF',
};
const F='Calibri', FM='Consolas';
const SW=10, SH=5.625, TOT=15;
const OUT=path.join(__dirname,'section-1-slides.pptx');
const pres=new pptxgen();
pres.layout='LAYOUT_16x9';
pres.author='ACME Finance Course';
pres.title='Finance AI Agents on AWS — Section 1';
const R=pres.shapes.RECTANGLE, OV=pres.shapes.OVAL;
const sh =()=>({type:'outer',blur:8, offset:2,angle:135,color:'0b1220',opacity:0.08});
const shL=()=>({type:'outer',blur:16,offset:4,angle:135,color:'0b1220',opacity:0.14});

// ── HELPERS ───────────────────────────────────────────────────────────────
function hdr(s,sec,mod,title,dark=false){
  s.background={color:dark?A.nav:A.bg};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.brand},line:{color:A.brand}});
  if(sec) s.addText(`${sec}  ·  ${mod}`,{x:0.42,y:0.1,w:8,h:0.22,fontSize:7.5,color:dark?A.navM:A.inkD,fontFace:F,margin:0});
  s.addText(title,{x:0.42,y:sec?0.31:0.16,w:9.0,h:0.52,fontSize:21,bold:true,color:dark?A.W:A.ink,fontFace:F,margin:0});
  s.addShape(R,{x:0.42,y:sec?0.88:0.74,w:9.16,h:0.015,fill:{color:dark?'1e2d45':A.rule},line:{color:dark?'1e2d45':A.rule}});
}
function ftr(s,text,n,dark=false){
  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:dark?'080f1c':A.bgS},line:{color:dark?'080f1c':A.bgS}});
  s.addText(text,{x:0.42,y:5.335,w:7.5,h:0.27,fontSize:7.5,italic:true,color:dark?A.navM:A.inkD,fontFace:F,valign:'middle',margin:0});
  s.addText(`${n} / ${TOT}`,{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:dark?A.navM:A.inkD,fontFace:F,valign:'middle',align:'right',margin:0});
}
function crd(s,x,y,w,h,o={}){
  s.addShape(R,{x,y,w,h,fill:{color:o.bg||A.card},line:{color:o.border||A.rule,pt:1},shadow:o.shadow||sh()});
  if(o.accent) s.addShape(R,{x,y,w:0.06,h,fill:{color:o.accent},line:{color:o.accent}});
}
function kpi(s,x,y,w,h,label,val,sub,accent){
  crd(s,x,y,w,h,{accent:accent||A.brand});
  s.addText(label,{x:x+0.15,y:y+0.1,w:w-0.22,h:0.24,fontSize:8,color:A.inkD,fontFace:F,margin:0});
  s.addText(val,{x:x+0.15,y:y+0.32,w:w-0.22,h:0.46,fontSize:19,bold:true,color:A.ink,fontFace:F,margin:0});
  if(sub) s.addText(sub,{x:x+0.15,y:y+0.76,w:w-0.22,h:0.22,fontSize:7.5,color:A.inkD,fontFace:F,margin:0});
}
function tbl(s,rows,cols,x,y,opts={}){
  const rh=opts.rh||0.36;
  rows.forEach((row,ri)=>{
    const isH=ri===0;
    let cx=x;
    row.forEach((cell,ci)=>{
      const cw=Array.isArray(cols)?cols[ci]:cols;
      const bg=isH?A.nav:(ri%2===0?A.card:'f8fafc');
      s.addShape(R,{x:cx,y:y+ri*rh,w:cw,h:rh,fill:{color:bg},line:{color:A.rule,pt:0.5}});
      s.addText(String(cell),{x:cx+0.07,y:y+ri*rh+0.03,w:cw-0.14,h:rh-0.06,fontSize:isH?8.5:8,bold:isH,color:isH?A.W:A.inkS,fontFace:F,valign:'middle',margin:0});
      cx+=cw;
    });
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 1 — SECTION 1 DIVIDER (dark navy)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  // Top accent bar
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.brand},line:{color:A.brand}});
  // Ghost section number in background
  s.addText('1',{x:5.5,y:0.1,w:4.2,h:3.9,fontSize:220,bold:true,color:'131f35',fontFace:F,align:'right',margin:0});
  // Left accent bar
  s.addShape(R,{x:0.55,y:0.72,w:0.06,h:1.6,fill:{color:A.brand},line:{color:A.brand}});
  // Section label
  s.addText('SECTION',{x:0.72,y:0.72,w:3,h:0.28,fontSize:8.5,bold:true,color:A.navM,fontFace:F,margin:0});
  // Section title
  s.addText('Your AI Finance Agent\nStarts Here',{x:0.72,y:1.0,w:5.5,h:1.3,fontSize:26,bold:true,color:A.W,fontFace:F,margin:0});
  // Module list
  const mods=[
    '1.1  Live Demo: Ask ACME a Question',
    '1.2  What You\'ll Build',
    '1.3  Who This Is For + Your Roadmap',
  ];
  mods.forEach((m,i)=>{
    s.addText(m,{x:0.72,y:2.6+i*0.44,w:5.5,h:0.36,fontSize:9.5,color:A.navI,fontFace:F,margin:0});
  });
  // Duration badge
  s.addShape(R,{x:0.72,y:4.05,w:1.6,h:0.28,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('~36 min  ·  15 slides',{x:0.72,y:4.05,w:1.6,h:0.28,fontSize:8,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
  // Footer
  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:'080f1c'},line:{color:'080f1c'}});
  s.addText('Finance AI Agents on AWS: Build Real Systems for FP&A',{x:0.42,y:5.335,w:8.5,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',margin:0});
  s.addText(`1 / ${TOT}`,{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',align:'right',margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 2 — Before We Explain — Watch This
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.1','Before We Explain Anything — Watch This');
  ftr(s,'ACME Finance AI System — Natural Language to Answer in < 2 seconds',2);

  // Left panel: chat interface mockup
  crd(s,0.42,1.05,4.4,3.98,{shadow:shL()});
  s.addShape(R,{x:0.42,y:1.05,w:4.4,h:0.38,fill:{color:A.nav},line:{color:A.nav}});
  s.addText('ACME Finance AI  —  Chat',{x:0.55,y:1.05,w:4.1,h:0.38,fontSize:8.5,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});
  // User bubble
  s.addShape(R,{x:1.8,y:1.62,w:2.8,h:0.44,fill:{color:A.brandS},line:{color:'c7dcfc',pt:1}});
  s.addText('What was ACME\'s revenue in 2024?',{x:1.85,y:1.62,w:2.7,h:0.44,fontSize:8,color:A.brandD,fontFace:F,valign:'middle',margin:0});
  // System response
  s.addShape(R,{x:0.55,y:2.22,w:3.0,h:0.44,fill:{color:'f0f7e8'},line:{color:'c2e6c2',pt:1}});
  s.addText('Revenue FY2024: $1,807.9M ✓',{x:0.6,y:2.22,w:2.9,h:0.44,fontSize:8,bold:true,color:A.ok,fontFace:F,valign:'middle',margin:0});
  // Second user bubble
  s.addShape(R,{x:1.4,y:2.82,w:3.2,h:0.54,fill:{color:A.brandS},line:{color:'c7dcfc',pt:1}});
  s.addText('Compare operating margin for the last 3 fiscal years',{x:1.45,y:2.82,w:3.1,h:0.54,fontSize:8,color:A.brandD,fontFace:F,valign:'middle',margin:0});
  // Second response
  s.addShape(R,{x:0.55,y:3.52,w:3.0,h:0.44,fill:{color:'fff4e5'},line:{color:'f5c97a',pt:1}});
  s.addText('Margin trend: +8.9% → +5.5% → −9.4%',{x:0.6,y:3.52,w:2.9,h:0.44,fontSize:8,bold:true,color:A.warn,fontFace:F,valign:'middle',margin:0});
  // Input bar
  s.addShape(R,{x:0.55,y:4.1,w:3.8,h:0.36,fill:{color:A.bgS},line:{color:A.rule,pt:1}});
  s.addText('Ask a finance question…',{x:0.65,y:4.1,w:3.6,h:0.36,fontSize:8,color:A.inkM,fontFace:F,valign:'middle',italic:true,margin:0});

  // Right panel: flow diagram
  s.addText('How it works',{x:5.1,y:1.05,w:4.5,h:0.34,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
  const steps=[
    {y:1.48,bg:A.nav,fg:A.W,label:'1',text:'Natural Language Query',sub:'You type a plain English question'},
    {y:2.32,bg:A.brand,fg:A.W,label:'2',text:'Bedrock Agent (ReAct)',sub:'Plans → selects tool → executes'},
    {y:3.16,bg:A.teal,fg:A.W,label:'3',text:'Lambda Tool',sub:'text_to_sql / forecast / rca'},
    {y:4.0, bg:A.ok,  fg:A.W,label:'4',text:'Redshift Data',sub:'Serverless — instant SQL result'},
  ];
  steps.forEach((st,i)=>{
    crd(s,5.1,st.y,4.48,0.72,{shadow:sh()});
    s.addShape(OV,{x:5.18,y:st.y+0.18,w:0.38,h:0.38,fill:{color:st.bg},line:{color:st.bg}});
    s.addText(st.label,{x:5.18,y:st.y+0.18,w:0.38,h:0.38,fontSize:10,bold:true,color:st.fg,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(st.text,{x:5.66,y:st.y+0.08,w:3.75,h:0.28,fontSize:9.5,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(st.sub,{x:5.66,y:st.y+0.38,w:3.75,h:0.24,fontSize:7.5,color:A.inkD,fontFace:F,margin:0});
    // Arrow connector (except after last)
    if(i<3) s.addShape(R,{x:5.26,y:st.y+0.72,w:0.02,h:0.2,fill:{color:A.inkM},line:{color:A.inkM}});
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 3 — Q1 Result: Revenue $1,807.9M
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.1','Live Query #1: ACME Revenue, FY2024');
  ftr(s,'Source: ACME Finance Redshift — fact_financials table, FY2024 actuals',3);

  // Query bubble
  s.addShape(R,{x:0.42,y:1.08,w:9.16,h:0.52,fill:{color:A.nav},line:{color:A.nav},shadow:sh()});
  s.addShape(R,{x:0.42,y:1.08,w:0.04,h:0.52,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('USER QUERY',{x:0.58,y:1.08,w:1.3,h:0.26,fontSize:7,bold:true,color:A.navM,fontFace:F,margin:0});
  s.addText('"What was ACME\'s revenue in 2024?"',{x:0.58,y:1.3,w:8.8,h:0.26,fontSize:11,color:A.navI,fontFace:F,italic:true,margin:0});

  // Main KPI card — large
  crd(s,0.42,1.78,4.8,2.1,{shadow:shL()});
  s.addShape(R,{x:0.42,y:1.78,w:4.8,h:0.06,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('TOTAL REVENUE',{x:0.58,y:1.94,w:4.5,h:0.28,fontSize:9,color:A.inkD,fontFace:F,margin:0});
  s.addText('$1,807.9M',{x:0.58,y:2.22,w:4.5,h:0.88,fontSize:48,bold:true,color:A.ink,fontFace:F,margin:0});
  s.addText('FY2024 Full Year Actuals',{x:0.58,y:3.14,w:4.5,h:0.28,fontSize:8.5,color:A.inkD,fontFace:F,margin:0});
  s.addShape(R,{x:0.42,y:3.44,w:4.8,h:0.44,fill:{color:A.okS},line:{color:'c2e6c2',pt:1}});
  s.addText('✓  Answered in < 1.8 seconds  ·  No SQL written  ·  No IT ticket',{x:0.58,y:3.44,w:4.55,h:0.44,fontSize:8.5,color:A.ok,fontFace:F,valign:'middle',margin:0});

  // Right side sub-KPIs
  kpi(s,5.5,1.78,4.08,0.98,'TOTAL REVENUE','$1,807.9M','FY2024 actual',A.brand);
  kpi(s,5.5,2.88,1.94,0.98,'YoY CHANGE','+$3.6M','+0.2% vs FY2023',A.ok);
  kpi(s,7.58,2.88,2.0,0.98,'COST OF REVENUE','$1,038.2M','57.4% of revenue',A.warn);
  kpi(s,5.5,3.98,4.08,0.72,'GROSS PROFIT','$769.7M  ·  42.6% margin','vs 47.7% in FY2023',A.teal);

  // Agent trace note
  s.addText('Agent trace: NL → text_to_sql tool → SELECT SUM(revenue) FROM fact_financials WHERE fiscal_year=2024',{x:0.42,y:4.85,w:9.16,h:0.26,fontSize:7.5,color:A.inkM,fontFace:FM,italic:true,margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 4 — Q2 Result: Operating Margin Trend
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.1','Live Query #2: Operating Margin — Last 3 Fiscal Years');
  ftr(s,'ACME Finance AI — Operating margin collapsed 14.8 pts in 24 months. Why?',4);

  // Query bubble
  s.addShape(R,{x:0.42,y:1.08,w:9.16,h:0.52,fill:{color:A.nav},line:{color:A.nav},shadow:sh()});
  s.addShape(R,{x:0.42,y:1.08,w:0.04,h:0.52,fill:{color:A.violet},line:{color:A.violet}});
  s.addText('USER QUERY',{x:0.58,y:1.08,w:1.3,h:0.26,fontSize:7,bold:true,color:A.navM,fontFace:F,margin:0});
  s.addText('"Compare operating margin for the last 3 fiscal years"',{x:0.58,y:1.3,w:8.8,h:0.26,fontSize:11,color:A.navI,fontFace:F,italic:true,margin:0});

  // Trend table
  const rows=[
    ['Fiscal Year','Revenue','Gross Profit','Op. Expenses','Op. Income','Op. Margin'],
    ['FY2022',     '$1,453.5M','$692.0M',    '$562.0M',     '+$130.0M',   '+8.9%'],
    ['FY2023',     '$1,804.3M','$860.7M',    '$760.7M',     '+$100.0M',   '+5.5%'],
    ['FY2024',     '$1,807.9M','$769.7M',    '$939.7M',     '−$170.0M',   '−9.4%'],
  ];
  tbl(s,rows,[1.1,1.6,1.52,1.58,1.5,1.28],0.42,1.76,{rh:0.38});

  // Color-coded margin badges overlaid in the last column
  const marginData=[{y:2.14,val:'+8.9%',bg:A.ok},{y:2.52,val:'+5.5%',bg:A.warn},{y:2.9,val:'−9.4%',bg:A.red}];
  marginData.forEach(m=>{
    s.addShape(R,{x:8.1,y:m.y+0.04,w:1.28,h:0.3,fill:{color:m.bg},line:{color:m.bg}});
    s.addText(m.val,{x:8.1,y:m.y+0.04,w:1.28,h:0.3,fontSize:9,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
  });

  // Insight cards below table
  const insights=[
    {x:0.42,bg:A.brandS,border:'c7dcfc',color:A.brandD,label:'Revenue Change',val:'+$3.6M (+0.2%)',note:'Essentially flat in 2 years'},
    {x:3.62,bg:'fff4e5', border:'f5c97a', color:A.warn,  label:'Gross Margin Drop',val:'−5.1 pts (47.7→42.6%)',note:'Cost of revenue rose faster'},
    {x:6.82,bg:A.redS,  border:'f5b5b5', color:A.red,   label:'Op. Margin Collapse',val:'−14.8 pts (8.9→−9.4%)',note:'OpEx surged $377M in 2 yrs'},
  ];
  insights.forEach(ins=>{
    crd(s,ins.x,3.56,3.08,1.2,{bg:ins.bg,border:ins.border,shadow:sh()});
    s.addText(ins.label,{x:ins.x+0.12,y:3.66,w:2.85,h:0.24,fontSize:8,color:ins.color,fontFace:F,bold:true,margin:0});
    s.addText(ins.val,{x:ins.x+0.12,y:3.9,w:2.85,h:0.36,fontSize:12,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(ins.note,{x:ins.x+0.12,y:4.26,w:2.85,h:0.26,fontSize:8,color:A.inkD,fontFace:F,margin:0});
  });

  // "Why?" callout
  s.addShape(R,{x:0.42,y:4.86,w:9.16,h:0.32,fill:{color:A.nav},line:{color:A.nav}});
  s.addText('Revenue barely changed (+0.2%). Margin collapsed 14.8 pts. The system answers WHY — automatically.',{x:0.55,y:4.86,w:8.9,h:0.32,fontSize:9,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 5 — What Just Happened (4-step flow)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.1','What Just Happened? Under the Hood in 4 Steps');
  ftr(s,'ReAct = Reason + Act loop — Bedrock Agents run this automatically on every query',5);

  // 4 step flow - horizontal
  const steps=[
    {x:0.42,color:A.brand,  num:'1',title:'Natural Language\nQuery',body:'You type a plain English question. No SQL. No dashboards. No special syntax required.',tag:'< 500ms to agent'},
    {x:2.82,color:A.violet, num:'2',title:'Bedrock Agent\n(ReAct Loop)',body:'Claude plans: "I need revenue data." Selects the right tool. Reasons about schema context.',tag:'ReAct: reason + act'},
    {x:5.22,color:A.teal,   num:'3',title:'Lambda Tool\nExecution',body:'Tool converts NL → SQL. Executes against Redshift Serverless. Returns structured JSON result.',tag:'< 1.5s SQL execution'},
    {x:7.62,color:A.ok,     num:'4',title:'Answer Back\nto User',body:'Agent formats the result into natural language. Adds context, units, and supporting figures.',tag:'Full answer < 2s'},
  ];
  steps.forEach((st,i)=>{
    crd(s,st.x,1.08,2.28,3.12,{shadow:shL()});
    s.addShape(R,{x:st.x,y:1.08,w:2.28,h:0.5,fill:{color:st.color},line:{color:st.color}});
    s.addText(st.num,{x:st.x,y:1.08,w:2.28,h:0.5,fontSize:20,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(st.title,{x:st.x+0.14,y:1.66,w:2.02,h:0.66,fontSize:11,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(st.body,{x:st.x+0.14,y:2.38,w:2.02,h:1.1,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});
    // Latency tag at bottom
    s.addShape(R,{x:st.x+0.12,y:3.54,w:2.04,h:0.38,fill:{color:A.bgS},line:{color:A.ruleH,pt:1}});
    s.addText(st.tag,{x:st.x+0.12,y:3.54,w:2.04,h:0.38,fontSize:8,bold:true,color:st.color,fontFace:F,align:'center',valign:'middle',margin:0});
    // Arrow between cards (except after last)
    if(i<3) s.addShape(R,{x:st.x+2.28,y:2.58,w:0.14,h:0.04,fill:{color:A.inkM},line:{color:A.inkM}});
  });

  // Tech stack row
  const techBgs=[A.nav, A.brand, A.teal, A.ok];
  const techs=['Amazon Bedrock','Claude 3.7 Sonnet','AWS Lambda','Redshift Serverless'];
  s.addText('POWERED BY',{x:0.42,y:4.42,w:4,h:0.22,fontSize:7.5,bold:true,color:A.inkM,fontFace:F,margin:0});
  techs.forEach((t,i)=>{
    s.addShape(R,{x:0.42+i*2.4,y:4.64,w:2.16,h:0.4,fill:{color:techBgs[i]},line:{color:techBgs[i]}});
    s.addText(t,{x:0.42+i*2.4,y:4.64,w:2.16,h:0.4,fontSize:8,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 6 — Module 1.2 Intro: What You'll Build
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.2','What You\'ll Build — Full System Overview');
  ftr(s,'ACME Finance AI System — end-to-end from Streamlit UI to Redshift data warehouse',6);

  // Left: deliverables list
  s.addText('By the end of this course you will have built:',{x:0.42,y:1.08,w:5.2,h:0.3,fontSize:10,color:A.inkS,fontFace:F,margin:0});
  const deliverables=[
    {icon:'◉', text:'A production-ready Streamlit finance dashboard — 6 tabs'},
    {icon:'◉', text:'A FastAPI backend connecting UI to AWS services'},
    {icon:'◉', text:'A Bedrock Agent with 5 custom Lambda tools'},
    {icon:'◉', text:'AgentCore Gateway for secure, scalable access'},
    {icon:'◉', text:'Redshift Serverless data warehouse with dbt models'},
    {icon:'◉', text:'Memory-augmented agents that learn user preferences'},
    {icon:'◉', text:'AI commentary generation for board reports'},
    {icon:'◉', text:'Automated board pack PDF generation'},
  ];
  deliverables.forEach((d,i)=>{
    s.addShape(R,{x:0.42,y:1.48+i*0.46,w:0.26,h:0.26,fill:{color:A.brand},line:{color:A.brand}});
    s.addText(d.icon,{x:0.42,y:1.48+i*0.46,w:0.26,h:0.26,fontSize:9,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(d.text,{x:0.76,y:1.48+i*0.46,w:4.72,h:0.36,fontSize:9,color:A.inkS,fontFace:F,valign:'middle',margin:0});
  });

  // Right: duration/effort card
  crd(s,5.72,1.08,3.86,3.82,{shadow:shL()});
  s.addShape(R,{x:5.72,y:1.08,w:3.86,h:0.42,fill:{color:A.nav},line:{color:A.nav}});
  s.addText('COURSE AT A GLANCE',{x:5.84,y:1.08,w:3.6,h:0.42,fontSize:9,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});
  const stats2=[
    {label:'Sections',val:'8'},
    {label:'Total Slides',val:'120+'},
    {label:'Lambda Functions',val:'5'},
    {label:'Streamlit Tabs',val:'6'},
    {label:'Build Phases',val:'10'},
    {label:'Estimated Build Time',val:'12–16 hrs'},
  ];
  stats2.forEach((st,i)=>{
    const even=i%2===0;
    const bg=even?A.card:'f8fafc';
    s.addShape(R,{x:5.72,y:1.5+i*0.4,w:3.86,h:0.4,fill:{color:bg},line:{color:A.rule,pt:0.5}});
    s.addText(st.label,{x:5.84,y:1.5+i*0.4+0.06,w:2.4,h:0.28,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});
    s.addText(st.val,{x:8.0,y:1.5+i*0.4+0.06,w:1.45,h:0.28,fontSize:8.5,bold:true,color:A.brand,fontFace:F,align:'right',margin:0});
  });
  s.addShape(R,{x:5.72,y:3.9,w:3.86,h:0.42,fill:{color:A.okS},line:{color:'c2e6c2',pt:1}});
  s.addText('All code open-sourced on GitHub',{x:5.84,y:3.9,w:3.6,h:0.42,fontSize:8.5,color:A.ok,fontFace:F,valign:'middle',bold:true,margin:0});
  s.addShape(R,{x:5.72,y:4.32,w:3.86,h:0.42,fill:{color:A.brandS},line:{color:'c7dcfc',pt:1}});
  s.addText('AWS CDK included — deploy in < 30 min',{x:5.84,y:4.32,w:3.6,h:0.42,fontSize:8.5,color:A.brandD,fontFace:F,valign:'middle',bold:true,margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 7 — Full System Architecture Diagram
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.2','System Architecture — End-to-End');
  ftr(s,'All services are serverless where possible — minimal ops overhead',7);

  // Layer boxes
  const layers=[
    {x:0.42,y:1.05,w:2.0,h:2.8,color:A.violet,label:'PRESENTATION',items:['Streamlit UI','6 Tabs Dashboard','FastAPI Backend']},
    {x:2.62,y:1.05,w:2.1,h:2.8,color:A.brand, label:'AI AGENT',    items:['Bedrock Agent','ReAct Loop','Claude 3.7 Sonnet']},
    {x:4.92,y:1.05,w:2.1,h:2.8,color:A.cyan,  label:'GATEWAY',     items:['AgentCore','API Gateway','IAM Auth']},
    {x:7.22,y:1.05,w:1.7,h:2.8,color:A.teal,  label:'COMPUTE',     items:['5 Lambda Tools','text_to_sql','forecast / rca']},
    {x:9.12,y:1.05, w:0.46,h:2.8,color:A.ok,  label:'DATA',        items:['Redshift','Serverless','dbt Models']},
  ];
  // Note: last layer is squeezed; let's redo with better layout
  // Actually let's draw 5 columns in 9.58" width

  // Layer boxes — 5 columns across full width
  const cols5=[
    {x:0.3, w:1.78,color:A.violet,label:'UI LAYER',    items:['Streamlit UI','6 Dashboard Tabs','FastAPI /api/chat','Python + Plotly','Docker container']},
    {x:2.22,w:1.88,color:A.brand, label:'AI AGENT',    items:['Amazon Bedrock','Bedrock Agent v2','Claude 3.7 Sonnet','ReAct Loop','Tool orchestration']},
    {x:4.24,w:1.88,color:A.cyan,  label:'GATEWAY',     items:['AgentCore Gateway','API Gateway','IAM + Cognito','Rate limiting','Request logging']},
    {x:6.26,w:1.78,color:A.teal,  label:'COMPUTE',     items:['5 Lambda Tools','Python 3.12','< 3s latency','1000 concurrency','VPC-enabled']},
    {x:8.18,w:1.52,color:A.ok,    label:'DATA',        items:['Redshift Serverless','dbt Models','S3 Raw Zone','Glue catalog','CloudWatch']},
  ];
  cols5.forEach((col)=>{
    crd(s,col.x,1.05,col.w,3.46,{shadow:sh()});
    s.addShape(R,{x:col.x,y:1.05,w:col.w,h:0.36,fill:{color:col.color},line:{color:col.color}});
    s.addText(col.label,{x:col.x+0.06,y:1.05,w:col.w-0.12,h:0.36,fontSize:7.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    col.items.forEach((item,ii)=>{
      const bg=ii%2===0?A.card:'f8fafc';
      s.addShape(R,{x:col.x,y:1.41+ii*0.42,w:col.w,h:0.42,fill:{color:bg},line:{color:A.rule,pt:0.5}});
      s.addText(item,{x:col.x+0.1,y:1.41+ii*0.42,w:col.w-0.2,h:0.42,fontSize:7.5,color:A.inkS,fontFace:F,valign:'middle',margin:0});
    });
  });

  // Arrows between columns
  const arrowY=2.7;
  [2.0, 4.12, 6.14, 7.96].forEach(ax=>{
    s.addShape(R,{x:ax,y:arrowY,w:0.22,h:0.04,fill:{color:A.inkM},line:{color:A.inkM}});
    s.addText('›',{x:ax+0.08,y:arrowY-0.12,w:0.18,h:0.28,fontSize:11,color:A.inkM,fontFace:F,align:'center',margin:0});
  });

  // Data flow label
  s.addShape(R,{x:0.3,y:4.26,w:9.4,h:0.36,fill:{color:A.nav},line:{color:A.nav},shadow:sh()});
  s.addText('Request flow:  User → FastAPI → AgentCore → Bedrock → Lambda → Redshift → Bedrock → FastAPI → User',{x:0.42,y:4.26,w:9.2,h:0.36,fontSize:8,color:A.navI,fontFace:F,valign:'middle',margin:0});

  // Key AWS services row
  const awsSvcs=['Amazon Bedrock','AgentCore','Lambda','Redshift Serverless','S3','CloudWatch','IAM'];
  s.addText('AWS SERVICES USED:',{x:0.3,y:4.7,w:2.0,h:0.24,fontSize:7.5,bold:true,color:A.inkM,fontFace:F,margin:0});
  awsSvcs.forEach((svc,i)=>{
    s.addShape(R,{x:2.5+i*1.04,y:4.7,w:1.0,h:0.24,fill:{color:A.bgS},line:{color:A.ruleH,pt:1}});
    s.addText(svc,{x:2.5+i*1.04,y:4.7,w:1.0,h:0.24,fontSize:6.5,color:A.inkS,fontFace:F,align:'center',valign:'middle',margin:0});
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 8 — The 5 Lambda Tools
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.2','The 5 Lambda Tools — Agent\'s Capabilities');
  ftr(s,'Each tool is a standalone Python Lambda — independently deployable and testable',8);

  const TW=1.84, TG=0.12, TX0=0.3;
  const tools=[
    {color:A.brand,  name:'text_to_sql',     desc:'Converts natural language questions into SQL queries against Redshift. Uses schema context + few-shot examples.',use:'Every ad-hoc data question'},
    {color:A.violet, name:'forecast',        desc:'Generates rolling forecasts using historical actuals. Returns 12-month projection with confidence bands.',use:'Budget vs. actuals, outlooks'},
    {color:A.teal,   name:'variance_rca',    desc:'Root-cause analysis on budget vs. actual variances. Decomposes by business unit, cost center, and driver.',use:'Monthly close, board reports'},
    {color:A.warn,   name:'whatif_sim',      desc:'Runs scenario simulations — change headcount, pricing, COGS — and projects P&L impact within seconds.',use:'FP&A modeling, CFO scenarios'},
    {color:A.ok,     name:'describe_metric', desc:'Retrieves canonical KPI definitions from the metric catalog. Ensures consistent terminology across reports.',use:'Commentary, onboarding'},
  ];
  tools.forEach((t,i)=>{
    const tx=TX0+i*(TW+TG);
    crd(s,tx,1.05,TW,3.9,{shadow:shL()});
    s.addShape(R,{x:tx,y:1.05,w:TW,h:0.42,fill:{color:t.color},line:{color:t.color}});
    // Tool number
    s.addText(String(i+1),{x:tx,y:1.05,w:0.4,h:0.42,fontSize:14,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    // Tool name
    s.addText(t.name,{x:tx+0.08,y:1.05+0.5,w:TW-0.16,h:0.34,fontSize:8.5,bold:true,color:A.ink,fontFace:FM,margin:0});
    // Separator
    s.addShape(R,{x:tx+0.1,y:1.05+0.88,w:TW-0.2,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    // Description
    s.addText(t.desc,{x:tx+0.1,y:1.05+0.92,w:TW-0.2,h:1.58,fontSize:7.5,color:A.inkS,fontFace:F,margin:0});
    // Use case badge
    s.addShape(R,{x:tx+0.1,y:1.05+2.6,w:TW-0.2,h:0.56,fill:{color:A.bgS},line:{color:A.rule,pt:1}});
    s.addText(t.use,{x:tx+0.14,y:1.05+2.6,w:TW-0.28,h:0.56,fontSize:7,color:A.inkD,fontFace:F,italic:true,valign:'middle',margin:0});
  });

  // Runtime stats strip
  s.addShape(R,{x:0.42,y:5.04,w:9.16,h:0.18,fill:{color:A.nav},line:{color:A.nav}});
  s.addText('Runtime: Python 3.12  ·  Avg latency: < 2.5s  ·  Max concurrency: 1000  ·  IAM-secured  ·  Fully unit-tested',{x:0.55,y:5.04,w:9.0,h:0.18,fontSize:7,color:A.navM,fontFace:F,valign:'middle',margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 9 — The 6 Streamlit Tabs
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.2','The 6 Streamlit Tabs — Finance Dashboard');
  ftr(s,'All tabs share a single FastAPI backend — one codebase, one deployment',9);

  // Tab bar mockup
  s.addShape(R,{x:0.42,y:1.05,w:9.16,h:0.38,fill:{color:A.nav},line:{color:A.nav}});
  const tabs=[
    {label:'P&L',x:0.5},
    {label:'ARR',x:1.42},
    {label:'AR Aging',x:2.24},
    {label:'AI Analyst',x:3.38},
    {label:'Commentary',x:4.6},
    {label:'Board Pack',x:5.94},
  ];
  tabs.forEach((tab,i)=>{
    const isActive=i===3;
    const tw=tab.label.length*0.09+0.3;
    s.addShape(R,{x:tab.x,y:1.05,w:tw,h:0.38,fill:{color:isActive?A.brand:A.nav},line:{color:isActive?A.brand:A.nav}});
    s.addText(tab.label,{x:tab.x,y:1.05,w:tw,h:0.38,fontSize:8.5,bold:isActive,color:isActive?A.W:A.navM,fontFace:F,align:'center',valign:'middle',margin:0});
  });

  // 6 tab detail cards — 2 rows of 3
  const tabDetails=[
    {col:0,row:0,color:A.brand,  name:'P&L',         desc:'Full Income Statement — Revenue, Gross Profit, EBITDA, Net Income. Monthly vs. budget. 3-year trend chart.'},
    {col:1,row:0,color:A.teal,   name:'ARR',          desc:'Annual Recurring Revenue waterfall — New, Expansion, Contraction, Churn. Monthly cohort view. Net Revenue Retention.'},
    {col:2,row:0,color:A.violet, name:'AR Aging',     desc:'Accounts Receivable aging buckets — Current, 30/60/90+ days. DSO trend. Collections risk flags.'},
    {col:0,row:1,color:A.cyan,   name:'AI Analyst',   desc:'The chat interface you just saw. NL queries → instant answers. Powered by Bedrock Agent + 5 tools. Full conversation history.'},
    {col:1,row:1,color:A.warn,   name:'Commentary',   desc:'AI-generated narrative for each metric. CFO-ready language. Editable. Version-controlled. One click to regenerate.'},
    {col:2,row:1,color:A.ok,     name:'Board Pack',   desc:'Generates full PDF board pack — cover, exec summary, all charts, commentary. Branded. Downloadable in < 30 seconds.'},
  ];
  tabDetails.forEach(td=>{
    const tx=0.42+td.col*3.14;
    const ty=1.54+td.row*1.76;
    crd(s,tx,ty,3.0,1.62,{shadow:sh()});
    s.addShape(R,{x:tx,y:ty,w:3.0,h:0.36,fill:{color:td.color},line:{color:td.color}});
    s.addText(td.name,{x:tx+0.1,y:ty,w:2.8,h:0.36,fontSize:10,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});
    s.addText(td.desc,{x:tx+0.1,y:ty+0.42,w:2.8,h:1.1,fontSize:8,color:A.inkS,fontFace:F,margin:0});
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 10 — Phase Timeline
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.2','Build Phases — 10-Phase Progression');
  ftr(s,'Complete each phase in sequence — each builds on the last',10);

  const phases=[
    {n:'1',label:'Data\nFoundation',color:A.brand,   sub:'Redshift + dbt + seed data',hrs:'~90 min'},
    {n:'2',label:'FastAPI\nBackend',color:A.brand,   sub:'REST API + auth skeleton',hrs:'~60 min'},
    {n:'3',label:'Streamlit\nUI',   color:A.brand,   sub:'All 6 tabs + chart layer',hrs:'~90 min'},
    {n:'4',label:'Lambda\nTools',   color:A.violet,  sub:'5 tools + Bedrock integration',hrs:'~120 min'},
    {n:'5',label:'Bedrock\nAgent',  color:A.violet,  sub:'Agent config + ReAct loop',hrs:'~90 min'},
    {n:'6',label:'Testing\n& QA',   color:A.violet,  sub:'Unit + integration tests',hrs:'~60 min'},
    {n:'7',label:'AgentCore\nGateway',color:A.teal,  sub:'Secure gateway + IAM',hrs:'~90 min'},
    {n:'8',label:'Memory\n& Context',color:A.teal,   sub:'User prefs + conversation',hrs:'~60 min'},
    {n:'9',label:'AI\nCommentary',  color:A.warn,    sub:'Narrative generation',hrs:'~60 min'},
    {n:'10',label:'Board\nPack',    color:A.ok,      sub:'PDF generation + deploy',hrs:'~90 min'},
  ];

  const phW=0.87, phH=3.5, startX=0.28, phaseY=1.22;
  // Group brackets
  s.addShape(R,{x:0.28,y:1.06,w:2.78,h:0.14,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('FOUNDATION',{x:0.28,y:1.06,w:2.78,h:0.14,fontSize:6.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
  s.addShape(R,{x:3.14,y:1.06,w:2.78,h:0.14,fill:{color:A.violet},line:{color:A.violet}});
  s.addText('AGENT',{x:3.14,y:1.06,w:2.78,h:0.14,fontSize:6.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
  s.addShape(R,{x:6.0,y:1.06,w:1.86,h:0.14,fill:{color:A.teal},line:{color:A.teal}});
  s.addText('PRODUCTION',{x:6.0,y:1.06,w:1.86,h:0.14,fontSize:6.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
  s.addShape(R,{x:7.94,y:1.06,w:0.93,h:0.14,fill:{color:A.warn},line:{color:A.warn}});
  s.addText('AI',{x:7.94,y:1.06,w:0.93,h:0.14,fontSize:6.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
  s.addShape(R,{x:8.94,y:1.06,w:0.78,h:0.14,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('SHIP',{x:8.94,y:1.06,w:0.78,h:0.14,fontSize:6.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});

  phases.forEach((ph,i)=>{
    const px=startX+i*0.945;
    crd(s,px,phaseY,phW,phH,{shadow:sh()});
    s.addShape(R,{x:px,y:phaseY,w:phW,h:0.38,fill:{color:ph.color},line:{color:ph.color}});
    s.addText(ph.n,{x:px,y:phaseY,w:phW,h:0.38,fontSize:13,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(ph.label,{x:px+0.05,y:phaseY+0.42,w:phW-0.1,h:0.72,fontSize:7.5,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
    s.addShape(R,{x:px+0.08,y:phaseY+1.18,w:phW-0.16,h:0.015,fill:{color:A.rule},line:{color:A.rule}});
    s.addText(ph.sub,{x:px+0.05,y:phaseY+1.2,w:phW-0.1,h:0.72,fontSize:6.5,color:A.inkD,fontFace:F,align:'center',margin:0});
    s.addShape(R,{x:px,y:phaseY+phH-0.56,w:phW,h:0.56,fill:{color:'f0f4ff'},line:{color:A.ruleH,pt:0.5}});
    s.addText(ph.hrs,{x:px,y:phaseY+phH-0.56,w:phW,h:0.56,fontSize:7.5,bold:true,color:ph.color,fontFace:F,align:'center',valign:'middle',margin:0});
  });

  // Timeline arrow (below cards: 1.22+3.5=4.72)
  s.addShape(R,{x:0.28,y:4.82,w:9.44,h:0.04,fill:{color:A.rule},line:{color:A.rule}});
  s.addText('→',{x:9.54,y:4.74,w:0.2,h:0.24,fontSize:12,color:A.inkM,fontFace:F,align:'center',margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 11 — Module 1.3 Intro: Who This Is For
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.3','Who This Is For + Your Roadmap');
  ftr(s,'This is a practitioner course — every concept has working code',11);

  // Large persona card
  crd(s,0.42,1.05,9.16,2.3,{shadow:shL()});
  s.addShape(R,{x:0.42,y:1.05,w:9.16,h:0.06,fill:{color:A.violet},line:{color:A.violet}});

  // Avatar placeholder
  s.addShape(OV,{x:0.7,y:1.25,w:1.2,h:1.2,fill:{color:A.nav},line:{color:A.brand,pt:2}});
  s.addText('SA',{x:0.7,y:1.25,w:1.2,h:1.2,fontSize:28,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});

  s.addText('Target Learner: The Solution Architect',{x:2.1,y:1.18,w:7.3,h:0.32,fontSize:12,bold:true,color:A.ink,fontFace:F,margin:0});
  s.addShape(R,{x:2.1,y:1.5,w:7.3,h:0.015,fill:{color:A.rule},line:{color:A.rule}});

  const criteria=[
    ['✓','You\'ve deployed AWS services — EC2, Lambda, RDS, maybe Bedrock'],
    ['✓','You know Python well enough to read and modify code'],
    ['✓','You\'ve heard of Bedrock Agents but never built one end-to-end'],
    ['✓','You\'ve never built a finance AI system — this course bridges that gap'],
    ['✓','You want something real to show: architecture diagrams + working system'],
  ];
  criteria.forEach((c,i)=>{
    s.addShape(R,{x:2.1,y:1.56+i*0.34,w:0.24,h:0.24,fill:{color:A.violet},line:{color:A.violet}});
    s.addText(c[0],{x:2.1,y:1.56+i*0.34,w:0.24,h:0.24,fontSize:8,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(c[1],{x:2.42,y:1.56+i*0.34,w:6.96,h:0.3,fontSize:8.5,color:A.inkS,fontFace:F,valign:'middle',margin:0});
  });

  // "Not for you if" strip
  s.addShape(R,{x:0.42,y:3.5,w:9.16,h:0.5,fill:{color:A.redS},line:{color:'f5b5b5',pt:1}});
  s.addText('NOT for you if: You need basic Python tutorials | You want theoretical-only content | You\'re looking for a no-code tool',{x:0.55,y:3.5,w:8.9,h:0.5,fontSize:8.5,color:A.red,fontFace:F,valign:'middle',italic:true,margin:0});

  // Prereqs
  s.addText('PREREQUISITES:',{x:0.42,y:4.12,w:1.5,h:0.26,fontSize:8,bold:true,color:A.inkM,fontFace:F,margin:0});
  ['Python 3.10+','AWS Account','Basic SQL','Git'].forEach((p,i)=>{
    s.addShape(R,{x:2.0+i*1.68,y:4.12,w:1.58,h:0.26,fill:{color:A.bgS},line:{color:A.ruleH,pt:1}});
    s.addText(p,{x:2.0+i*1.68,y:4.12,w:1.58,h:0.26,fontSize:8.5,color:A.inkS,fontFace:F,align:'center',valign:'middle',margin:0});
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 12 — Audience Profile Deep-Dive
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.3','The Gap This Course Fills');
  ftr(s,'Finance domain fluency + AWS architecture + AI agents = rare combination',12);

  // Three-column: Know / Will Learn / Will Build
  const cols3=[
    {x:0.42,color:A.ok,header:'You Already Know',items:['AWS core services','Python programming','Calling REST APIs','Reading architecture diagrams','Infrastructure as Code basics']},
    {x:3.46,color:A.brand,header:'You Will Learn',items:['Finance domain vocabulary','P&L, ARR, variance analysis','Bedrock Agent patterns','ReAct reasoning loops','AgentCore Gateway setup']},
    {x:6.5, color:A.violet,header:'You Will Build',items:['Working ACME Finance system','5 Lambda-backed AI tools','Production Streamlit dashboard','AI commentary pipeline','Automated board pack']},
  ];
  cols3.forEach(col=>{
    crd(s,col.x,1.05,2.9,3.9,{shadow:shL()});
    s.addShape(R,{x:col.x,y:1.05,w:2.9,h:0.42,fill:{color:col.color},line:{color:col.color}});
    s.addText(col.header,{x:col.x+0.1,y:1.05,w:2.72,h:0.42,fontSize:10,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});
    col.items.forEach((item,ii)=>{
      const bg=ii%2===0?A.card:'f8fafc';
      s.addShape(R,{x:col.x,y:1.47+ii*0.48,w:2.9,h:0.48,fill:{color:bg},line:{color:A.rule,pt:0.5}});
      s.addText(item,{x:col.x+0.14,y:1.47+ii*0.48,w:2.68,h:0.48,fontSize:8.5,color:A.inkS,fontFace:F,valign:'middle',margin:0});
    });
  });

  // Bottom insight
  s.addShape(R,{x:0.42,y:5.06,w:9.16,h:0.18,fill:{color:A.nav},line:{color:A.nav}});
  s.addText('"Most finance AI courses teach theory. This one ships a system." — by the end, you have 15+ files of production-ready code.',{x:0.55,y:5.06,w:8.9,h:0.18,fontSize:7.5,color:A.navI,fontFace:F,italic:true,valign:'middle',margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 13 — What You'll Leave With (6 checkmarks)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.3','What You\'ll Have When You\'re Done');
  ftr(s,'These are real deliverables — code, patterns, templates, and a working system',13);

  const outcomes=[
    {color:A.brand,  title:'Working ACME Finance System',    desc:'A fully functional AI finance system running on your AWS account. Demo-ready in < 30 minutes via CDK.'},
    {color:A.teal,   title:'Architecture Patterns',          desc:'Reusable patterns for Bedrock Agents, Lambda tools, and AgentCore Gateway — applicable to any domain.'},
    {color:A.violet, title:'Finance Domain Fluency',         desc:'You\'ll speak the language: P&L, ARR, EBITDA, variance, DSO — enough to partner with any CFO.'},
    {color:A.ok,     title:'Use Case Framework',             desc:'A structured way to identify, scope, and pitch AI use cases to finance stakeholders. Battle-tested framework.'},
    {color:A.warn,   title:'Business Case Template',         desc:'A complete ROI calculator and business case deck for finance AI — ready to customize for your client.'},
    {color:A.cyan,   title:'Production Checklist',           desc:'Security, monitoring, cost controls, and observability checklist for production Bedrock deployments.'},
  ];

  outcomes.forEach((o,i)=>{
    const col=i%2, row=Math.floor(i/2);
    const ox=0.42+col*4.74;
    const oy=1.05+row*1.36;
    crd(s,ox,oy,4.6,1.22,{shadow:sh()});
    s.addShape(R,{x:ox,y:oy,w:0.46,h:1.22,fill:{color:o.color},line:{color:o.color}});
    // Check mark
    s.addText('✓',{x:ox,y:oy,w:0.46,h:0.46,fontSize:16,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(o.title,{x:ox+0.56,y:oy+0.06,w:3.9,h:0.3,fontSize:10,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(o.desc,{x:ox+0.56,y:oy+0.36,w:3.9,h:0.76,fontSize:8,color:A.inkS,fontFace:F,margin:0});
  });

  // Bottom CTA
  s.addShape(R,{x:0.42,y:4.86,w:9.16,h:0.32,fill:{color:A.okS},line:{color:'c2e6c2',pt:1}});
  s.addText('All course materials — slides, code, CDK stacks, and templates — are included in the GitHub repository.',{x:0.55,y:4.86,w:8.9,h:0.32,fontSize:9,color:A.ok,fontFace:F,valign:'middle',bold:true,margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 14 — Course Roadmap (8 sections arc)
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'SECTION 1','MODULE 1.3','Your Journey — 8-Section Course Roadmap');
  ftr(s,'Each section builds on the last — Hook → Context → Strategy → Build → Scale',14);

  const sections=[
    {n:'1',title:'Hook',          desc:'Why this, why now',       color:A.brand,  x:0.32,y:1.18},
    {n:'2',title:'Finance\nDomain',desc:'P&L, ARR, data model',  color:A.teal,   x:1.48,y:1.18},
    {n:'3',title:'Strategy',      desc:'Use cases + business case',color:A.violet, x:2.64,y:1.18},
    {n:'4',title:'Data\nLayer',   desc:'Redshift + dbt + seeds',  color:A.cyan,   x:3.8, y:1.18},
    {n:'5',title:'Architecture',  desc:'AWS design patterns',      color:A.warn,   x:4.96,y:1.18},
    {n:'6',title:'Agent\nBuild',  desc:'Bedrock + Lambda tools',   color:A.orange, x:6.12,y:1.18},
    {n:'7',title:'Production',    desc:'AgentCore + memory',       color:A.red,    x:7.28,y:1.18},
    {n:'8',title:'Scale',         desc:'Commentary + board pack',  color:A.ok,     x:8.44,y:1.18},
  ];

  // Timeline baseline
  s.addShape(R,{x:0.32,y:2.9,w:9.36,h:0.04,fill:{color:A.ruleH},line:{color:A.ruleH}});

  sections.forEach((sec,i)=>{
    const w=1.04;
    // Section block
    crd(s,sec.x,sec.y,w,1.6,{shadow:sh()});
    s.addShape(R,{x:sec.x,y:sec.y,w:w,h:0.38,fill:{color:sec.color},line:{color:sec.color}});
    s.addText(sec.n,{x:sec.x,y:sec.y,w:w,h:0.38,fontSize:13,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(sec.title,{x:sec.x+0.04,y:sec.y+0.42,w:w-0.08,h:0.58,fontSize:8,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
    s.addText(sec.desc,{x:sec.x+0.04,y:sec.y+1.02,w:w-0.08,h:0.5,fontSize:6.5,color:A.inkD,fontFace:F,align:'center',margin:0});
    // Dot on timeline
    s.addShape(OV,{x:sec.x+0.44,y:2.84,w:0.14,h:0.14,fill:{color:sec.color},line:{color:sec.color}});
    // Connector from block to dot
    s.addShape(R,{x:sec.x+0.505,y:2.78,w:0.02,h:0.12,fill:{color:sec.color},line:{color:sec.color}});
  });

  // You are here marker
  s.addShape(R,{x:0.32,y:2.98,w:1.18,h:0.3,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('YOU ARE HERE',{x:0.32,y:2.98,w:1.18,h:0.3,fontSize:6.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});

  // Section tags below timeline
  const tags=['Foundation','Domain','Strategy','Infrastructure','Architecture','AI/ML','Production','Scale'];
  sections.forEach((sec,i)=>{
    s.addText(tags[i],{x:sec.x,y:3.34,w:1.04,h:0.26,fontSize:6.5,color:A.inkM,fontFace:F,align:'center',margin:0});
  });

  // Outcome arrow
  s.addShape(R,{x:0.32,y:3.72,w:9.36,h:0.42,fill:{color:A.nav},line:{color:A.nav}});
  s.addText('END GOAL:  Working finance AI agent on AWS  ·  Deploying in production  ·  Presenting to CFO',{x:0.45,y:3.72,w:9.1,h:0.42,fontSize:9,bold:true,color:A.navI,fontFace:F,valign:'middle',margin:0});

  // Time estimate
  s.addText('Estimated completion: 16–20 hours of focused study + build time',{x:0.32,y:4.24,w:9.36,h:0.28,fontSize:8.5,color:A.inkD,fontFace:F,align:'center',italic:true,margin:0});
}

// ══════════════════════════════════════════════════════
// SLIDE 15 — Section 1 Recap + Next Section
// ══════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('SECTION 1  ·  RECAP',{x:0.42,y:0.1,w:8,h:0.22,fontSize:7.5,color:A.navM,fontFace:F,margin:0});
  s.addText('Section 1 Complete',{x:0.42,y:0.31,w:9.0,h:0.52,fontSize:21,bold:true,color:A.W,fontFace:F,margin:0});
  s.addShape(R,{x:0.42,y:0.88,w:9.16,h:0.015,fill:{color:'1e2d45'},line:{color:'1e2d45'}});

  // Recap checklist
  const recaps=[
    'You saw the finished system answer two real finance questions — live, no SQL, no dashboards',
    'Revenue query: $1,807.9M in < 2 seconds via NL → Bedrock Agent → Lambda → Redshift',
    'Margin trend: +8.9% → +5.5% → −9.4% — profitable company swung to a $170M operating loss',
    'Under the hood: 4-step ReAct loop — Plan → Select Tool → Execute → Answer',
    'You\'ll build: Streamlit UI + FastAPI + Bedrock Agent + 5 tools + Redshift in 10 phases',
    'This course is for Solution Architects who want working code, not theory',
  ];
  recaps.forEach((r,i)=>{
    s.addShape(OV,{x:0.42,y:1.1+i*0.58,w:0.28,h:0.28,fill:{color:A.brand},line:{color:A.brand}});
    s.addText('✓',{x:0.42,y:1.1+i*0.58,w:0.28,h:0.28,fontSize:9,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(r,{x:0.82,y:1.1+i*0.58,w:8.7,h:0.44,fontSize:9.5,color:A.navI,fontFace:F,valign:'middle',margin:0});
  });

  // Next section CTA
  s.addShape(R,{x:0.42,y:4.85,w:9.16,h:0.38,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('Next: Section 2 — Finance Domain and the Problem We\'re Solving  →',{x:0.55,y:4.85,w:8.9,h:0.38,fontSize:10.5,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});

  // Footer
  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:'080f1c'},line:{color:'080f1c'}});
  s.addText('Finance AI Agents on AWS — Section 1 Complete',{x:0.42,y:5.335,w:7.5,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',margin:0});
  s.addText(`${TOT} / ${TOT}`,{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',align:'right',margin:0});
}

// ── WRITE FILE ─────────────────────────────────────────
pres.writeFile({fileName:OUT}).then(()=>{
  console.log(`✓ Saved: ${OUT}`);
}).catch(e=>{
  console.error('Error:', e);
  process.exit(1);
});

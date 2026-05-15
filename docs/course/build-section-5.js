"use strict";
const pptxgen = require("pptxgenjs");
const path = require("path");

// ── Design Tokens (Atlas) ─────────────────────────────────────────────────────
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
  cyan:'3093a8', cyanS:'e1f4f4',
  W:'FFFFFF',
};
const F='Calibri', FM='Consolas';
const SW=10, SH=5.625, TOT=18;
const OUT=path.join(__dirname,'section-5-slides.pptx');
const pres=new pptxgen();
pres.layout='LAYOUT_16x9';
pres.author='ACME Finance Course';
pres.title='Section 5 — Reference Architecture';
const R=pres.shapes.RECTANGLE, OV=pres.shapes.OVAL;

// ── Shadow helpers ────────────────────────────────────────────────────────────
const sh =()=>({type:'outer',blur:8, offset:2,angle:135,color:'0b1220',opacity:0.08});
const shL=()=>({type:'outer',blur:16,offset:4,angle:135,color:'0b1220',opacity:0.14});

// ── Layout helpers ────────────────────────────────────────────────────────────
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

// ── Module intro slide (dark) ─────────────────────────────────────────────────
function modIntro(s,sec,modNum,modTitle,duration,desc,slideN){
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.cyan},line:{color:A.cyan}});
  s.addText('SECTION 5',{x:0.55,y:0.22,w:3,h:0.24,fontSize:8.5,bold:true,color:A.navM,fontFace:F,margin:0});
  // Large module number watermark
  s.addText(modNum,{x:6.2,y:0.1,w:3.6,h:3.8,fontSize:180,bold:true,color:'131f35',fontFace:F,align:'right',margin:0});
  // Cyan left bar
  s.addShape(R,{x:0.55,y:0.72,w:0.06,h:1.6,fill:{color:A.cyan},line:{color:A.cyan}});
  s.addText(sec,{x:0.72,y:0.72,w:5.5,h:0.28,fontSize:9,bold:true,color:A.cyan,fontFace:F,margin:0});
  s.addText(modTitle,{x:0.72,y:0.98,w:5.8,h:0.9,fontSize:24,bold:true,color:A.W,fontFace:F,margin:0});
  s.addText(desc,{x:0.72,y:1.94,w:5.8,h:0.38,fontSize:9.5,color:A.navI,fontFace:F,margin:0});
  // Duration badge
  s.addShape(R,{x:0.72,y:2.52,w:1.05,h:0.26,fill:{color:A.cyan},line:{color:A.cyan}});
  s.addText(duration,{x:0.72,y:2.52,w:1.05,h:0.26,fontSize:7.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
  ftr(s,`Section 5  ·  Reference Architecture`,slideN,true);
}

// ── Arrow helper (right-pointing) ────────────────────────────────────────────
function arrow(s,x,y,w,col){
  s.addShape(R,{x,y:y+0.07,w:w-0.14,h:0.1,fill:{color:col},line:{color:col}});
  // arrowhead triangle via text character
  s.addText('▶',{x:x+w-0.2,y:y,w:0.22,h:0.24,fontSize:9,color:col,fontFace:F,align:'left',valign:'middle',margin:0});
}

// ── Component box helper ──────────────────────────────────────────────────────
function compBox(s,x,y,w,h,label,sub,bg,border,textCol){
  s.addShape(R,{x,y,w,h,fill:{color:bg||A.brandS},line:{color:border||A.brand,pt:1.2},shadow:sh()});
  s.addText(label,{x:x+0.06,y:y+0.06,w:w-0.12,h:h*0.48,fontSize:8.5,bold:true,color:textCol||A.ink,fontFace:F,align:'center',valign:'bottom',margin:0});
  if(sub) s.addText(sub,{x:x+0.06,y:y+h*0.5,w:w-0.12,h:h*0.44,fontSize:7,color:textCol?A.navM:A.inkD,fontFace:F,align:'center',valign:'top',margin:0});
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Section Divider
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.cyan},line:{color:A.cyan}});
  // Large section number watermark
  s.addText('5',{x:5.6,y:0.1,w:4.2,h:3.8,fontSize:220,bold:true,color:'131f35',fontFace:F,align:'right',margin:0});
  // Left accent bar
  s.addShape(R,{x:0.55,y:0.72,w:0.07,h:2.0,fill:{color:A.cyan},line:{color:A.cyan}});
  s.addText('SECTION',{x:0.73,y:0.72,w:3,h:0.28,fontSize:8.5,bold:true,color:A.navM,fontFace:F,margin:0});
  s.addText('Reference\nArchitecture',{x:0.73,y:0.98,w:5.2,h:1.0,fontSize:30,bold:true,color:A.W,fontFace:F,margin:0});
  s.addText('45 min  ·  5 modules  ·  18 slides',{x:0.73,y:2.06,w:4.5,h:0.28,fontSize:9,color:A.navI,fontFace:F,margin:0});
  // Module list
  const mods=[
    ['5.1','Architecture Overview','10 min'],
    ['5.2','The Data Path','8 min'],
    ['5.3','The Request Path','10 min'],
    ['5.4','Security Model','9 min'],
    ['5.5','Observability & Monitoring','8 min'],
  ];
  mods.forEach(([num,title,dur],i)=>{
    const y=2.5+i*0.44;
    s.addShape(R,{x:0.73,y:y+0.03,w:0.28,h:0.28,fill:{color:A.cyan},line:{color:A.cyan}});
    s.addText(num,{x:0.73,y:y+0.03,w:0.28,h:0.28,fontSize:7,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(title,{x:1.08,y:y,w:3.6,h:0.34,fontSize:9,color:A.navI,fontFace:F,valign:'middle',margin:0});
    s.addText(dur,{x:4.72,y:y,w:0.9,h:0.34,fontSize:8,color:A.navM,fontFace:F,valign:'middle',align:'right',margin:0});
  });
  // Footer
  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:'080f1c'},line:{color:'080f1c'}});
  s.addText('Section 5  ·  Reference Architecture',{x:0.42,y:5.335,w:8.5,h:0.27,fontSize:8,color:A.navM,fontFace:F,valign:'middle',margin:0});
  s.addText('1 / 18',{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',align:'right',margin:0});
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — Full System Architecture Diagram
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 5','Module 5.1 — Architecture Overview','ACME Finance: Full System Architecture');
  ftr(s,'3 layers — Presentation · Orchestration · Data',2);

  // ── Coordinates ───────────────────────────────────────────────────────────
  // Layer Y positions
  const pY=1.0,  pH=0.88;   // Presentation band
  const oY=2.04, oH=1.82;   // Orchestration band
  const dY=4.0,  dH=1.04;   // Data band

  // Component box dimensions (orchestration row)
  const bh=0.78; // box height in orchestration layer
  const bY=oY+0.5; // component top Y

  // X positions for 5 orchestration components (evenly spaced)
  // Cols: Memory | Bedrock | FastAPI | Gateway | Lambda
  const cx=[0.36, 1.98, 3.68, 5.38, 7.2];
  const cw=[1.52, 1.58, 1.58, 1.70, 2.48];

  // ── Layer bands ───────────────────────────────────────────────────────────
  // Presentation
  s.addShape(R,{x:0.28,y:pY,w:9.44,h:pH,fill:{color:'eef6fb'},line:{color:A.cyan,pt:0.8}});
  s.addText('PRESENTATION',{x:0.38,y:pY+0.04,w:1.8,h:0.2,fontSize:6.5,bold:true,color:A.cyan,fontFace:F,margin:0});

  // Orchestration
  s.addShape(R,{x:0.28,y:oY,w:9.44,h:oH,fill:{color:'eef0f4'},line:{color:A.inkM,pt:0.8}});
  s.addText('ORCHESTRATION',{x:0.38,y:oY+0.04,w:2.0,h:0.2,fontSize:6.5,bold:true,color:A.inkD,fontFace:F,margin:0});

  // Data
  s.addShape(R,{x:0.28,y:dY,w:9.44,h:dH,fill:{color:A.okS},line:{color:A.ok,pt:0.8}});
  s.addText('DATA',{x:0.38,y:dY+0.04,w:0.8,h:0.2,fontSize:6.5,bold:true,color:A.ok,fontFace:F,margin:0});

  // ── Presentation: Streamlit box ───────────────────────────────────────────
  // Centred in the presentation band, spanning columns 1-4 area
  const stX=0.36, stW=9.1, stY=pY+0.16, stH=0.6;
  s.addShape(R,{x:stX,y:stY,w:stW,h:stH,fill:{color:A.brandS},line:{color:A.brand,pt:1.2},shadow:sh()});
  s.addText('Streamlit UI',{x:stX+0.12,y:stY+0.04,w:1.4,h:0.28,fontSize:9,bold:true,color:A.ink,fontFace:F,margin:0});
  s.addText('port 8501',{x:stX+0.12,y:stY+0.32,w:1.4,h:0.2,fontSize:7,color:A.inkD,fontFace:F,margin:0});
  // 6 tab pills
  const tabs=['P&L','ARR','AR Aging','AI Analyst','Commentary','Board Pack'];
  tabs.forEach((t,i)=>{
    const tx=stX+1.72+i*1.24;
    s.addShape(R,{x:tx,y:stY+0.12,w:1.14,h:0.36,fill:{color:A.brand},line:{color:A.brand}});
    s.addText(t,{x:tx,y:stY+0.12,w:1.14,h:0.36,fontSize:7.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
  });

  // ── Orchestration components ──────────────────────────────────────────────
  // 0: AgentCore Memory
  s.addShape(R,{x:cx[0],y:bY,w:cw[0],h:bh,fill:{color:A.violetS},line:{color:'6c4ad9',pt:1.2},shadow:sh()});
  s.addText('AgentCore\nMemory',{x:cx[0]+0.08,y:bY+0.05,w:cw[0]-0.14,h:0.4,fontSize:8.5,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
  s.addText('SEMANTIC store\ncross-session',{x:cx[0]+0.08,y:bY+0.44,w:cw[0]-0.14,h:0.3,fontSize:6.5,color:A.inkD,fontFace:F,align:'center',margin:0});

  // 1: Bedrock Agent
  s.addShape(R,{x:cx[1],y:bY,w:cw[1],h:bh,fill:{color:A.brandS},line:{color:A.brand,pt:1.2},shadow:sh()});
  s.addText('Bedrock Agent',{x:cx[1]+0.08,y:bY+0.05,w:cw[1]-0.14,h:0.28,fontSize:8.5,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
  s.addText('Claude Sonnet\nLUUHZWRDA4',{x:cx[1]+0.08,y:bY+0.34,w:cw[1]-0.14,h:0.38,fontSize:6.5,color:A.inkD,fontFace:F,align:'center',margin:0});

  // 2: FastAPI
  s.addShape(R,{x:cx[2],y:bY,w:cw[2],h:bh,fill:{color:A.card},line:{color:A.inkM,pt:1.2},shadow:sh()});
  s.addText('FastAPI',{x:cx[2]+0.08,y:bY+0.05,w:cw[2]-0.14,h:0.28,fontSize:8.5,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
  s.addText('port 8000\n/chat /metrics/*',{x:cx[2]+0.08,y:bY+0.34,w:cw[2]-0.14,h:0.38,fontSize:6.5,color:A.inkD,fontFace:FM,align:'center',margin:0});

  // 3: AgentCore Gateway
  s.addShape(R,{x:cx[3],y:bY,w:cw[3],h:bh,fill:{color:A.cyanS},line:{color:A.cyan,pt:1.2},shadow:sh()});
  s.addText('AgentCore\nGateway',{x:cx[3]+0.08,y:bY+0.05,w:cw[3]-0.14,h:0.4,fontSize:8.5,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
  s.addText('MCP 2025-03-26\ntool registry',{x:cx[3]+0.08,y:bY+0.44,w:cw[3]-0.14,h:0.3,fontSize:6.5,color:A.inkD,fontFace:F,align:'center',margin:0});

  // 4: Lambda group
  s.addShape(R,{x:cx[4],y:bY,w:cw[4],h:bh,fill:{color:A.warnS},line:{color:A.warn,pt:1.2},shadow:sh()});
  s.addText('Lambda Functions (5)',{x:cx[4]+0.1,y:bY+0.04,w:cw[4]-0.18,h:0.22,fontSize:7.5,bold:true,color:A.warn,fontFace:F,margin:0});
  ['text_to_sql','forecast','variance_rca','whatif_sim','describe_metric'].forEach((fn,i)=>{
    s.addShape(R,{x:cx[4]+0.1,y:bY+0.27+i*0.1,w:cw[4]-0.2,h:0.09,fill:{color:A.card},line:{color:A.ruleH,pt:0.3}});
    s.addText(fn,{x:cx[4]+0.14,y:bY+0.27+i*0.1,w:cw[4]-0.26,h:0.09,fontSize:5.5,color:A.inkS,fontFace:FM,valign:'middle',margin:0});
  });

  // ── Data: Redshift box ────────────────────────────────────────────────────
  const rsX=1.8, rsW=6.2, rsY=dY+0.18, rsH=0.7;
  s.addShape(R,{x:rsX,y:rsY,w:rsW,h:rsH,fill:{color:A.okS},line:{color:A.ok,pt:1.4},shadow:sh()});
  s.addText('Redshift Serverless',{x:rsX+0.14,y:rsY+0.06,w:2.8,h:0.28,fontSize:9,bold:true,color:A.ink,fontFace:F,margin:0});
  s.addText('acme-finance-dev  ·  analytics_dev_marts schema',{x:rsX+0.14,y:rsY+0.36,w:5.8,h:0.24,fontSize:7.5,color:A.inkD,fontFace:F,margin:0});

  // ── Connection lines (clean, no overlap) ──────────────────────────────────
  // Line thickness
  const lh=0.035;
  const midY=bY+bh/2; // vertical midpoint of orchestration row

  // 1. Streamlit → FastAPI  (vertical drop from presentation to FastAPI box)
  const stMidX=cx[2]+cw[2]/2;
  s.addShape(R,{x:stMidX-lh/2,y:pY+pH,w:lh,h:oY-pY-pH+0.5,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('GET / POST',{x:stMidX+0.06,y:pY+pH+0.06,w:1.0,h:0.2,fontSize:6,color:A.brand,fontFace:F,margin:0});

  // 2. FastAPI ↔ Bedrock Agent (horizontal at midY)
  const faR=cx[2]; // FastAPI left edge
  const baR=cx[1]+cw[1]; // Bedrock right edge
  s.addShape(R,{x:baR,y:midY-lh/2,w:faR-baR,h:lh,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('invoke',{x:baR+0.04,y:midY-0.2,w:0.7,h:0.18,fontSize:6,bold:true,color:A.brand,fontFace:F,margin:0});

  // 3. FastAPI ↔ AgentCore Memory (horizontal at midY)
  const baL=cx[1]; // Bedrock left edge
  const amR=cx[0]+cw[0]; // Memory right edge
  s.addShape(R,{x:amR,y:midY-lh/2,w:baL-amR,h:lh,fill:{color:'6c4ad9'},line:{color:'6c4ad9'}});
  s.addText('retrieve/\nstore',{x:amR+0.02,y:midY-0.28,w:0.82,h:0.26,fontSize:5.5,color:'6c4ad9',fontFace:F,align:'center',margin:0});

  // 4. Bedrock Agent → Gateway (horizontal at midY)
  const faL2=cx[2]+cw[2]; // FastAPI right edge
  const gwL=cx[3]; // Gateway left edge
  s.addShape(R,{x:faL2,y:midY-lh/2,w:gwL-faL2,h:lh,fill:{color:A.cyan},line:{color:A.cyan}});
  s.addText('MCP',{x:faL2+0.04,y:midY-0.2,w:0.52,h:0.18,fontSize:6,bold:true,color:A.cyan,fontFace:F,margin:0});

  // 5. Gateway → Lambda (horizontal at midY)
  const gwR=cx[3]+cw[3]; // Gateway right edge
  const lmL=cx[4]; // Lambda left edge
  s.addShape(R,{x:gwR,y:midY-lh/2,w:lmL-gwR,h:lh,fill:{color:A.warn},line:{color:A.warn}});
  s.addText('route',{x:gwR+0.02,y:midY-0.2,w:0.52,h:0.18,fontSize:6,bold:true,color:A.warn,fontFace:F,margin:0});

  // 6. Lambda → Redshift (vertical drop from Lambda mid to Redshift)
  const lmMidX=cx[4]+cw[4]/2;
  s.addShape(R,{x:lmMidX-lh/2,y:bY+bh,w:lh,h:dY-bY-bh+rsY-dY,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('Data\nAPI',{x:lmMidX+0.06,y:bY+bh+0.1,w:0.56,h:0.32,fontSize:6,color:A.ok,fontFace:F,margin:0});

  // 7. FastAPI → Redshift direct (vertical drop from FastAPI mid)
  const faMidX=cx[2]+cw[2]/2;
  s.addShape(R,{x:faMidX-lh/2,y:bY+bh,w:lh,h:dY-bY-bh+rsY-dY,fill:{color:A.inkM},line:{color:A.inkM}});
  s.addText('direct\nmetrics',{x:faMidX+0.06,y:bY+bh+0.06,w:0.7,h:0.32,fontSize:6,color:A.inkD,fontFace:F,margin:0});
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — Component Inventory Table
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 5','Module 5.1 — Architecture Overview','Component Inventory');
  ftr(s,'9 components — 3 layers — every dependency is explicit',3);

  const rows=[
    ['Component','Type','Layer','Key Configuration'],
    ['Streamlit UI','Web App','Presentation','Port 8501  ·  6 tabs: P&L, ARR, AR Aging, AI Analyst, Commentary, Board Pack'],
    ['FastAPI','REST API','Orchestration','Port 8000  ·  /chat /commentary /boardpack /metrics/* /health'],
    ['Bedrock Agent','LLM Orchestrator','Orchestration','Claude Sonnet  ·  Agent ID: LUUHZWRDA4  ·  ReAct loop'],
    ['AgentCore Gateway','Tool Registry','Orchestration','MCP protocol 2025-03-26  ·  routes calls to 5 Lambdas'],
    ['Lambda: text_to_sql','Function','Orchestration','NL → SQL  ·  Redshift Data API  ·  schema-aware'],
    ['Lambda: forecast','Function','Orchestration','4-quarter revenue & expense projections'],
    ['Lambda: variance_rca','Function','Orchestration','Actuals vs plan  ·  ranked by cost center'],
    ['Lambda: whatif_sim','Function','Orchestration','Percentage change simulations on P&L lines'],
    ['Lambda: describe_metric','Function','Orchestration','Business glossary  ·  metric definitions'],
    ['AgentCore Memory','Semantic Store','Orchestration','Cross-session analyst memory  ·  top-5 retrieval'],
    ['Redshift Serverless','Data Warehouse','Data','Workgroup: acme-finance-dev  ·  schema: analytics_dev_marts'],
  ];
  // Use narrower columns to fit
  tbl(s,rows,[2.05,1.25,1.12,4.8],0.28,0.97,{rh:0.33});
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Design Principle
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 5','Module 5.1 — Architecture Overview','The Core Design Principle');
  ftr(s,'Auditable by design — every AI call is traceable end-to-end',4);

  // Pull-quote card
  s.addShape(R,{x:0.55,y:1.08,w:8.9,h:1.7,fill:{color:A.nav},line:{color:A.nav},shadow:shL()});
  s.addShape(R,{x:0.55,y:1.08,w:0.1,h:1.7,fill:{color:A.cyan},line:{color:A.cyan}});
  s.addText('"Every AI call goes through\nBedrock Agent → Gateway → Lambda → Redshift.\nNo direct DB access from the UI."',{
    x:0.82,y:1.16,w:8.4,h:1.52,fontSize:16,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0
  });

  // Why it matters — 3 cards
  const pts=[
    {icon:'🔍',title:'Auditable',body:'Every query is logged. Bedrock traces every ReAct step. You can replay any conversation.',accent:A.cyan},
    {icon:'🔄',title:'Replaceable',body:'Swap Claude for another model, swap Lambda logic, swap Redshift — the contract stays the same.',accent:A.violet},
    {icon:'🔒',title:'Controllable',body:'The UI has zero data permissions. Lambda roles are narrowly scoped. No surprise access paths.',accent:A.ok},
  ];
  pts.forEach((p,i)=>{
    const x=0.55+i*3.12;
    crd(s,x,3.02,2.92,1.88,{accent:p.accent});
    s.addText(p.icon,{x:x+0.18,y:3.1,w:0.5,h:0.38,fontSize:18,fontFace:F,margin:0});
    s.addText(p.title,{x:x+0.18,y:3.5,w:2.6,h:0.28,fontSize:11,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(p.body,{x:x+0.18,y:3.82,w:2.6,h:0.96,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — Module 5.2 Intro
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  modIntro(s,'Module 5.2 — The Data Path','5.2',
    'How a Dashboard\nQuery Flows',
    '8 min',
    'Tracing the direct metrics path from browser to Redshift — no agent involved.',
    5);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Data Path Trace: P&L Tab
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 5','Module 5.2 — The Data Path','Direct Metrics Path: The P&L Tab');
  ftr(s,'Direct path bypasses the agent — optimised for speed and predictability',6);

  // Step flow — horizontal pipeline
  const steps=[
    {n:'1',label:'Browser\nloads tab',sub:'Streamlit',bg:A.brandS,border:A.brand},
    {n:'2',label:'GET\n/metrics/pl',sub:'HTTP request',bg:A.card,border:A.inkM},
    {n:'3',label:'FastAPI\nqueries',sub:'Redshift\nData API',bg:A.card,border:A.inkM},
    {n:'4',label:'SQL runs\non Redshift',sub:'analytics_dev_marts',bg:A.okS,border:A.ok},
    {n:'5',label:'JSON\nreturned',sub:'structured rows',bg:A.card,border:A.inkM},
    {n:'6',label:'Plotly\nrenders chart',sub:'Streamlit',bg:A.brandS,border:A.brand},
  ];
  const bw=1.38, bh=1.1, gap=0.12, startX=0.32, y=1.22;
  steps.forEach((st,i)=>{
    const x=startX+i*(bw+gap);
    s.addShape(R,{x,y,w:bw,h:bh,fill:{color:st.bg},line:{color:st.border,pt:1.2},shadow:sh()});
    // step number circle
    s.addShape(OV,{x:x+0.04,y:y+0.05,w:0.3,h:0.3,fill:{color:st.border},line:{color:st.border}});
    s.addText(st.n,{x:x+0.04,y:y+0.05,w:0.3,h:0.3,fontSize:8,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(st.label,{x:x+0.07,y:y+0.38,w:bw-0.12,h:0.42,fontSize:9,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
    s.addText(st.sub,{x:x+0.07,y:y+0.8,w:bw-0.12,h:0.24,fontSize:7.5,color:A.inkD,fontFace:F,align:'center',margin:0});
    // Arrow between steps
    if(i<steps.length-1){
      s.addText('▶',{x:x+bw+0.01,y:y+0.42,w:0.14,h:0.26,fontSize:9,color:A.inkM,fontFace:F,align:'center',valign:'middle',margin:0});
    }
  });

  // Key point callout box
  s.addShape(R,{x:0.32,y:2.56,w:9.36,h:0.58,fill:{color:A.cyanS},line:{color:A.cyan,pt:1}});
  s.addShape(R,{x:0.32,y:2.56,w:0.06,h:0.58,fill:{color:A.cyan},line:{color:A.cyan}});
  s.addText('Key insight:',{x:0.5,y:2.6,w:0.9,h:0.22,fontSize:8.5,bold:true,color:A.cyan,fontFace:F,margin:0});
  s.addText('FastAPI queries Redshift directly for all /metrics/* endpoints. No Bedrock, no Lambda, no agent loop. This gives sub-second response times for dashboard rendering.',{
    x:1.4,y:2.6,w:7.98,h:0.46,fontSize:8.5,color:A.inkS,fontFace:F,valign:'middle',margin:0
  });

  // Latency bar
  s.addShape(R,{x:0.32,y:3.36,w:9.36,h:0.58,fill:{color:A.card},line:{color:A.rule,pt:1},shadow:sh()});
  s.addText('Typical latency:',{x:0.48,y:3.42,w:1.4,h:0.22,fontSize:8,bold:true,color:A.inkD,fontFace:F,margin:0});
  const lats=[['FastAPI overhead','< 20 ms'],['Redshift query (warm)','200–800 ms'],['Chart render','< 100 ms'],['Total end-to-end','< 1 s']];
  lats.forEach(([k,v],i)=>{
    const lx=1.95+i*1.85;
    s.addText(k,{x:lx,y:3.38,w:1.72,h:0.22,fontSize:7.5,color:A.inkD,fontFace:F,align:'center',margin:0});
    s.addText(v,{x:lx,y:3.6,w:1.72,h:0.28,fontSize:10,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
  });

  // FastAPI endpoints involved
  s.addShape(R,{x:0.32,y:4.1,w:9.36,h:1.0,fill:{color:A.card},line:{color:A.rule,pt:1},shadow:sh()});
  s.addText('FastAPI direct endpoints (no agent):',{x:0.48,y:4.14,w:4,h:0.24,fontSize:8.5,bold:true,color:A.inkD,fontFace:F,margin:0});
  const eps=['/metrics/pl','/metrics/arr','/metrics/ar_aging','/metrics/revenue','/health'];
  eps.forEach((ep,i)=>{
    const ex=0.55+i*1.78;
    s.addShape(R,{x:ex,y:4.42,w:1.66,h:0.28,fill:{color:A.bgS},line:{color:A.ruleH,pt:0.5}});
    s.addText(ep,{x:ex+0.06,y:4.42,w:1.54,h:0.28,fontSize:7.5,color:A.inkS,fontFace:FM,valign:'middle',margin:0});
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Why Two Paths
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 5','Module 5.2 — The Data Path','Why Two Paths? Agent vs Direct');
  ftr(s,'"The agent is for reasoning. The direct endpoints are for rendering."',7);

  // Two columns
  // Left: Agent path
  s.addShape(R,{x:0.32,y:1.02,w:4.5,h:3.92,fill:{color:A.brandS},line:{color:A.brand,pt:1.2},shadow:sh()});
  s.addShape(R,{x:0.32,y:1.02,w:4.5,h:0.38,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('AGENT PATH',{x:0.4,y:1.06,w:4.3,h:0.28,fontSize:10,bold:true,color:A.W,fontFace:F,margin:0});

  const agentPts=[
    ['Use case','Natural language questions, complex analysis, What-If scenarios, multi-step reasoning'],
    ['Trigger','POST /chat or /commentary — user types a question'],
    ['Flow','FastAPI → Memory retrieve → Bedrock Agent → Gateway → Lambda → Redshift → answer'],
    ['Latency','3–6 seconds (inference + Lambda + Redshift)'],
    ['Why this path?','The agent can reason, choose tools, iterate. You cannot pre-define every question a CFO might ask.'],
  ];
  agentPts.forEach(([k,v],i)=>{
    const y=1.5+i*0.5;
    s.addText(k+':',{x:0.44,y,w:1.1,h:0.2,fontSize:7.5,bold:true,color:A.brand,fontFace:F,margin:0});
    s.addText(v,{x:0.44,y:y+0.2,w:4.22,h:0.28,fontSize:7.5,color:A.inkS,fontFace:F,margin:0});
  });

  // Right: Direct path
  s.addShape(R,{x:5.18,y:1.02,w:4.5,h:3.92,fill:{color:A.okS},line:{color:A.ok,pt:1.2},shadow:sh()});
  s.addShape(R,{x:5.18,y:1.02,w:4.5,h:0.38,fill:{color:A.ok},line:{color:A.ok}});
  s.addText('DIRECT PATH',{x:5.26,y:1.06,w:4.3,h:0.28,fontSize:10,bold:true,color:A.W,fontFace:F,margin:0});

  const directPts=[
    ['Use case','Dashboard rendering, chart data, KPI tiles, health checks'],
    ['Trigger','GET /metrics/* — called on tab load or page refresh'],
    ['Flow','FastAPI → Redshift Data API → JSON → Plotly chart'],
    ['Latency','< 1 second (no inference, warm Redshift)'],
    ['Why this path?','Dashboard queries are predictable. Pre-defined SQL is faster, cheaper, and easier to cache.'],
  ];
  directPts.forEach(([k,v],i)=>{
    const y=1.5+i*0.5;
    s.addText(k+':',{x:5.3,y,w:1.1,h:0.2,fontSize:7.5,bold:true,color:A.ok,fontFace:F,margin:0});
    s.addText(v,{x:5.3,y:y+0.2,w:4.22,h:0.28,fontSize:7.5,color:A.inkS,fontFace:F,margin:0});
  });

  // VS badge in centre
  s.addShape(OV,{x:4.68,y:2.66,w:0.62,h:0.62,fill:{color:A.nav},line:{color:A.nav},shadow:sh()});
  s.addText('VS',{x:4.68,y:2.66,w:0.62,h:0.62,fontSize:10,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});

  // Quote bar at bottom
  s.addShape(R,{x:0.32,y:5.04,w:9.36,h:0.22,fill:{color:A.nav},line:{color:A.nav}});
  s.addText('"The agent is for reasoning.  The direct endpoints are for rendering."',{
    x:0.42,y:5.04,w:9.16,h:0.22,fontSize:8.5,italic:true,bold:true,color:A.cyan,fontFace:F,align:'center',valign:'middle',margin:0
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — Module 5.3 Intro
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  modIntro(s,'Module 5.3 — The Request Path','5.3',
    'How a Natural Language\nQuery Flows',
    '10 min',
    'End-to-end NL query trace — ReAct loop, memory, tool routing, and response.',
    8);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Request Path Step by Step
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 5','Module 5.3 — The Request Path','NL Query: 7-Step End-to-End Flow');
  ftr(s,'Memory → Agent → Gateway → Lambda → Redshift → Memory → Response',9);

  const steps=[
    {n:'1',label:'User types question',sub:'Streamlit AI Analyst tab',color:A.brand},
    {n:'2',label:'POST /chat',sub:'FastAPI receives request',color:A.inkM},
    {n:'3',label:'Retrieve memory',sub:'AgentCore top-5 records',color:'6c4ad9'},
    {n:'4',label:'Invoke Bedrock Agent',sub:'question + memory context',color:A.brand},
    {n:'5',label:'ReAct loop',sub:'Reason → Act → Observe',color:A.cyan},
    {n:'6',label:'Store to memory',sub:'AgentCore Q&A record',color:'6c4ad9'},
    {n:'7',label:'Response to UI',sub:'Streamlit renders answer',color:A.brand},
  ];

  // Vertical stepper layout
  steps.forEach((st,i)=>{
    const y=1.04+i*0.56;
    // connector line
    if(i<steps.length-1){
      s.addShape(R,{x:0.6,y:y+0.36,w:0.04,h:0.24,fill:{color:A.rule},line:{color:A.rule}});
    }
    // circle
    s.addShape(OV,{x:0.42,y:y+0.02,w:0.34,h:0.34,fill:{color:st.color},line:{color:st.color}});
    s.addText(st.n,{x:0.42,y:y+0.02,w:0.34,h:0.34,fontSize:9,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    // Label
    s.addText(st.label,{x:0.88,y:y+0.02,w:3.4,h:0.2,fontSize:9,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(st.sub,{x:0.88,y:y+0.22,w:3.4,h:0.18,fontSize:7.5,color:A.inkD,fontFace:F,margin:0});
  });

  // Step 5 detail panel (ReAct) — right column
  s.addShape(R,{x:4.62,y:1.04,w:5.02,h:3.76,fill:{color:A.card},line:{color:A.cyan,pt:1.2},shadow:sh()});
  s.addShape(R,{x:4.62,y:1.04,w:5.02,h:0.32,fill:{color:A.cyan},line:{color:A.cyan}});
  s.addText('Step 5 Detail — The ReAct Loop',{x:4.72,y:1.07,w:4.82,h:0.26,fontSize:9,bold:true,color:A.W,fontFace:F,margin:0});

  const react=[
    ['REASON','Which tool do I need? The user asked about variance — I should call variance_rca.',A.brand],
    ['ACT','Call AgentCore Gateway: variance_rca(quarter="Q4", region="EMEA")',A.cyan],
    ['OBSERVE','Gateway routes to Lambda. Lambda queries fct_gl_entries vs stg_epm__plan_line. Returns ranked list.',A.ok],
    ['REASON','I have the data. Let me compose a clear answer with the top 3 variances.',A.brand],
    ['FINAL','Returns structured answer with values, context, and follow-up suggestions.',A.violet],
  ];
  react.forEach(([phase,text,col],i)=>{
    const y=1.44+i*0.48;
    s.addShape(R,{x:4.74,y,w:0.72,h:0.24,fill:{color:col},line:{color:col}});
    s.addText(phase,{x:4.74,y,w:0.72,h:0.24,fontSize:6.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(text,{x:5.52,y:y+0.01,w:3.98,h:0.38,fontSize:7.5,color:A.inkS,fontFace:F,valign:'top',margin:0});
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — The ReAct Loop in Detail
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 5','Module 5.3 — The Request Path','The ReAct Loop: One Full Cycle');
  ftr(s,'Example: "What was EMEA variance in Q4?" — end-to-end through variance_rca Lambda',10);

  // Example question banner
  s.addShape(R,{x:0.32,y:1.04,w:9.36,h:0.46,fill:{color:A.nav},line:{color:A.nav}});
  s.addShape(R,{x:0.32,y:1.04,w:0.06,h:0.46,fill:{color:A.cyan},line:{color:A.cyan}});
  s.addText('User asks: ',{x:0.48,y:1.1,w:1.1,h:0.32,fontSize:9,color:A.navM,fontFace:F,valign:'middle',margin:0});
  s.addText('"What was the EMEA variance in Q4?"',{x:1.58,y:1.1,w:6.8,h:0.32,fontSize:11,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});

  // 4-box cycle
  const phases=[
    {label:'REASON',icon:'🧠',color:A.brand,bg:A.brandS,
     body:'Model reads question + memory context. Identifies need: variance analysis, EMEA region, Q4. Selects tool: variance_rca'},
    {label:'ACT',icon:'⚡',color:A.cyan,bg:A.cyanS,
     body:'Calls AgentCore Gateway via MCP. Payload: {tool:"variance_rca", quarter:"Q4", region:"EMEA"}'},
    {label:'OBSERVE',icon:'👁',color:A.ok,bg:A.okS,
     body:'Gateway routes to Lambda. Lambda runs:\nSELECT cost_center, SUM(actual-plan) AS variance FROM fct_gl_entries … ORDER BY variance DESC. Returns top-10 rows.'},
    {label:'REASON + ANSWER',icon:'✍',color:A.violet,bg:A.violetS,
     body:'Model receives ranked list. Composes: "EMEA Q4 variance was -$2.1M. Top drivers: Cloud Infra (-$0.8M), Headcount (-$0.6M)…" Returns with follow-up suggestions.'},
  ];
  const bw=4.52, bh=1.62;
  phases.forEach((p,i)=>{
    const col=i%2, row=Math.floor(i/2);
    const x=0.32+col*(bw+0.32);
    const y=1.62+row*(bh+0.22);
    s.addShape(R,{x,y,w:bw,h:bh,fill:{color:p.bg},line:{color:p.color,pt:1.2},shadow:sh()});
    s.addShape(R,{x,y,w:bw,h:0.34,fill:{color:p.color},line:{color:p.color}});
    s.addText(`${p.icon}  ${p.label}`,{x:x+0.1,y:y+0.03,w:bw-0.2,h:0.3,fontSize:9.5,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});
    s.addText(p.body,{x:x+0.12,y:y+0.4,w:bw-0.22,h:1.16,fontSize:8.5,color:A.inkS,fontFace:F,valign:'top',margin:0});
  });

  // Cycle arrows
  s.addText('▶',{x:4.74,y:2.32,w:0.34,h:0.28,fontSize:14,color:A.inkM,fontFace:F,align:'center',valign:'middle',margin:0});
  s.addText('▼',{x:2.5,y:3.22,w:0.34,h:0.28,fontSize:14,color:A.inkM,fontFace:F,align:'center',valign:'middle',margin:0});
  s.addText('◀',{x:4.74,y:3.88,w:0.34,h:0.28,fontSize:14,color:A.ok,fontFace:F,align:'center',valign:'middle',margin:0});
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — Latency Budget
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 5','Module 5.3 — The Request Path','Latency Budget: Complex NL Query');
  ftr(s,'Target: under 6 seconds for a multi-step ReAct query — optimise the hot path first',11);

  // Waterfall bars
  const items=[
    {label:'Memory retrieve (AgentCore)',ms:'~200 ms',pct:4,color:A.violet,note:'Top-5 semantic records'},
    {label:'Agent invocation start',ms:'~100 ms',pct:2,color:A.brand,note:'Bedrock API call setup'},
    {label:'Bedrock inference (per ReAct turn)',ms:'~1,200 ms',pct:22,color:A.brand,note:'1–2 turns typical; Claude Sonnet'},
    {label:'AgentCore Gateway routing',ms:'~80 ms',pct:1.5,color:A.cyan,note:'MCP tool dispatch overhead'},
    {label:'Lambda cold start',ms:'~500 ms',pct:9,color:A.warn,note:'Warm: ~50 ms — keep functions warm'},
    {label:'Redshift query (warm)',ms:'~800 ms–2 s',pct:22,color:A.ok,note:'Depends on query complexity & cluster'},
    {label:'Response serialisation',ms:'~50 ms',pct:1,color:A.inkM,note:'JSON + memory write'},
  ];
  const barX=3.0, barW=5.8, rowH=0.46, startY=1.04;
  items.forEach((it,i)=>{
    const y=startY+i*rowH;
    // Label
    s.addText(it.label,{x:0.32,y:y+0.06,w:2.6,h:0.34,fontSize:8,color:A.inkS,fontFace:F,valign:'middle',margin:0});
    // Bar
    const blen=Math.max(it.pct/100*barW,0.08);
    s.addShape(R,{x:barX,y:y+0.07,w:blen,h:0.28,fill:{color:it.color},line:{color:it.color}});
    // ms value
    s.addText(it.ms,{x:barX+blen+0.06,y:y+0.07,w:1.4,h:0.28,fontSize:8,bold:true,color:it.color,fontFace:F,valign:'middle',margin:0});
  });

  // Total callout
  s.addShape(R,{x:0.32,y:4.3,w:9.36,h:0.62,fill:{color:A.nav},line:{color:A.nav},shadow:sh()});
  s.addShape(R,{x:0.32,y:4.3,w:0.06,h:0.62,fill:{color:A.cyan},line:{color:A.cyan}});
  s.addText('Total end-to-end:',{x:0.5,y:4.36,w:2.0,h:0.22,fontSize:9,color:A.navM,fontFace:F,margin:0});
  s.addText('3–6 seconds',{x:2.56,y:4.3,w:2.4,h:0.62,fontSize:20,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});
  s.addText('for a complex multi-step query — acceptable for analysis; stream tokens for UX',{x:5.04,y:4.36,w:4.46,h:0.44,fontSize:8.5,color:A.navM,fontFace:F,valign:'middle',margin:0});

  // Alert threshold note
  s.addShape(R,{x:0.32,y:5.0,w:9.36,h:0.28,fill:{color:A.warnS},line:{color:A.warn,pt:0.8}});
  s.addText('Alert thresholds: Bedrock > 10 s · Lambda > 30 s · Redshift > 5 s (see Module 5.5)',{
    x:0.42,y:5.02,w:9.14,h:0.24,fontSize:8,color:A.warn,fontFace:F,valign:'middle',margin:0
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 12 — Module 5.4 Intro
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  modIntro(s,'Module 5.4 — Security Model','5.4',
    'Security: What\'s In,\nWhat\'s Deferred',
    '9 min',
    'IAM architecture, permission scoping, and what stays out of scope until production.',
    12);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 13 — IAM Architecture
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 5','Module 5.4 — Security Model','IAM Architecture: Permission Flow');
  ftr(s,'Least-privilege chain — each layer can only call the next, not skip ahead',13);

  // Permission chain as connected cards
  const chain=[
    {role:'Bedrock Agent Role',perms:['bedrock-agentcore:InvokeTool'],color:A.brand,icon:'🤖'},
    {role:'AgentCore Gateway Role',perms:['lambda:InvokeFunction','(5 specific ARNs only)'],color:A.cyan,icon:'🔀'},
    {role:'Lambda Execution Roles',perms:['redshift-data:ExecuteStatement','redshift-data:GetStatementResult','(specific workgroup only)'],color:A.ok,icon:'λ'},
    {role:'FastAPI (Dev)',perms:['bedrock-agent-runtime:InvokeAgent','redshift-data:*','(analytics_dev_marts only)'],color:A.warn,icon:'🚀'},
  ];
  const bh=1.1, gap=0.12;
  const bw=(SW-0.64-(chain.length-1)*gap)/chain.length;
  chain.forEach((ch,i)=>{
    const x=0.32+i*(bw+gap);
    s.addShape(R,{x,y:1.06,w:bw,h:bh,fill:{color:A.card},line:{color:ch.color,pt:1.5},shadow:sh()});
    s.addShape(R,{x,y:1.06,w:bw,h:0.32,fill:{color:ch.color},line:{color:ch.color}});
    s.addText(`${ch.icon}  ${ch.role}`,{x:x+0.08,y:1.09,w:bw-0.14,h:0.27,fontSize:8,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});
    ch.perms.forEach((p,pi)=>{
      s.addShape(R,{x:x+0.1,y:1.44+pi*0.26,w:bw-0.18,h:0.22,fill:{color:ch.color+'22'},line:{color:ch.color+'44',pt:0.5}});
      s.addText(p,{x:x+0.14,y:1.44+pi*0.26,w:bw-0.24,h:0.22,fontSize:7,color:A.inkS,fontFace:FM,valign:'middle',margin:0});
    });
    // Arrow to next
    if(i<chain.length-1){
      s.addText('→',{x:x+bw,y:1.5,w:gap+0.02,h:0.28,fontSize:12,color:A.inkM,fontFace:F,align:'center',valign:'middle',margin:0});
    }
  });

  // What's scoped table
  s.addShape(R,{x:0.32,y:2.34,w:9.36,h:0.28,fill:{color:A.nav},line:{color:A.nav}});
  s.addText('Data-layer permission scoping',{x:0.42,y:2.37,w:5,h:0.22,fontSize:9,bold:true,color:A.W,fontFace:F,margin:0});

  const scopeRows=[
    ['What Lambdas can do','SELECT queries only on analytics_dev_marts','No INSERT, UPDATE, DELETE. No access to staging.'],
    ['What the agent can access','Results returned by Lambdas only','No direct Redshift connection from Bedrock.'],
    ['What the UI can access','Responses from FastAPI only','Zero database credentials in browser.'],
    ['Source systems','Not reachable from any component','Redshift is the single access point for data.'],
  ];
  scopeRows.forEach((row,ri)=>{
    const y=2.68+ri*0.42;
    const bg=ri%2===0?A.card:'f8fafc';
    [row[0],row[1],row[2]].forEach((cell,ci)=>{
      const cws=[2.0,3.4,3.82];
      const cx=0.32+(ci===0?0:ci===1?2.04:5.48);
      s.addShape(R,{x:cx,y,w:cws[ci],h:0.38,fill:{color:bg},line:{color:A.rule,pt:0.5}});
      s.addText(cell,{x:cx+0.08,y:y+0.04,w:cws[ci]-0.14,h:0.3,fontSize:7.5,color:A.inkS,fontFace:F,valign:'middle',margin:0});
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 14 — What's In Scope
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 5','Module 5.4 — Security Model','Security: What\'s In Scope Now');
  ftr(s,'Lab-ready security — tight enough to ship to internal analysts',14);

  const items=[
    {icon:'✓',title:'Redshift scoped to analytics_dev_marts',body:'Lambda execution roles only grant access to the marts schema. Staging tables (stg_*) and raw tables are not reachable. Views are the public API.',color:A.ok},
    {icon:'✓',title:'Lambda is read-only',body:'Lambda IAM policies include redshift-data:ExecuteStatement and redshift-data:GetStatementResult only. No write path exists — the agent cannot modify financial data.',color:A.ok},
    {icon:'✓',title:'No direct DB access from the UI',body:'Streamlit has zero database credentials. All data flows through FastAPI. A compromised browser cannot access Redshift directly.',color:A.ok},
    {icon:'✓',title:'Agent cannot reach source systems',body:'Bedrock Agent can only call tools registered in AgentCore Gateway. No internet access, no external API calls, no source ERP connections.',color:A.ok},
    {icon:'✓',title:'Tool registry limits blast radius',body:'Gateway only routes to 5 explicitly registered Lambda functions. The agent cannot invoke arbitrary AWS resources even with a prompt injection attempt.',color:A.ok},
  ];
  items.forEach((it,i)=>{
    const y=1.08+i*0.76;
    s.addShape(OV,{x:0.32,y:y+0.06,w:0.3,h:0.3,fill:{color:it.color},line:{color:it.color}});
    s.addText(it.icon,{x:0.32,y:y+0.06,w:0.3,h:0.3,fontSize:9,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(it.title,{x:0.74,y:y+0.04,w:8.8,h:0.24,fontSize:9.5,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(it.body,{x:0.74,y:y+0.3,w:8.8,h:0.4,fontSize:8.5,color:A.inkS,fontFace:F,margin:0});
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 15 — What's Deferred
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 5','Module 5.4 — Security Model','Security: What\'s Deferred to Production');
  ftr(s,'"This is Phase 11 territory — important for production, not needed for the lab."',15);

  // Phase 11 badge
  s.addShape(R,{x:0.32,y:1.02,w:9.36,h:0.48,fill:{color:A.warnS},line:{color:A.warn,pt:1}});
  s.addShape(R,{x:0.32,y:1.02,w:0.06,h:0.48,fill:{color:A.warn},line:{color:A.warn}});
  s.addText('These items are out of scope for this course. They are Phase 11 (Production Hardening) work.',{
    x:0.5,y:1.06,w:9.0,h:0.38,fontSize:8.5,color:A.warn,fontFace:F,valign:'middle',margin:0
  });

  const deferred=[
    {title:'AgentCore Identity / Workload Tokens',why:'Per-session identity scoping. Needed for multi-tenant deployments where different users should see different data.',phase:'Phase 11'},
    {title:'VPC Endpoints for Redshift',why:'Currently Redshift may be reachable over public internet (with auth). VPC endpoints remove that exposure entirely.',phase:'Phase 11'},
    {title:'WAF for FastAPI',why:'Rate limiting, OWASP rule sets, IP allowlisting. Required before any external-facing deployment.',phase:'Phase 11'},
    {title:'Secrets Manager for Credentials',why:'FastAPI currently uses dev IAM credentials or env vars. Secrets Manager enables rotation and audit.',phase:'Phase 11'},
    {title:'CloudTrail + GuardDuty integration',why:'Alerting on anomalous Bedrock invocation patterns, unusual Lambda call volumes, Redshift data exfiltration signals.',phase:'Phase 11'},
    {title:'PrivateLink for Bedrock',why:'Keeps Bedrock API calls within AWS network. Removes external traffic for sensitive inference workloads.',phase:'Phase 11'},
  ];
  deferred.forEach((d,i)=>{
    const col=i%2, row=Math.floor(i/2);
    const x=0.32+col*4.74;
    const y=1.64+row*0.96;
    s.addShape(R,{x,y,w:4.56,h:0.88,fill:{color:A.card},line:{color:A.ruleH,pt:1},shadow:sh()});
    s.addShape(R,{x,y,w:0.06,h:0.88,fill:{color:A.warn},line:{color:A.warn}});
    s.addShape(R,{x:x+4.0,y:y+0.06,w:0.5,h:0.22,fill:{color:A.warnS},line:{color:A.warn,pt:0.5}});
    s.addText(d.phase,{x:x+4.0,y:y+0.06,w:0.5,h:0.22,fontSize:6.5,bold:true,color:A.warn,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(d.title,{x:x+0.16,y:y+0.06,w:3.72,h:0.24,fontSize:8.5,bold:true,color:A.ink,fontFace:F,margin:0});
    s.addText(d.why,{x:x+0.16,y:y+0.34,w:4.2,h:0.46,fontSize:7.5,color:A.inkS,fontFace:F,margin:0});
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 16 — Module 5.5 Intro
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  modIntro(s,'Module 5.5 — Observability & Monitoring','5.5',
    'What to Monitor',
    '8 min',
    'Key CloudWatch metrics, alert thresholds, and AgentCore telemetry for production readiness.',
    16);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 17 — Key Metrics to Track
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  hdr(s,'Section 5','Module 5.5 — Observability & Monitoring','Key Metrics to Track');
  ftr(s,'5 CloudWatch signals + 2 AgentCore signals — monitor these from day one',17);

  // CloudWatch section
  s.addShape(R,{x:0.32,y:1.02,w:9.36,h:0.3,fill:{color:A.nav},line:{color:A.nav}});
  s.addText('CloudWatch Metrics',{x:0.42,y:1.04,w:4,h:0.26,fontSize:9,bold:true,color:A.W,fontFace:F,margin:0});

  const cwMetrics=[
    {metric:'Bedrock Agent InvocationLatency',threshold:'Alert if > 10 s',cadence:'Per invocation',color:A.brand,note:'Indicates slow ReAct loops or model timeouts'},
    {metric:'Lambda Duration (all 5 functions)',threshold:'Alert if > 30 s',cadence:'Per invocation',color:A.warn,note:'Cold start + SQL query time combined'},
    {metric:'Lambda Errors',threshold:'Alert on ANY failure',cadence:'Per invocation',color:A.red,note:'Especially watch for cold-start out-of-memory errors'},
    {metric:'Redshift Query Duration',threshold:'Alert if > 5 s',cadence:'Per query',color:A.ok,note:'Filter by acme-finance-dev workgroup'},
    {metric:'FastAPI /health (custom)',threshold:'Alert if DOWN',cadence:'Every 60 s',color:A.teal,note:'Synthetic monitor — canary every minute'},
  ];
  const colW=[2.58,1.42,0.96,4.2];
  cwMetrics.forEach((m,i)=>{
    const y=1.38+i*0.41;
    const bg=i%2===0?A.card:'f8fafc';
    s.addShape(R,{x:0.32,y,w:0.08,h:0.36,fill:{color:m.color},line:{color:m.color}});
    s.addShape(R,{x:0.44,y,w:colW[0],h:0.36,fill:{color:bg},line:{color:A.rule,pt:0.5}});
    s.addText(m.metric,{x:0.5,y:y+0.04,w:colW[0]-0.1,h:0.28,fontSize:7.5,bold:true,color:A.inkS,fontFace:F,valign:'middle',margin:0});
    s.addShape(R,{x:0.44+colW[0],y,w:colW[1],h:0.36,fill:{color:bg},line:{color:A.rule,pt:0.5}});
    s.addText(m.threshold,{x:0.48+colW[0],y:y+0.04,w:colW[1]-0.06,h:0.28,fontSize:7.5,bold:true,color:m.color,fontFace:F,valign:'middle',margin:0});
    s.addShape(R,{x:0.44+colW[0]+colW[1],y,w:colW[2],h:0.36,fill:{color:bg},line:{color:A.rule,pt:0.5}});
    s.addText(m.cadence,{x:0.48+colW[0]+colW[1],y:y+0.04,w:colW[2]-0.06,h:0.28,fontSize:7,color:A.inkD,fontFace:F,valign:'middle',margin:0});
    s.addShape(R,{x:0.44+colW[0]+colW[1]+colW[2],y,w:colW[3],h:0.36,fill:{color:bg},line:{color:A.rule,pt:0.5}});
    s.addText(m.note,{x:0.5+colW[0]+colW[1]+colW[2],y:y+0.04,w:colW[3]-0.12,h:0.28,fontSize:7.5,color:A.inkS,fontFace:F,valign:'middle',margin:0});
  });

  // AgentCore section
  s.addShape(R,{x:0.32,y:3.46,w:9.36,h:0.28,fill:{color:A.cyan},line:{color:A.cyan}});
  s.addText('AgentCore Telemetry',{x:0.42,y:3.48,w:4,h:0.24,fontSize:9,bold:true,color:A.W,fontFace:F,margin:0});

  const acMetrics=[
    {metric:'Memory retrieve latency',threshold:'Alert if > 2 s',note:'Semantic search should be fast; latency indicates index size or config issue'},
    {metric:'Gateway tool invocation success rate',threshold:'Alert if < 99%',note:'Any tool failures reach the user as degraded answers — catch early'},
  ];
  acMetrics.forEach((m,i)=>{
    const y=3.8+i*0.42;
    const bg=i%2===0?A.card:'f8fafc';
    s.addShape(R,{x:0.32,y,w:0.08,h:0.36,fill:{color:A.cyan},line:{color:A.cyan}});
    s.addShape(R,{x:0.44,y,w:2.58,h:0.36,fill:{color:bg},line:{color:A.rule,pt:0.5}});
    s.addText(m.metric,{x:0.5,y:y+0.04,w:2.48,h:0.28,fontSize:7.5,bold:true,color:A.inkS,fontFace:F,valign:'middle',margin:0});
    s.addShape(R,{x:3.06,y,w:1.42,h:0.36,fill:{color:bg},line:{color:A.rule,pt:0.5}});
    s.addText(m.threshold,{x:3.1,y:y+0.04,w:1.34,h:0.28,fontSize:7.5,bold:true,color:A.cyan,fontFace:F,valign:'middle',margin:0});
    s.addShape(R,{x:4.52,y,w:5.16,h:0.36,fill:{color:bg},line:{color:A.rule,pt:0.5}});
    s.addText(m.note,{x:4.58,y:y+0.04,w:5.04,h:0.28,fontSize:7.5,color:A.inkS,fontFace:F,valign:'middle',margin:0});
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 18 — Section 5 Recap + Next
// ══════════════════════════════════════════════════════════════════════════════
{
  const s=pres.addSlide();
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.cyan},line:{color:A.cyan}});
  s.addText('Section 5  ·  Reference Architecture — Recap',{x:0.42,y:0.1,w:9,h:0.44,fontSize:20,bold:true,color:A.W,fontFace:F,margin:0});
  s.addShape(R,{x:0.42,y:0.52,w:9.16,h:0.015,fill:{color:'1e2d45'},line:{color:'1e2d45'}});

  const checks=[
    '9 components across 3 layers: Presentation (Streamlit), Orchestration (FastAPI + Bedrock + AgentCore + 5 Lambdas), Data (Redshift)',
    '2 request paths: Agent path for NL queries (3–6 s, reasoning-first) and Direct path for dashboard metrics (< 1 s, rendering-first)',
    'ReAct loop: Reason → Act (Gateway → Lambda → Redshift) → Observe → Reason → Answer — typically 1–2 turns',
    'IAM permission chain: Bedrock Agent Role → Gateway Role → Lambda Execution Roles → Redshift Data API (read-only, scoped schema)',
    '5 CloudWatch signals + 2 AgentCore signals — Bedrock > 10 s, Lambda > 30 s, Redshift > 5 s are your primary alert thresholds',
    'Security deferred to production: AgentCore Identity, VPC endpoints, WAF, Secrets Manager, PrivateLink (Phase 11)',
  ];
  checks.forEach((c,i)=>{
    s.addShape(OV,{x:0.42,y:0.82+i*0.6,w:0.26,h:0.26,fill:{color:A.cyan},line:{color:A.cyan}});
    s.addText('✓',{x:0.42,y:0.82+i*0.6,w:0.26,h:0.26,fontSize:8.5,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
    s.addText(c,{x:0.82,y:0.82+i*0.6,w:8.78,h:0.54,fontSize:8.5,color:A.navI,fontFace:F,valign:'middle',margin:0});
  });

  // Next section call to action
  s.addShape(R,{x:0.42,y:4.68,w:5.5,h:0.34,fill:{color:A.cyan},line:{color:A.cyan},shadow:sh()});
  s.addText('Next: Section 6 — Agent Design  →',{x:0.52,y:4.68,w:5.3,h:0.34,fontSize:10,bold:true,color:A.W,fontFace:F,valign:'middle',margin:0});
  s.addText('You can now whiteboard the ACME Finance system for a client.',{x:0.42,y:5.07,w:7,h:0.22,fontSize:9,italic:true,color:A.navM,fontFace:F,margin:0});

  // Footer
  s.addShape(R,{x:0,y:5.33,w:SW,h:0.295,fill:{color:'080f1c'},line:{color:'080f1c'}});
  s.addText('Section 5  ·  Reference Architecture  ·  Complete',{x:0.42,y:5.335,w:8.5,h:0.27,fontSize:8,color:A.navM,fontFace:F,valign:'middle',margin:0});
  s.addText('18 / 18',{x:9.2,y:5.335,w:0.65,h:0.27,fontSize:7.5,color:A.navM,fontFace:F,valign:'middle',align:'right',margin:0});
}

// ── Save ─────────────────────────────────────────────────────────────────────
pres.writeFile({fileName:OUT})
  .then(()=>console.log(`✓  Saved: ${OUT}`))
  .catch(e=>{console.error(e);process.exit(1);});

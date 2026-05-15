"use strict";
const pptxgen = require("pptxgenjs");
const path = require("path");

const A={bg:'f6f7f9',bgS:'eef0f4',card:'ffffff',ink:'0b1220',inkS:'3b475a',inkD:'6b7689',inkM:'9aa3b2',
  rule:'e6e9ef',brand:'0b66e4',brandS:'e7f0ff',nav:'0e1525',navI:'cbd2dd',navM:'7d8595',
  ok:'1a8754',okS:'e2f3e9',warn:'c4671b',warnS:'fcefdf',red:'c63232',redS:'fbe5e5',
  violet:'6c4ad9',violetS:'ede9f7',teal:'137a7b',tealS:'e1f4f4',cyan:'3093a8',W:'FFFFFF'};
const F='Calibri',FM='Consolas',SW=10,TOT=40;
const OUT=path.join(__dirname,'section-7-slides.pptx');
const pres=new pptxgen();
pres.layout='LAYOUT_16x9';
pres.author='ACME Finance Course';
pres.title='Finance AI Agents on AWS — Section 7: Hands-On Build';
const R=pres.shapes.RECTANGLE,OV=pres.shapes.OVAL;
const sh=()=>({type:'outer',blur:8,offset:2,angle:135,color:'0b1220',opacity:0.08});
const shL=()=>({type:'outer',blur:16,offset:4,angle:135,color:'0b1220',opacity:0.14});

function hdr(s,sec,mod,title,dark=false){
  s.background={color:dark?A.nav:A.bg};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.brand},line:{color:A.brand}});
  if(sec) s.addText(`${sec}  ·  ${mod}`,{x:0.42,y:0.10,w:8,h:0.22,fontSize:7.5,color:dark?A.navM:A.inkD,fontFace:F,margin:0});
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
  s.addText(label,{x:x+0.15,y:y+0.08,w:w-0.22,h:0.22,fontSize:8,color:A.inkD,fontFace:F,margin:0});
  s.addText(val,{x:x+0.15,y:y+0.30,w:w-0.22,h:0.44,fontSize:18,bold:true,color:A.ink,fontFace:F,margin:0});
  if(sub) s.addText(sub,{x:x+0.15,y:y+0.72,w:w-0.22,h:0.20,fontSize:7.5,color:A.inkD,fontFace:F,margin:0});
}
function tbl(s,rows,cols,x,y,opts={}){
  const rh=opts.rh||0.36;
  rows.forEach((row,ri)=>{
    const isH=ri===0; let cx=x;
    row.forEach((cell,ci)=>{
      const cw=Array.isArray(cols)?cols[ci]:cols;
      const bg=isH?A.nav:(ri%2===0?A.card:'f8fafc');
      s.addShape(R,{x:cx,y:y+ri*rh,w:cw,h:rh,fill:{color:bg},line:{color:A.rule,pt:0.5}});
      s.addText(String(cell),{x:cx+0.07,y:y+ri*rh+0.03,w:cw-0.14,h:rh-0.06,fontSize:isH?8.5:8,bold:isH,color:isH?A.W:A.inkS,fontFace:F,valign:'middle',margin:0,wrap:true});
      cx+=cw;
    });
  });
}
function bullet(s,x,y,w,items,opts={}){
  const lh=opts.lh||0.40,col=opts.color||A.brand,fs=opts.fs||9;
  items.forEach((item,i)=>{
    s.addShape(OV,{x,y:y+i*lh+0.10,w:0.10,h:0.10,fill:{color:col},line:{color:col}});
    s.addText(item,{x:x+0.18,y:y+i*lh,w:w-0.18,h:lh-0.04,fontSize:fs,color:A.inkS,fontFace:F,valign:'middle',margin:0,wrap:true});
  });
}
function code(s,x,y,w,h,txt){
  s.addShape(R,{x,y,w,h,fill:{color:'0d1117'},line:{color:'21262d',pt:1},shadow:sh()});
  s.addText(txt,{x:x+0.14,y:y+0.09,w:w-0.28,h:h-0.18,fontSize:7.5,fontFace:FM,color:'c9d1d9',margin:0,valign:'top'});
}
function modDiv(s,num,title,sub,n){
  s.background={color:A.nav};
  s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.brand},line:{color:A.brand}});
  s.addText(num,{x:5.4,y:0.05,w:4.4,h:3.9,fontSize:190,bold:true,color:'131f35',fontFace:F,align:'right',margin:0});
  s.addShape(R,{x:0.55,y:0.78,w:0.06,h:1.5,fill:{color:A.brand},line:{color:A.brand}});
  s.addText('MODULE',{x:0.72,y:0.78,w:3,h:0.26,fontSize:8,bold:true,color:A.navM,fontFace:F,margin:0});
  s.addText(title,{x:0.72,y:1.04,w:5.2,h:0.66,fontSize:28,bold:true,color:A.W,fontFace:F,margin:0});
  s.addText(sub,{x:0.72,y:1.76,w:5.6,h:0.56,fontSize:11,color:A.navI,fontFace:F,margin:0});
  ftr(s,'Section 7 — Hands-On Build',n,true);
}

// ═══════════════════════════════════════════════════
// SLIDE 1 — SECTION DIVIDER
// ═══════════════════════════════════════════════════
{const s=pres.addSlide();
 s.background={color:A.nav};
 s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.brand},line:{color:A.brand}});
 s.addText('7',{x:4.8,y:0.0,w:5.0,h:3.9,fontSize:220,bold:true,color:'131f35',fontFace:F,align:'right',margin:0});
 s.addShape(R,{x:0.55,y:0.70,w:0.06,h:1.9,fill:{color:A.brand},line:{color:A.brand}});
 s.addText('SECTION',{x:0.72,y:0.70,w:3.5,h:0.26,fontSize:8.5,bold:true,color:A.navM,fontFace:F,margin:0});
 s.addText('Hands-On Build',{x:0.72,y:0.97,w:5.2,h:0.68,fontSize:32,bold:true,color:A.W,fontFace:F,margin:0});
 s.addText('Deploy the full ACME Finance AI stack — end to end.',{x:0.72,y:1.70,w:5.4,h:0.42,fontSize:11.5,color:A.navI,fontFace:F,margin:0});
 s.addShape(R,{x:0.72,y:2.20,w:5.6,h:0.015,fill:{color:'1e2d45'},line:{color:'1e2d45'}});
 const mods=['7.0  Setup & Prerequisites','7.1  Deploy the Data Layer','7.2  Deploy Bedrock Agent',
   '7.3  Wire AgentCore Gateway','7.4  Wire AgentCore Memory','7.5  Lambda Analysis Tools',
   '7.6  FastAPI Layer','7.7  Streamlit Dashboard','7.8  End-to-End Test',
   '7.9  Commentary & Board Pack','7.10  Use Cases & Testing'];
 mods.forEach((m,i)=>{
   const col=i<6?0.72:5.1,row=i<6?i:i-6;
   s.addText(m,{x:col,y:2.30+row*0.40,w:4.2,h:0.36,fontSize:8.5,color:A.navI,fontFace:F,margin:0});
 });
 s.addText('~150 min  ·  11 modules  ·  40 slides',{x:0.72,y:4.88,w:5,h:0.24,fontSize:8,color:A.navM,fontFace:F,margin:0});
 ftr(s,'Section 7 — Hands-On Build',1,true);}

// SLIDE 2 — Prerequisites
{const s=pres.addSlide();
 hdr(s,'7.0','Setup','Prerequisites Checklist');
 tbl(s,[['Tool','Version / Command','Purpose'],
   ['AWS CLI v2','aws --version  →  2.x','Profile auth + Bedrock calls'],
   ['Terraform','terraform -version  →  ≥1.5','Infrastructure provisioning'],
   ['Python','python3 --version  →  3.11+','Lambda, FastAPI, Streamlit'],
   ['Node.js','node --version  →  18+','Build scripts'],
   ['Claude Code','npm install -g @anthropic-ai/claude-code','AI pair-programmer'],
   ['dbt Core','dbt --version  →  1.7+','Data transformation'],
   ['AWS profile','aws sso login --profile acme-admin','Single profile for all resources'],
 ],[2.5,3.56,2.7],0.42,1.02,{rh:0.38});
 crd(s,0.42,4.26,9.16,0.72,{accent:A.ok,bg:A.okS});
 s.addText('All tools pre-installed on the lab AMI. Run setup-check.sh to validate before starting.',
   {x:0.62,y:4.32,w:8.8,h:0.60,fontSize:9,color:A.ok,fontFace:F,valign:'middle',margin:0});
 ftr(s,'7.0 Setup',2);}

// SLIDE 3 — Getting started
{const s=pres.addSlide();
 hdr(s,'7.0','Setup','Getting the Environment Running');
 code(s,0.42,1.02,5.6,2.24,
`git clone https://github.com/acme/acme-finance-ai.git
cd acme-finance-ai
aws sso login --profile acme-admin
cd infrastructure
terraform init
terraform plan -out=tfplan
terraform apply tfplan
# Apply time ~12 min. Redshift cold start ~60 s first query.`);
 crd(s,6.22,1.02,3.35,2.24,{accent:A.brand});
 s.addText('Terraform creates',{x:6.38,y:1.10,w:3.0,h:0.26,fontSize:8.5,bold:true,color:A.inkD,fontFace:F,margin:0});
 bullet(s,6.38,1.40,3.0,['Redshift Serverless workgroup','Bedrock Agent + IAM roles','Lambda functions (3)','AgentCore Gateway + Memory','S3 buckets + KMS keys'],{lh:0.36,fs:8.5});
 crd(s,0.42,3.40,9.16,0.68,{accent:A.warn,bg:A.warnS});
 s.addText('If apply fails on Bedrock: confirm acme-admin profile has bedrock:CreateAgent permission and Claude Sonnet model access is enabled in us-east-1.',
   {x:0.62,y:3.46,w:8.8,h:0.56,fontSize:9,color:A.warn,fontFace:F,valign:'middle',margin:0,wrap:true});
 ftr(s,'7.0 Setup',3);}

// SLIDE 4 — Claude Code workflow
{const s=pres.addSlide();
 hdr(s,'7.0','Setup','Using AI to Build AI — Claude Code Workflow');
 const steps=[['1','Describe','Tell Claude what you need in plain English'],
   ['2','Generate','Claude writes the code — Lambda, SQL, Terraform'],
   ['3','Review','Read it. You are still the architect.'],
   ['4','Run','Execute. Claude reads errors and self-corrects.'],
   ['5','Commit','You own the output. Git tracks every change.']];
 steps.forEach(([n,t,d],i)=>{
   const x=0.42+i*1.86;
   crd(s,x,1.08,1.74,2.86,{accent:A.brand,shadow:shL()});
   s.addShape(OV,{x:x+0.63,y:1.20,w:0.48,h:0.48,fill:{color:A.brand},line:{color:A.brand}});
   s.addText(n,{x:x+0.63,y:1.20,w:0.48,h:0.48,fontSize:14,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
   s.addText(t,{x:x+0.10,y:1.80,w:1.54,h:0.32,fontSize:10,bold:true,color:A.ink,fontFace:F,align:'center',margin:0});
   s.addText(d,{x:x+0.10,y:2.16,w:1.54,h:0.70,fontSize:8,color:A.inkS,fontFace:F,align:'center',margin:0,wrap:true});
 });
 crd(s,0.42,4.10,9.16,0.80,{bg:A.brandS,border:A.brand});
 s.addText('"Claude Code wrote ~60% of the Lambda and SQL in this section. Every line was reviewed and tested before merge."',
   {x:0.62,y:4.18,w:8.8,h:0.64,fontSize:9.5,italic:true,color:A.brand,fontFace:F,valign:'middle',margin:0});
 ftr(s,'7.0 Setup',4);}

// SLIDE 5 — 7.1 Module divider
{const s=pres.addSlide();
 modDiv(s,'7.1','Deploy the Data Layer','dbt + Redshift: the foundation every tool queries.',5);}

// SLIDE 6 — dbt run
{const s=pres.addSlide();
 hdr(s,'7.1','Deploy the Data Layer','Running dbt: Transforming Raw Finance Data');
 code(s,0.42,1.02,5.4,2.14,
`cd dbt
dbt deps      # install packages
dbt run       # execute all models (~60 s cold start)

# Expected output:
# Completed successfully
# Done. PASS=18 WARN=0 ERROR=0 SKIP=0 TOTAL=18
# Redshift workgroup: acme-finance-dev
# Database: dev  Schema: analytics_dev_marts`);
 crd(s,6.02,1.02,3.55,2.14,{accent:A.teal});
 s.addText('5 mart tables created',{x:6.18,y:1.10,w:3.2,h:0.26,fontSize:8.5,bold:true,color:A.inkD,fontFace:F,margin:0});
 tbl(s,[['Table','Feeds'],
   ['mart_pl','variance_rca, whatif_sim'],
   ['mart_arr','ARR waterfall'],
   ['mart_ar_aging','AR aging buckets'],
   ['mart_revenue','Revenue forecast'],
   ['mart_forecast','4-qtr projections'],
 ],[1.96,1.39],6.18,1.40,{rh:0.30});
 s.addText('Cold start note: first dbt run takes ~60 s. Subsequent runs are fast.',
   {x:0.42,y:3.28,w:5.4,h:0.40,fontSize:8.5,color:A.inkD,fontFace:F,margin:0});
 ftr(s,'7.1 Deploy the Data Layer',6);}

// SLIDE 7 — dbt test + verify
{const s=pres.addSlide();
 hdr(s,'7.1','Deploy the Data Layer','Verify: Tests Pass, Marts Populated');
 code(s,0.42,1.02,5.4,1.36,
`dbt test   # PASS=42 WARN=0 ERROR=0

# Spot-check in Redshift Query Editor:
SELECT COUNT(*) FROM analytics_dev_marts.mart_pl;
-- Result: 1,248  (rows > 0 = success)`);
 kpi(s,6.02,1.02,1.60,1.06,'dbt models','18','All green',A.ok);
 kpi(s,7.76,1.02,1.62,1.06,'dbt tests','42','PASS=42',A.ok);
 kpi(s,6.02,2.18,1.60,0.96,'mart_pl','1,248 rows','populated',A.teal);
 kpi(s,7.76,2.18,1.62,0.96,'mart_revenue','624 rows','populated',A.teal);
 crd(s,0.42,2.52,5.4,0.86,{accent:A.ok,bg:A.okS});
 s.addText('Foundation complete. All 5 mart tables populated. Every downstream tool queries these marts — get this right before moving on.',
   {x:0.62,y:2.58,w:5.1,h:0.74,fontSize:9,color:A.ok,fontFace:F,valign:'middle',margin:0,wrap:true});
 ftr(s,'7.1 Deploy the Data Layer',7);}

// SLIDE 8 — 7.2 Bedrock Agent Terraform
{const s=pres.addSlide();
 hdr(s,'7.2','Deploy Bedrock Agent','Terraform Creates the Bedrock Agent');
 code(s,0.42,1.02,5.4,2.24,
`# infrastructure/modules/bedrock_agent/main.tf
resource "aws_bedrockagent_agent" "finance" {
  agent_name      = "acme-finance-agent"
  foundation_model= "anthropic.claude-sonnet-4-5"
  agent_resource_role_arn = aws_iam_role.bedrock.arn
  instruction     = file("${path.module}/system_prompt.txt")
  idle_session_ttl_in_seconds = 1800
}
resource "aws_bedrockagent_agent_alias" "live" {
  agent_id         = aws_bedrockagent_agent.finance.id
  agent_alias_name = "live"
}
# Deploy: terraform apply -target=module.bedrock_agent
# Agent ID provisioned: LUUHZWRDA4`);
 crd(s,6.02,1.02,3.55,2.24,{accent:A.brand});
 s.addText('System prompt teaches:',{x:6.18,y:1.10,w:3.2,h:0.26,fontSize:8.5,bold:true,color:A.inkD,fontFace:F,margin:0});
 bullet(s,6.18,1.40,3.2,['ACME fiscal calendar (Oct–Sep)','Entity hierarchy (US, EMEA, APAC)','Which tool to call per query type','How to format CFO-ready answers','When to say "I don\'t know"'],{lh:0.36,fs:8.5});
 ftr(s,'7.2 Deploy Bedrock Agent',8);}

// SLIDE 9 — Verify Bedrock Agent
{const s=pres.addSlide();
 hdr(s,'7.2','Deploy Bedrock Agent','Verify: Agent PREPARED');
 code(s,0.42,1.02,9.16,1.48,
`aws bedrock-agent list-agents --profile acme-admin \\
  --query 'agentSummaries[?agentName==\`acme-finance-agent\`]'
# [ { "agentId": "LUUHZWRDA4",
#     "agentStatus": "PREPARED",
#     "foundationModel": "anthropic.claude-sonnet-4-5" } ]`);
 tbl(s,[['Check','Expected','If different'],
   ['Agent ID','LUUHZWRDA4','Confirm matches outputs.tf'],
   ['Status','PREPARED','Not CREATING — wait 2 min'],
   ['Foundation model','anthropic.claude-sonnet-4-5','Must match system_prompt version'],
   ['IAM role','arn:aws:iam::*:role/bedrock-agent-*','Policy allows Bedrock + Lambda'],
 ],[2.5,3.1,3.06],0.42,2.68,{rh:0.36});
 ftr(s,'7.2 Deploy Bedrock Agent',9);}

// SLIDE 10 — 7.3 Module divider
{const s=pres.addSlide();
 modDiv(s,'7.3','Wire AgentCore Gateway','Connecting the five analysis tools to the agent.',10);}

// SLIDE 11 — Terraform locals pattern (key slide)
{const s=pres.addSlide();
 hdr(s,'7.3','Wire AgentCore Gateway','Real-World Pattern: Provider Hasn\'t Caught Up Yet');
 code(s,0.42,1.02,5.5,2.80,
`# infrastructure/modules/agentcore/main.tf
# aws_bedrockagentcore_* are NOT in hashicorp/aws v5.x.
# Production pattern: pin ARNs as locals, provision via
# AWS CLI/SDK, Terraform tracks via data sources.

locals {
  gateway_id = "acme-finance-dev-finance-tools-rrlhpdtveg"
  gateway_arn = join("", [
    "arn:aws:bedrock:us-east-1::agent-core/gateway/",
    local.gateway_id
  ])
  targets = {
    text_to_sql     = module.lambda_sql.arn
    forecast        = module.lambda_forecast.arn
    variance_rca    = module.lambda_rca.arn
    whatif_sim      = module.lambda_whatif.arn
    describe_metric = module.lambda_describe.arn
  }
}`);
 crd(s,6.12,1.02,3.45,2.80,{accent:A.warn,bg:A.warnS,border:A.warn});
 s.addText('Why this pattern matters',{x:6.28,y:1.10,w:3.1,h:0.26,fontSize:8.5,bold:true,color:A.warn,fontFace:F,margin:0});
 bullet(s,6.28,1.38,3.1,
   ['New AWS services ship before provider support',
    'Pinning ARNs as locals is safe + auditable',
    'Use AWS CLI to provision; TF tracks via data{ }',
    'Re-adopt resource block once provider v6 ships',
    '"Version drift" = real engagement risk — document it'],
   {lh:0.44,fs:8.5,color:A.warn});
 crd(s,0.42,3.96,9.16,0.52,{bg:A.brandS,border:A.brand});
 s.addText('hashicorp/aws v5.x  ·  Gateway: acme-finance-dev-finance-tools-rrlhpdtveg  ·  5 targets registered',
   {x:0.62,y:4.02,w:8.8,h:0.40,fontSize:9,color:A.brand,fontFace:F,valign:'middle',margin:0});
 ftr(s,'7.3 Wire AgentCore Gateway',11);}

// SLIDE 12 — Verify gateway targets
{const s=pres.addSlide();
 hdr(s,'7.3','Wire AgentCore Gateway','Verify: All 5 Gateway Targets Active');
 code(s,0.42,1.02,9.16,1.08,
`aws bedrockagentcore list-gateway-targets \\
  --gateway-id acme-finance-dev-finance-tools-rrlhpdtveg --profile acme-admin`);
 tbl(s,[['Target Name','Lambda function','Status'],
   ['text_to_sql','acme-finance-dev-text-to-sql','ACTIVE'],
   ['forecast','acme-finance-dev-forecast','ACTIVE'],
   ['variance_rca','acme-finance-dev-variance-rca','ACTIVE'],
   ['whatif_sim','acme-finance-dev-whatif-sim','ACTIVE'],
   ['describe_metric','acme-finance-dev-describe-metric','ACTIVE'],
 ],[2.6,4.2,1.56],0.42,2.22,{rh:0.36});
 crd(s,0.42,4.18,9.16,0.56,{accent:A.ok,bg:A.okS});
 s.addText('All 5 targets ACTIVE. The Gateway maps each agent tool-call JSON to the correct Lambda ARN.',
   {x:0.62,y:4.24,w:8.8,h:0.44,fontSize:9,color:A.ok,fontFace:F,valign:'middle',margin:0});
 ftr(s,'7.3 Wire AgentCore Gateway',12);}

// SLIDE 13 — 7.4 Module divider
{const s=pres.addSlide();
 modDiv(s,'7.4','Wire AgentCore Memory','Session vs. semantic memory — what persists, what doesn\'t.',13);}

// SLIDE 14 — Two memory IDs
{const s=pres.addSlide();
 hdr(s,'7.4','Wire AgentCore Memory','Two IDs: sessionId vs memoryId');
 crd(s,0.42,1.02,4.50,3.20,{accent:A.violet,shadow:shL()});
 s.addText('sessionId  —  Ephemeral',{x:0.62,y:1.10,w:4.1,h:0.30,fontSize:11,bold:true,color:A.violet,fontFace:F,margin:0});
 bullet(s,0.62,1.44,4.1,['Scoped to one browser tab / API session','Lost when session ends or TTL expires','Generated: uuid4() on each /chat call if omitted','Holds the current conversation turn context'],{lh:0.42,fs:9,color:A.violet});
 crd(s,5.08,1.02,4.50,3.20,{accent:A.brand,shadow:shL()});
 s.addText('memoryId  —  Persistent',{x:5.28,y:1.10,w:4.1,h:0.30,fontSize:11,bold:true,color:A.brand,fontFace:F,margin:0});
 bullet(s,5.28,1.44,4.1,['Scoped to analyst (user identity)','Survives browser close, multi-day gaps','SEMANTIC strategy: vector-indexed Q&A pairs','Recall: top-5 memory records injected pre-invoke','Storage: after every assistant response (30-day TTL)'],{lh:0.42,fs:9});
 crd(s,0.42,4.34,9.16,0.54,{bg:A.brandS,border:A.brand});
 s.addText('Rule: pass memoryId=analyst-{user_id} in every /chat call. Agent remembers entity focus and past answers across sessions.',
   {x:0.62,y:4.40,w:8.8,h:0.42,fontSize:9,color:A.brand,fontFace:F,valign:'middle',margin:0});
 ftr(s,'7.4 Wire AgentCore Memory',14);}

// SLIDE 15 — Memory code + verify
{const s=pres.addSlide();
 hdr(s,'7.4','Wire AgentCore Memory','Code Pattern & Cross-Session Verification');
 code(s,0.42,1.02,5.5,2.54,
`# Before invoke — retrieve memory
memories = bedrock_agentcore.retrieve_memory(
    memoryId=f"analyst-{user_id}",
    maxResults=5, strategyType="SEMANTIC")
memory_ctx = "\\n".join([m["content"] for m in memories])

# After invoke — store Q&A
bedrock_agentcore.create_memory_record(
    memoryId=f"analyst-{user_id}",
    content={
        "question": user_question,
        "answer":   agent_response,
        "entity":   entity,
        "timestamp": iso_now()
    })`);
 crd(s,6.12,1.02,3.45,2.54,{accent:A.brand});
 s.addText('Verify cross-session recall',{x:6.28,y:1.10,w:3.1,h:0.26,fontSize:8.5,bold:true,color:A.inkD,fontFace:F,margin:0});
 bullet(s,6.28,1.38,3.1,
   ['Session 1: "Focus on EMEA" → ask revenue Q','Close browser / clear session state','Session 2: same memoryId → ask follow-up','Agent answers with EMEA context — no re-prompt','Memory TTL: 30 days (configurable)'],
   {lh:0.42,fs:8.5});
 crd(s,0.42,3.70,9.16,0.58,{accent:A.ok,bg:A.okS});
 s.addText('Memory verified when agent recalls entity focus across session boundary without being re-told.',
   {x:0.62,y:3.76,w:8.8,h:0.46,fontSize:9,color:A.ok,fontFace:F,valign:'middle',margin:0});
 ftr(s,'7.4 Wire AgentCore Memory',15);}

// SLIDE 16 — 7.5 Module divider
{const s=pres.addSlide();
 modDiv(s,'7.5','Lambda Analysis Tools','Three tools that turn SQL into CFO-ready answers.',16);}

// SLIDE 17 — Lambda shared pattern
{const s=pres.addSlide();
 hdr(s,'7.5','Lambda Analysis Tools','The Pattern: All Three Tools Follow This');
 code(s,0.42,1.02,5.5,2.72,
`def handler(event, context):
    params   = event["parameters"]        # typed input
    sql      = build_sql(params)          # parameterised

    stmt_id  = redshift.execute_statement(
        WorkgroupName="acme-finance-dev",
        Database="dev", Sql=sql)["Id"]
    wait_for_completion(stmt_id)          # poll ~2 s

    rows = redshift.get_statement_result(Id=stmt_id)
    return {"statusCode":200,
            "body": json.dumps(format_result(rows))}`);
 crd(s,6.12,1.02,3.45,2.72,{accent:A.teal});
 s.addText('Redshift Data API benefits',{x:6.28,y:1.10,w:3.1,h:0.26,fontSize:8.5,bold:true,color:A.inkD,fontFace:F,margin:0});
 bullet(s,6.28,1.38,3.1,['No VPC or JDBC driver needed','IAM-authenticated — no DB creds in code','Async polling: Lambda waits, not the agent','Cold start: ~60 s first, ~2 s warm','Schema: analytics_dev_marts (5 tables)'],{lh:0.44,fs:8.5,color:A.teal});
 tbl(s,[['Tool','Key output'],
   ['variance_rca','drivers[] sorted by |variance|'],
   ['whatif_sim','new_margin_bps, op_income_delta'],
   ['forecast','projections[] by quarter'],
 ],[2.2,7.16],0.42,3.90,{rh:0.33});
 ftr(s,'7.5 Lambda Analysis Tools',17);}

// SLIDE 18 — variance_rca
{const s=pres.addSlide();
 hdr(s,'7.5','Lambda Analysis Tools','variance_rca: Root-Cause the Budget Gap');
 code(s,0.42,1.02,5.5,1.96,
`-- Core SQL: fct_gl_entries vs stg_epm__plan_line
SELECT gl.line_item, gl.cost_center,
  SUM(gl.actual_amount)                  AS actual,
  SUM(ep.plan_amount)                    AS plan,
  SUM(gl.actual_amount - ep.plan_amount) AS variance
FROM analytics_dev_marts.fct_gl_entries gl
JOIN analytics_dev_marts.stg_epm__plan_line ep
  ON gl.line_item=ep.line_item AND gl.period=ep.period
WHERE gl.entity=%(entity)s AND gl.fiscal_year=%(year)s
GROUP BY 1,2 ORDER BY ABS(variance) DESC LIMIT %(n)s;`);
 tbl(s,[['Rank','Line Item','Cost Center','Variance'],
   ['1','R&D Personnel','Engineering EMEA','−$4.2M'],
   ['2','Cloud Infra','Platform EMEA','−$1.1M'],
   ['3','Sales Comp','Commercial EMEA','−$0.8M'],
 ],[0.5,2.2,2.0,1.30],0.42,3.10,{rh:0.36});
 crd(s,6.12,1.02,3.45,1.96,{accent:A.red});
 s.addText('Verify output',{x:6.28,y:1.10,w:3.1,h:0.26,fontSize:8.5,bold:true,color:A.inkD,fontFace:F,margin:0});
 bullet(s,6.28,1.38,3.1,['entity=EMEA, fiscal_year=2024','Top driver: R&D Personnel','Cost center: Engineering EMEA','Variance: −$4.2M vs plan','This is the E2E test expected answer'],{lh:0.36,fs:8.5,color:A.red});
 crd(s,0.42,4.56,9.16,0.52,{accent:A.ok,bg:A.okS});
 s.addText('Verified: top driver = R&D Personnel, Engineering EMEA. Expected for all E2E tests.',
   {x:0.62,y:4.62,w:8.8,h:0.40,fontSize:9,color:A.ok,fontFace:F,valign:'middle',margin:0});
 ftr(s,'7.5 Lambda Analysis Tools',18);}

// SLIDE 19 — whatif_sim (key numbers slide)
{const s=pres.addSlide();
 hdr(s,'7.5','Lambda Analysis Tools','whatif_sim: Model a Cost Change — R&D −15%');
 code(s,0.42,1.02,5.5,1.80,
`payload = {"line_item": "R&D", "pct_change": -0.15}
# Lambda re-rolls full P&L via mart_pl

# Response:
{ "base_revenue":     1807.9,  # $M
  "base_op_income":     99.4,  # $M (5.50% margin)
  "new_op_income":     162.3,  # $M
  "op_income_delta":    62.9,  # +$62.9M
  "new_margin_bps":      898,  # 8.98%
  "margin_delta_bps":    348   # +348 bps }`);
 kpi(s,6.12,1.02,1.64,1.04,'Revenue (base)','$1,807.9M','FY2024',A.teal);
 kpi(s,7.90,1.02,1.67,1.04,'Op Income +','+$62.9M','R&D −15%',A.ok);
 kpi(s,6.12,2.16,1.64,1.00,'Margin delta','+348 bps','5.5% → 9.0%',A.ok);
 kpi(s,7.90,2.16,1.67,1.00,'New margin','8.98%','vs 5.50% base',A.brand);
 tbl(s,[['Test scenario','Op income delta','Margin delta','Pass?'],
   ['R&D −15%','+$62.9M','+348 bps','✓'],
   ['Sales +10%','+$32.5M','+180 bps','✓'],
   ['COGS +5%','−$39.8M','−220 bps','✓'],
 ],[2.6,2.2,1.8,1.76],0.42,3.28,{rh:0.36});
 crd(s,0.42,4.60,9.16,0.52,{accent:A.ok,bg:A.okS});
 s.addText('R&D −15%: op income $99.4M → $162.3M (+$62.9M). Margin 5.50% → 8.98% (+348 bps). These are the required E2E answers.',
   {x:0.62,y:4.66,w:8.8,h:0.40,fontSize:9,color:A.ok,fontFace:F,valign:'middle',margin:0});
 ftr(s,'7.5 Lambda Analysis Tools',19);}

// SLIDE 20 — forecast Lambda
{const s=pres.addSlide();
 hdr(s,'7.5','Lambda Analysis Tools','forecast: 4-Quarter Forward Projections');
 code(s,0.42,1.02,5.5,1.60,
`payload = {"entity": "US", "quarters_ahead": 4}
# Reads mart_forecast (pre-computed by dbt)
{ "projections": [
  {"quarter":"Q1 FY25","revenue":478.2,"growth_pct":6.2},
  {"quarter":"Q2 FY25","revenue":492.7,"growth_pct":7.1},
  {"quarter":"Q3 FY25","revenue":501.3,"growth_pct":5.4},
  {"quarter":"Q4 FY25","revenue":519.8,"growth_pct":8.0}]}`);
 tbl(s,[['Quarter','Revenue $M','YoY Growth','Confidence'],
   ['Q1 FY25','$478.2M','+6.2%','High (actuals through Q4 FY24)'],
   ['Q2 FY25','$492.7M','+7.1%','High'],
   ['Q3 FY25','$501.3M','+5.4%','Medium (extrapolation)'],
   ['Q4 FY25','$519.8M','+8.0%','Medium'],
 ],[1.3,1.4,1.2,4.46],0.42,2.78,{rh:0.36});
 crd(s,6.12,1.02,3.45,1.60,{accent:A.cyan});
 s.addText('Method',{x:6.28,y:1.10,w:3.1,h:0.24,fontSize:8.5,bold:true,color:A.inkD,fontFace:F,margin:0});
 bullet(s,6.28,1.34,3.1,['Historical: fct_revenue 8 quarters','dbt: 4-qtr rolling avg + seasonal index','mart_forecast pre-computed on dbt run','Lambda reads — no live calculation','Entities: US, EMEA, APAC, Consolidated'],{lh:0.36,fs:8.5,color:A.cyan});
 ftr(s,'7.5 Lambda Analysis Tools',20);}

// SLIDE 21 — 7.6 Module divider
{const s=pres.addSlide();
 modDiv(s,'7.6','Build FastAPI Layer','The API that connects everything.',21);}

// SLIDE 22 — 8 endpoints
{const s=pres.addSlide();
 hdr(s,'7.6','Build FastAPI Layer','8 Endpoints — One API for All Consumers');
 tbl(s,[['Endpoint','Method','What it does'],
   ['/chat','POST','NL question → Bedrock Agent → answer + citations'],
   ['/commentary','POST','entity + period → 4-paragraph CFO narrative (Claude)'],
   ['/boardpack','POST','Full PDF: P&L, ARR, AR aging, commentary (reportlab)'],
   ['/metrics/pl','GET','P&L actuals from mart_pl (entity, fiscal_year)'],
   ['/metrics/arr','GET','ARR waterfall from mart_arr'],
   ['/metrics/ar_aging','GET','AR aging buckets from mart_ar_aging'],
   ['/metrics/revenue','GET','Revenue time series from mart_revenue'],
   ['/health','GET','{"status":"ok"} — ALB health check'],
 ],[1.9,1.0,5.66],0.42,1.02,{rh:0.38});
 crd(s,0.42,4.16,9.16,0.60,{bg:A.brandS,border:A.brand});
 s.addText('Port 8000  ·  Auth: AWS Cognito JWT (lab skips auth)  ·  CORS: localhost:8501 allowed',
   {x:0.62,y:4.22,w:8.8,h:0.48,fontSize:9,color:A.brand,fontFace:F,valign:'middle',margin:0});
 ftr(s,'7.6 Build FastAPI Layer',22);}

// SLIDE 23 — FastAPI start + verify
{const s=pres.addSlide();
 hdr(s,'7.6','Build FastAPI Layer','Start & Verify the API');
 code(s,0.42,1.02,5.5,2.72,
`uvicorn ui.api.main:app --port 8000 --reload

# Health check
curl localhost:8000/health
# → {"status":"ok"}

# Metrics test
curl "localhost:8000/metrics/pl?entity=US&fiscal_year=2024"
# → {"rows":[{"period":"Oct-24","revenue":152.4,...}]}

# Chat test
curl -X POST localhost:8000/chat \\
  -H "Content-Type: application/json" \\
  -d '{"question":"Total revenue FY2024?",
       "memoryId":"analyst-test-01"}'
# → {"answer":"$1,807.9M","source":"mart_revenue"}`);
 crd(s,6.12,1.02,3.45,2.72,{accent:A.ok});
 s.addText('Verify checklist',{x:6.28,y:1.10,w:3.1,h:0.26,fontSize:8.5,bold:true,color:A.inkD,fontFace:F,margin:0});
 bullet(s,6.28,1.38,3.1,['GET /health → 200 {"status":"ok"}','GET /metrics/pl returns rows > 0','POST /chat → answer text + source','POST /commentary → 4 paragraphs','GET /metrics/arr → waterfall data'],{lh:0.44,fs:8.5,color:A.ok});
 crd(s,0.42,3.88,9.16,0.52,{accent:A.warn,bg:A.warnS});
 s.addText('If /chat 500: check BEDROCK_AGENT_ID=LUUHZWRDA4 env var and IAM role has bedrock:InvokeAgent.',
   {x:0.62,y:3.94,w:8.8,h:0.40,fontSize:9,color:A.warn,fontFace:F,valign:'middle',margin:0});
 ftr(s,'7.6 Build FastAPI Layer',23);}

// SLIDE 24 — 7.7 Module divider
{const s=pres.addSlide();
 modDiv(s,'7.7','Build Streamlit Dashboard','The dashboard FP&A will actually use.',24);}

// SLIDE 25 — 6 tabs overview
{const s=pres.addSlide();
 hdr(s,'7.7','Build Streamlit Dashboard','Six Tabs — One Dashboard');
 const tabs=[
   {n:'P&L',d:'Bar chart: revenue, gross profit, op income by quarter. Sidebar: entity + fiscal year.',c:A.brand},
   {n:'ARR',d:'Waterfall: new, expansion, churn, contraction, ending ARR. Toggle entity.',c:A.teal},
   {n:'AR Aging',d:'Bucket table: current, 30d, 60d, 90d+. Colour-coded. Drill by customer segment.',c:A.warn},
   {n:'AI Analyst',d:'NL chat → /chat API. Shows citations. Stores memoryId in session state.',c:A.violet},
   {n:'Commentary',d:'POST /commentary → 4-para CFO narrative. Copy-to-clipboard button.',c:A.cyan},
   {n:'Board Pack',d:'POST /boardpack → PDF download. All sections one click. ~8 s generation.',c:A.ok},
 ];
 tabs.forEach((t,i)=>{
   const col=i<3?0:4.72,row=i%3;
   crd(s,0.42+col,1.06+row*1.36,4.18,1.24,{accent:t.c});
   s.addText(t.n,{x:0.66+col,y:1.14+row*1.36,w:3.8,h:0.30,fontSize:11,bold:true,color:A.ink,fontFace:F,margin:0});
   s.addText(t.d,{x:0.66+col,y:1.47+row*1.36,w:3.8,h:0.76,fontSize:8,color:A.inkS,fontFace:F,margin:0,wrap:true});
 });
 crd(s,0.42,5.10,9.16,0.48,{bg:A.brandS,border:A.brand});
 s.addText('ui/app.py  ·  Streamlit 1.35+  ·  port 8501  ·  Charts: Plotly  ·  Theme: custom CSS',
   {x:0.62,y:5.16,w:8.8,h:0.36,fontSize:8.5,color:A.brand,fontFace:F,valign:'middle',margin:0});
 ftr(s,'7.7 Build Streamlit Dashboard',25);}

// SLIDE 26 — Streamlit start + verify
{const s=pres.addSlide();
 hdr(s,'7.7','Build Streamlit Dashboard','Start & Verify the Dashboard');
 code(s,0.42,1.02,5.5,2.00,
`# Terminal 2 (API already running on 8000)
streamlit run ui/app.py --server.port 8501
# Open: http://localhost:8501

# Smoke test — AI Analyst tab:
# "What was ACME total revenue in 2024?"
# Expected: $1,807.9M
# Source: mart_revenue (acme-finance-dev)`);
 kpi(s,6.12,1.02,1.60,1.00,'Revenue answer','$1,807.9M','FY2024  ✓',A.ok);
 kpi(s,7.86,1.02,1.61,1.00,'Response time','< 4 s','warm Redshift',A.ok);
 kpi(s,6.12,2.12,1.60,0.90,'Tabs loading','6 / 6','all green',A.ok);
 kpi(s,7.86,2.12,1.61,0.90,'Memory','active','analyst-test-01',A.brand);
 tbl(s,[['Tab','Verify with'],
   ['P&L','Entity=US, FY=2024 → bar chart renders'],
   ['ARR','Toggle EMEA → waterfall updates'],
   ['AI Analyst','"What was revenue?" → $1,807.9M'],
   ['Board Pack','Click Download → PDF opens correctly'],
 ],[2.0,3.4],0.42,3.22,{rh:0.34});
 crd(s,0.42,4.62,9.16,0.52,{accent:A.warn,bg:A.warnS});
 s.addText('If P&L tab empty: confirm dbt run completed. If AI Analyst errors: confirm API is running on port 8000.',
   {x:0.62,y:4.68,w:8.8,h:0.40,fontSize:9,color:A.warn,fontFace:F,valign:'middle',margin:0});
 ftr(s,'7.7 Build Streamlit Dashboard',26);}

// SLIDE 27 — 7.8 Module divider
{const s=pres.addSlide();
 modDiv(s,'7.8','End-to-End Test','Prove the whole system works before the client sees it.',27);}

// SLIDE 28 — E2E test sequence
{const s=pres.addSlide();
 hdr(s,'7.8','End-to-End Test','Six Queries — Six Expected Answers');
 tbl(s,[['#','Query','Tool','Expected'],
   ['1','ACME total revenue FY2024?','text_to_sql','$1,807.9M'],
   ['2','Operating margin last 3 years?','text_to_sql','+8.9%, +5.5%, −9.4% (FY22–24)'],
   ['3','Top variance driver EMEA FY2024?','variance_rca','R&D Personnel, Engineering EMEA'],
   ['4','What if R&D cut 15%?','whatif_sim','+348 bps, +$62.9M op income'],
   ['5','Revenue forecast next 4 quarters?','forecast','$478M, $493M, $501M, $520M'],
   ['6','[New session] Last focus area?','memory recall','EMEA (from session 1 memory)'],
 ],[0.4,3.2,2.0,3.00],0.42,1.02,{rh:0.38});
 crd(s,0.42,3.52,9.16,0.56,{bg:A.okS,border:A.ok});
 s.addText('Run all 6 before declaring done. Queries 1–5 test tools. Query 6 tests memory. All 6 must pass.',
   {x:0.62,y:3.58,w:8.8,h:0.44,fontSize:9,color:A.ok,fontFace:F,valign:'middle',margin:0});
 ftr(s,'7.8 End-to-End Test',28);}

// SLIDE 29 — Troubleshooting tree
{const s=pres.addSlide();
 hdr(s,'7.8','End-to-End Test','Troubleshooting: Systematic Debug Path');
 tbl(s,[['Check','Command','If it fails → fix'],
   ['API health','curl localhost:8000/health → {"status":"ok"}','Restart uvicorn; check port 8000'],
   ['dbt models','dbt test → PASS=42','Re-run dbt run; check workgroup active'],
   ['Agent status','aws bedrock-agent list-agents → PREPARED','terraform apply -target=module.bedrock_agent'],
   ['Gateway targets','list-gateway-targets → 5 ACTIVE','Re-apply agentcore; check Lambda ARNs'],
   ['Lambda logs','aws logs tail /aws/lambda/acme-finance-dev-*','Look for import errors or IAM issues'],
   ['Memory recall','Cross-session follow-up → context recalled','Check memoryId consistent; TTL not expired'],
 ],[1.8,3.3,3.46],0.42,1.02,{rh:0.37});
 crd(s,0.42,3.96,9.16,0.68,{accent:A.red,bg:A.redS});
 s.addText('Most common failure: Redshift cold start timeout. If Lambda returns 504, wait 60 s and retry. Redshift Serverless auto-resumes — it does not fail permanently.',
   {x:0.62,y:4.02,w:8.8,h:0.56,fontSize:9,color:A.red,fontFace:F,valign:'middle',margin:0,wrap:true});
 ftr(s,'7.8 End-to-End Test',29);}

// SLIDE 30 — 7.9 Module divider
{const s=pres.addSlide();
 modDiv(s,'7.9','Commentary & Board Pack','From data to board-ready deliverables in one API call.',30);}

// SLIDE 31 — /commentary
{const s=pres.addSlide();
 hdr(s,'7.9','Commentary & Board Pack','/commentary — CFO Narrative in 4 Paragraphs');
 code(s,0.42,1.02,4.6,1.54,
`POST /commentary
{"entity":"EMEA","period":"Sep-2024","fiscal_year":2024}

# Returns 4-paragraph narrative (~6 s)
# Claude uses mart_pl actuals as grounding data.`);
 crd(s,5.22,1.02,4.35,3.60,{accent:A.violet,shadow:shL()});
 s.addText('Output structure',{x:5.38,y:1.10,w:3.9,h:0.26,fontSize:8.5,bold:true,color:A.inkD,fontFace:F,margin:0});
 bullet(s,5.38,1.38,3.9,
   ['§1 Executive summary — revenue, margin, key call-out',
    '§2 Revenue drivers — geography, product mix, FX',
    '§3 Cost drivers — headcount, R&D, OpEx vs plan',
    '§4 Outlook — next quarter risks + opportunities'],{lh:0.60,fs:9,color:A.violet});
 crd(s,0.42,2.70,4.6,0.96,{bg:A.violetS,border:A.violet});
 s.addText('"EMEA reported revenue of $412.3M for Sep-2024, achieving 94% of plan. R&D Personnel variance of −$4.2M was the largest miss, driven by Engineering EMEA headcount additions…"',
   {x:0.62,y:2.76,w:4.2,h:0.84,fontSize:8,italic:true,color:A.violet,fontFace:F,margin:0,wrap:true});
 crd(s,0.42,3.80,4.6,0.82,{accent:A.ok,bg:A.okS});
 s.addText('Verify: POST EMEA Sep-2024 → 4 paragraphs → all numbers match mart_pl → no hallucinations.',
   {x:0.62,y:3.86,w:4.2,h:0.70,fontSize:9,color:A.ok,fontFace:F,margin:0,wrap:true});
 ftr(s,'7.9 Commentary & Board Pack',31);}

// SLIDE 32 — /boardpack
{const s=pres.addSlide();
 hdr(s,'7.9','Commentary & Board Pack','/boardpack — One-Click Board PDF');
 code(s,0.42,1.02,5.0,1.36,
`POST /boardpack
{"entity":"EMEA","period":"Sep-2024","fiscal_year":2024}
# Returns application/pdf (~350 KB, ~8 s generation)
# Streamlit: st.download_button("Download", pdf_bytes)`);
 tbl(s,[['Section','Source','Pages'],
   ['P&L Actuals vs Plan','mart_pl (Redshift)','3'],
   ['ARR Waterfall','mart_arr (Redshift)','1'],
   ['AR Aging','mart_ar_aging (Redshift)','1'],
   ['CFO Commentary','Claude via /commentary','1'],
   ['Cover + Appendix','Static template','2'],
 ],[2.8,4.0,1.56],0.42,2.52,{rh:0.36});
 crd(s,5.62,1.02,4.0,1.36,{accent:A.ok});
 bullet(s,5.78,1.14,3.7,['P&L actuals (3 pages)','ARR waterfall (1 page)','AR aging table (1 page)','CFO commentary (1 page)','Total: ~8 pages, ~350 KB PDF'],{lh:0.24,fs:8.5,color:A.ok});
 crd(s,0.42,4.50,9.16,0.58,{bg:A.brandS,border:A.brand});
 s.addText('Verify: EMEA Sep-2024 PDF downloads, opens without error, correct revenue and commentary match /metrics/pl.',
   {x:0.62,y:4.56,w:8.8,h:0.46,fontSize:9,color:A.brand,fontFace:F,valign:'middle',margin:0});
 ftr(s,'7.9 Commentary & Board Pack',32);}

// SLIDE 33 — 7.10 Module divider
{const s=pres.addSlide();
 modDiv(s,'7.10','Use Cases & Testing','Validate against real FP&A use cases before calling it done.',33);}

// SLIDE 34 — Use case test suite
{const s=pres.addSlide();
 hdr(s,'7.10','Use Cases & Testing','Six Use Cases — Run All Before Done');
 tbl(s,[['#','Use Case','Expected Output','Pass?'],
   ['UC-1','NL: "FY2024 total revenue?"','$1,807.9M from mart_revenue','☐'],
   ['UC-2','NL: "Op margin last 3 years?"','FY22 +8.9%, FY23 +5.5%, FY24 −9.4%','☐'],
   ['UC-3','NL: "Top EMEA cost overrun?"','R&D Personnel, Eng EMEA −$4.2M','☐'],
   ['UC-4','NL: "R&D cut 15%?"','+348 bps, +$62.9M op income','☐'],
   ['UC-5','POST /commentary EMEA Sep-24','4-para CFO narrative, no hallucinations','☐'],
   ['UC-6','Cross-session follow-up','Agent recalls entity from prior session','☐'],
 ],[0.4,3.2,4.3,0.86],0.42,1.02,{rh:0.38});
 crd(s,0.42,3.52,9.16,0.64,{bg:A.warnS,border:A.warn,accent:A.warn});
 s.addText('All 6 must pass. If UC-3 or UC-4 fail → check Lambda CloudWatch logs. If UC-6 fails → verify memoryId consistent across sessions.',
   {x:0.62,y:3.58,w:8.8,h:0.52,fontSize:9,color:A.warn,fontFace:F,valign:'middle',margin:0,wrap:true});
 ftr(s,'7.10 Use Cases & Testing',34);}

// SLIDE 35 — Adapt for your engagement
{const s=pres.addSlide();
 hdr(s,'7.10','Use Cases & Testing','Adapt This Architecture for Your Engagement');
 crd(s,0.42,1.02,2.95,3.56,{accent:A.brand});
 s.addText('Swap the data layer',{x:0.58,y:1.10,w:2.65,h:0.28,fontSize:9,bold:true,color:A.brand,fontFace:F,margin:0});
 bullet(s,0.58,1.40,2.65,['Replace ACME dbt models','Point to client Redshift schema','Update mart names in Lambda SQL','dbt tests become your data SLA'],{lh:0.44,fs:8.5});
 crd(s,3.57,1.02,2.95,3.56,{accent:A.teal});
 s.addText('Update the system prompt',{x:3.73,y:1.10,w:2.65,h:0.28,fontSize:9,bold:true,color:A.teal,fontFace:F,margin:0});
 bullet(s,3.73,1.40,2.65,['Client fiscal calendar','Entity hierarchy (BU names)','KPI definitions (their ARR)','Tone: board vs. operational'],{lh:0.44,fs:8.5,color:A.inkS});
 crd(s,6.72,1.02,2.86,3.56,{accent:A.violet});
 s.addText('Architecture stays fixed',{x:6.88,y:1.10,w:2.5,h:0.28,fontSize:9,bold:true,color:A.violet,fontFace:F,margin:0});
 bullet(s,6.88,1.40,2.5,['Agent ID changes','Lambda targets update','FastAPI unchanged','Streamlit unchanged','TF modules reused'],{lh:0.44,fs:8.5,color:A.inkS});
 crd(s,0.42,4.70,9.16,0.50,{bg:A.brandS,border:A.brand});
 s.addText('Re-platforming effort: 3–5 days for a new client with an existing dbt project. Architecture is the repeatable asset.',
   {x:0.62,y:4.76,w:8.8,h:0.38,fontSize:9,color:A.brand,fontFace:F,valign:'middle',margin:0});
 ftr(s,'7.10 Use Cases & Testing',35);}

// SLIDE 36 — What you built
{const s=pres.addSlide();
 hdr(s,null,null,'Section 7 Complete — What You Built');
 [
   {label:'Data Layer',
    detail:'Redshift Serverless: acme-finance-dev  ·  dbt: 18 models → 5 mart tables  ·  Schema: analytics_dev_marts',c:A.teal,y:1.10},
   {label:'Intelligence Layer',
    detail:'Bedrock Agent LUUHZWRDA4 (Claude Sonnet)  ·  AgentCore Gateway: 5 targets  ·  AgentCore Memory: SEMANTIC, 30-day TTL  ·  3 Lambda tools',c:A.brand,y:2.50},
   {label:'Presentation Layer',
    detail:'FastAPI: 8 endpoints, port 8000  ·  Streamlit: 6 tabs, port 8501  ·  /boardpack: PDF (reportlab)  ·  /commentary: CFO narrative (Claude)',c:A.violet,y:3.90},
 ].forEach(l=>{
   crd(s,0.42,l.y,9.16,1.22,{accent:l.c});
   s.addText(l.label,{x:0.62,y:l.y+0.08,w:9.0,h:0.28,fontSize:10,bold:true,color:l.c,fontFace:F,margin:0});
   s.addText(l.detail,{x:0.62,y:l.y+0.38,w:8.8,h:0.76,fontSize:8.5,color:A.inkS,fontFace:F,margin:0,wrap:true});
 });
 ftr(s,'Section 7 — Recap',36);}

// SLIDE 37 — Key numbers
{const s=pres.addSlide();
 hdr(s,null,null,'Key Numbers — All Verified');
 kpi(s,0.42,1.02,2.14,1.10,'FY2024 Revenue','$1,807.9M','Consolidated  ✓',A.brand);
 kpi(s,2.70,1.02,2.14,1.10,'Op Margin trend','+8.9/+5.5/−9.4%','FY22→FY24  ✓',A.teal);
 kpi(s,4.98,1.02,2.14,1.10,'EMEA top driver','R&D Personnel','Eng EMEA −$4.2M  ✓',A.red);
 kpi(s,7.26,1.02,2.32,1.10,'R&D −15% sim','+348 bps','+$62.9M  ✓',A.ok);
 kpi(s,0.42,2.26,2.14,1.00,'Memory recall','✓','Cross-session',A.violet);
 kpi(s,2.70,2.26,2.14,1.00,'dbt tests','42 PASS','0 errors',A.ok);
 kpi(s,4.98,2.26,2.14,1.00,'Gateway targets','5 ACTIVE','All routed',A.brand);
 kpi(s,7.26,2.26,2.32,1.00,'Board Pack','PDF ✓','EMEA Sep-24',A.teal);
 crd(s,0.42,3.42,9.16,1.72,{accent:A.ok,bg:A.okS,shadow:shL()});
 s.addText('All numbers come from the ACME seed data loaded during dbt run. If you see different values, run: dbt seed && dbt run',
   {x:0.62,y:3.52,w:8.8,h:0.52,fontSize:9,color:A.ok,fontFace:F,margin:0});
 s.addText('These numbers appear in: this slide deck, the narration script, the E2E test checklist, and the sample board pack. Consistency is intentional.',
   {x:0.62,y:4.10,w:8.8,h:0.52,fontSize:9,color:A.inkD,fontFace:F,margin:0});
 ftr(s,'Section 7 — Recap',37);}

// SLIDE 38 — Claude Code hours saved
{const s=pres.addSlide();
 hdr(s,null,null,'Claude Code — Hours Saved During the Build');
 tbl(s,[['Task','Manual estimate','With Claude Code','Saved'],
   ['Lambda SQL (3 tools)','6 hrs','1.5 hrs','4.5 hrs'],
   ['Terraform modules','4 hrs','1 hr','3 hrs'],
   ['FastAPI endpoints (8)','5 hrs','1.5 hrs','3.5 hrs'],
   ['dbt models (18)','8 hrs','2 hrs','6 hrs'],
   ['Streamlit UI (6 tabs)','6 hrs','2 hrs','4 hrs'],
   ['Unit + E2E tests','4 hrs','1 hr','3 hrs'],
   ['Total','33 hrs','9 hrs','~24 hrs'],
 ],[3.2,2.2,2.2,1.96],0.42,1.02,{rh:0.38});
 crd(s,0.42,4.06,9.16,0.76,{bg:A.brandS,border:A.brand,shadow:shL()});
 s.addText('"Claude Code is the fastest junior engineer I\'ve worked with. It writes the boilerplate so I can focus on the architecture decisions that matter."',
   {x:0.62,y:4.14,w:8.8,h:0.62,fontSize:10,italic:true,color:A.brand,fontFace:F,valign:'middle',margin:0});
 ftr(s,'Section 7 — Recap',38);}

// SLIDE 39 — Post-lab questions
{const s=pres.addSlide();
 hdr(s,null,null,'Common Post-Lab Questions');
 tbl(s,[['Question','Answer'],
   ['How do I add a new Lambda tool?','Add target to agentcore locals. Write Lambda following the shared pattern (slide 17). Update Bedrock Agent action group with the new tool schema.'],
   ['How do I change the system prompt?','Edit infrastructure/modules/bedrock_agent/system_prompt.txt. Run terraform apply -target=module.bedrock_agent. Agent re-prepares in ~2 min.'],
   ['How do I add a new entity?','Add entity to Redshift seed data. Re-run dbt seed && dbt run. Entity is queryable immediately — no agent changes needed.'],
   ['Can I use a different LLM?','Yes — change foundation_model in Terraform. Claude Sonnet recommended for finance: it follows structured output instructions most reliably.'],
   ['How do I productionise this?','Add Cognito auth to FastAPI. Move Streamlit to ECS Fargate. Add CloudWatch alarms for Lambda errors. Enable Redshift usage limits. See Section 8.'],
 ],[3.4,6.16],0.42,1.02,{rh:0.62});
 ftr(s,'Section 7 — Recap',39);}

// SLIDE 40 — Section recap + teaser
{const s=pres.addSlide();
 s.background={color:A.nav};
 s.addShape(R,{x:0,y:0,w:SW,h:0.05,fill:{color:A.brand},line:{color:A.brand}});
 s.addShape(R,{x:0.55,y:0.72,w:0.06,h:1.96,fill:{color:A.brand},line:{color:A.brand}});
 s.addText('SECTION 7 COMPLETE',{x:0.72,y:0.72,w:5,h:0.26,fontSize:8.5,bold:true,color:A.navM,fontFace:F,margin:0});
 s.addText('Hands-On Build',{x:0.72,y:0.98,w:6,h:0.60,fontSize:30,bold:true,color:A.W,fontFace:F,margin:0});
 s.addText('You deployed a production-pattern finance AI stack:\ndata → intelligence → presentation → board-ready output.',
   {x:0.72,y:1.64,w:6.2,h:0.68,fontSize:11,color:A.navI,fontFace:F,margin:0});
 const pills=['18 dbt models','3 Lambda tools','5 Gateway targets','8 API endpoints','6 Streamlit tabs','2 deliverables'];
 pills.forEach((p,i)=>{
   const px=0.72+(i%3)*2.12,py=2.50+Math.floor(i/3)*0.54;
   s.addShape(R,{x:px,y:py,w:1.96,h:0.42,fill:{color:'1e2d45'},line:{color:A.brand,pt:1}});
   s.addText(p,{x:px,y:py,w:1.96,h:0.42,fontSize:9,bold:true,color:A.W,fontFace:F,align:'center',valign:'middle',margin:0});
 });
 crd(s,0.42,3.74,9.16,0.96,{bg:'1e2d45',border:'2a3d5a',shadow:shL()});
 s.addShape(R,{x:0.42,y:3.74,w:0.06,h:0.96,fill:{color:A.ok},line:{color:A.ok}});
 s.addText('Next →  Section 8 — Execution: Roadmap, Operating Model & ROI',
   {x:0.60,y:3.86,w:8.8,h:0.36,fontSize:12,bold:true,color:A.W,fontFace:F,margin:0});
 s.addText('From the lab to production. Governance, change management, and proving the business case.',
   {x:0.60,y:4.30,w:8.8,h:0.28,fontSize:9,color:A.navI,fontFace:F,margin:0});
 s.addText('~150 min  ·  11 modules  ·  40 slides built',{x:0.72,y:5.08,w:5,h:0.22,fontSize:7.5,color:A.navM,fontFace:F,margin:0});
 ftr(s,'Section 7 — Hands-On Build',40,true);}

// ── WRITE ──────────────────────────────────────────────────────────────────
pres.writeFile({fileName:OUT}).then(()=>{
  console.log(`✓  section-7-slides.pptx written (${TOT} slides)`);
}).catch(e=>{console.error('ERROR:',e.message);process.exit(1);});

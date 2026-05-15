# AI Finance Transformation: Strategy to Working Agents on AWS
## Instructor Narration Script — Sections 1–3 (41 Slides, ~110 Minutes)

**Format notes**
- `[~Xm]` = estimated recording duration per module
- `[PAUSE]` = natural breath / let the slide land
- `[CLICK]` = advance animation or next element on the same slide
- `[POINT]` = gesture toward or highlight a specific screen element
- Numbers and abbreviations are written phonetically where helpful

---

## Title Slide [~1m]

[SLIDE 1 — Course title: "AI Finance Transformation: Strategy to Working Agents on AWS"]

Welcome to AI Finance Transformation: Strategy to Working Agents on AWS.

This course is for Solution Architects — people who know how to wire AWS services together, but who may not have spent a lot of time inside a finance department. By the end of these three sections, you'll understand the finance domain deeply enough to design AI systems that actually solve FP&A problems — not just technically correct ones, but ones that a CFO would actually pay for.

We're going to cover strategy, domain knowledge, and architecture — in that order. Strategy first, because if you don't know what problem you're solving for the CFO, none of the architecture matters. Domain second, because finance has a vocabulary and a rhythm that you need to speak fluently before you write a single line of code. Architecture third, because by the time you get there, every design decision will already make sense.

The working system we build throughout this course is called ACME Finance. It's a realistic B2B SaaS company — twelve FP&A analysts, three geographic entities, a full data pipeline from ERP all the way through Bedrock Agent and AgentCore. Everything we discuss has a corresponding piece of running code.

Let's get started.

[PAUSE]

---

## Table of Contents [~1.5m]

[SLIDE 2 — Table of Contents with three sections and module list]

Here's your roadmap for these three sections.

[POINT to Section 01]

Section one is "The Finance Transformation Imperative." Eight modules. We start with the CFO's actual problems — not theoretical ones — and work through why AI-powered finance automation is possible now when it wasn't possible five years ago. We'll also look at the architecture and the full phase roadmap for ACME.

[POINT to Section 02]

Section two is "The Finance Domain." This is the section most architects skip, and it's the reason most finance AI projects fail. Nine modules covering the three financial statements, the metrics every FP&A analyst obsesses over, the monthly close calendar, and — critically — how all of those concepts map directly to the dbt models and API endpoints in our codebase.

[POINT to Section 03]

Section three is "Transformation Strategy." Nine modules. We go use case by use case — natural language querying, variance root-cause analysis, what-if simulation, business case — and we look at the Bedrock and AgentCore architecture in depth.

Each section ends with a recap slide. You can navigate directly to any module from this table of contents — just click the title. All right — let's go to Section One.

[PAUSE]

---

## Section 1 — The Finance Transformation Imperative

---

### Section Opener [~30s]

[SLIDE 3 — Section 01 title card with module list]

Section One: The Finance Transformation Imperative. Eight modules. We're going to start at the business problem and work toward the solution. If you already know why AI finance automation matters, this section gives you the vocabulary to explain it to a CFO. If you're new to the space, this section will reframe how you think about the entire build.

[PAUSE]

---

### Module 1.1 — Five CFO Pain Points [~3m]

[SLIDE 4 — Five CFO Pain Points, icon grid]

Let's start with the problem. Not "CFOs need better dashboards" — the specific, quantified, career-defining problems that are making finance leaders lose sleep.

There are five of them, and every one maps to a specific capability we build in this course.

[POINT to Pain Point 01]

Pain point one: close takes too long. The average month-end close is six-point-four days. That sounds reasonable until you realize that FP&A analysts spend three of those days just wrangling data — pulling from systems, copying into spreadsheets, reconciling. Three days of a highly paid analyst's time, every single month, on work that produces zero insight. The close doesn't end when the books close. It ends when the CFO has a report that explains what happened.

[POINT to Pain Point 02]

Pain point two: variance lag. When actuals come in — when revenue is below budget or R&D is over — the CFO needs to know why. Not eventually. At the board meeting. Right now, root-cause analysis takes two to three analyst-days. The analyst pulls GL data, slices by cost center, by account, by entity, calculates variances, and writes up a narrative. That's the workflow. The AI system we build reduces that to four minutes.

[POINT to Pain Point 03]

Pain point three: forecast drift. Spreadsheet-based rolling forecasts diverge from reality by eight to twelve percent by Q3. Why? Because the inputs are manual. Someone updates a cell, someone else doesn't. There's no version control. The forecast that the board sees in October may be based on assumptions from July that nobody updated. We address this with the forecast Lambda.

[POINT to Pain Point 04]

Pain point four: the data bottleneck. Every ad-hoc question — "What was APAC gross margin last quarter?" — requires either a SQL-capable analyst or an IT ticket. The IT ticket has a 48-hour turnaround. During a board meeting, when the CFO gets a question and needs to turn to their team, 48 hours is not an option. The text-to-sql Lambda solves exactly this.

[POINT to Pain Point 05]

Pain point five: commentary hours. The board package narrative — the written section that explains what happened and why — takes a full day to produce. Eighty percent of that time is formatting numbers and rechecking figures. Twenty percent is actual insight. We're going to automate the eighty percent in Phase Nine.

These five pain points are the brief for everything we build. Keep them in mind throughout the course. Every architectural decision traces back to one of them.

[PAUSE]

---

### Module 1.2 — The Cost of Inaction [~3m]

[SLIDE 5 — The Cost of Staying Manual, metrics and improvement table]

Now let's put dollar signs on those pain points. Because "FP&A spends too much time on data" is an argument. "You're burning one-point-nine million dollars a year on preventable manual work" is a business case.

[POINT to 62% stat]

The first number to understand is sixty-two percent. Per McKinsey's 2024 Finance Survey, FP&A teams spend sixty-two percent of their time on data wrangling — gathering, cleaning, reconciling — rather than analysis. Not sixty-two percent of junior analyst time. Sixty-two percent of the total FP&A function, across all seniority levels.

At ACME, that's twelve analysts at a hundred and twenty-five thousand dollars fully-loaded cost. Twelve times one-twenty-five is one-point-five million in total FP&A spend. Sixty-two percent of that is nine hundred and thirty thousand dollars a year spent on work that a well-built data pipeline and AI system can do faster and more accurately.

[POINT to $1.9M figure]

The total annual cost of the manual close process — including wrangling, variance analysis, and commentary — is one-point-nine million dollars. That's our baseline.

[POINT to improvement table]

Now look at the projected improvements after AI. Close duration drops from six-point-four days to three-point-five days — a forty-five percent reduction. Variance RCA — the root-cause analysis workflow — drops from two-point-eight analyst-days to four hours. That's a ninety-three percent reduction. The portion of FP&A time spent on wrangling drops from sixty-two percent to eighteen percent — forty-four percentage points freed up for actual analysis. And forecast accuracy improves by forty-six percent.

These are the numbers you use in the business case conversation. We'll go deeper on business case framing in Section Three, module three-point-six. But I want you to have these figures in your head from the start, because they are the why behind every technical decision we make.

[PAUSE]

---

### Module 1.3 — Why Finance AI Works Now [~3.5m]

[SLIDE 6 — Why Now: four-column timeline 2019 → 2022 → 2024 → 2026]

This slide answers the question you'll get from every skeptical CFO: "We tried this before and it didn't work. Why is this time different?"

The answer is: three capability shifts converged at the same time in 2024.

[POINT to 2019 column]

In 2019, finance AI was genuinely not feasible at scale. Natural language processing required fifty thousand or more training examples to be reliable. There were no managed LLM APIs — the best available model was GPT-2, which couldn't follow complex instructions. ETL pipelines were hand-written, not standardized. Anything you built required SageMaker ML engineering — a specialized skill set. The result was multi-million dollar projects that got abandoned when the model didn't generalize to new questions.

[POINT to 2022 column]

By 2022, things were better but not there yet. GPT-3 introduced few-shot prompting, which was genuinely exciting — you could get a model to do something useful with just a few examples. AWS JumpStart added foundation models. dbt emerged as an analytics engineering standard. But there was no reliable agent orchestration, no tool use, and hallucinations were still a serious problem for anything numeric.

[POINT to 2024 column]

2024 was the inflection point. Three things arrived together: Claude 3 and GPT-4 brought genuine reasoning and structured tool use. AWS Bedrock went GA as an enterprise-grade managed service — no infrastructure to manage, no model training, IAM-native security. And critically for finance, dbt marts had matured at companies like ACME into clean, well-documented analytics layers. When you have a reliable semantic layer under the AI, hallucinations drop dramatically because the model can query facts rather than recall them.

[POINT to 2026 column]

And by 2026 — which is now — we have AgentCore GA, with Gateway for tool management and Memory for cross-session context. The Bedrock Agent at ACME runs five Lambda tools, has persistent analyst memory, and delivers answers in under three seconds. The six-week build timeline is real — this is not a theoretical architecture.

The key insight is that no single one of these — foundation models, managed infrastructure, or clean data — was sufficient on its own. You needed all three. That's what makes 2024 the boundary.

[PAUSE]

---

### Module 1.4 — Three AI Capabilities [~3m]

[SLIDE 7 — Three AI Capabilities, three-column layout]

Now let's go one level deeper. There are three specific AI capabilities that power finance automation, and each one maps directly to one or more Lambda tools in the ACME architecture.

[POINT to Capability 01 — Natural Language Understanding]

First: natural language understanding. This is the ability to parse a finance question written in plain English and convert it into a structured database query. When Sarah the FP&A analyst types "Show EMEA operating margin for Q3 versus Q4," the agent needs to extract: entity equals EMEA, metric equals operating margin, time period equals Q3 and Q4, intent equals comparison. It then generates parameterized SQL against the mart-pl table and returns a formatted answer. Zero SQL knowledge required from the analyst. This is the text-to-sql Lambda.

[POINT to Capability 02 — Reasoning and Root-Cause Analysis]

Second: reasoning and root-cause analysis. This is qualitatively different from natural language understanding. It's not just "what is the number?" It's "why is the number different from what we expected?" The variance-rca Lambda queries fct-gl-entries — the actual journal entry data — against stg-epm-plan-line, the budget data. It calculates variance for every account and cost center, ranks the top drivers by magnitude, and feeds those to the agent, which then generates a narrative. A task that previously took two analyst-days is now a five-minute automated run.

[POINT to Capability 03 — Scenario Simulation]

Third: scenario simulation. This is forward-looking. The whatif-sim Lambda takes a percentage change on any P&L line item — "what if R&D drops by fifteen percent?" — and cascades the effect through the full income statement. The forecast Lambda uses historical patterns to project four quarters forward. The describe-metric Lambda gives instant business definitions for any finance term. These three tools together mean an analyst can answer "what happens to our operating margin if we freeze hiring?" in under three seconds — a question that previously required a finance model rebuild.

Map these capabilities to the five pain points from module one-point-one, and you'll see they cover them completely.

[PAUSE]

---

### Module 1.5 — Finance AI Maturity Model [~2.5m]

[SLIDE 8 — Four Maturity Levels: Assisted → Augmented → Integrated → Autonomous]

The maturity model gives you a framework for where any finance AI deployment sits and where it's going. This is useful both for planning your own roadmap and for managing executive expectations.

[POINT to Level 01 — Assisted]

Level one is Assisted. This is where ACME was in FY2023. Natural language querying works — you can ask a question in English and get a SQL-powered answer. But the output requires analyst formatting. The AI is a faster way to get data; it's not yet changing the workflow.

[POINT to Level 02 — Augmented]

Level two is Augmented, which is where ACME is today after Phase Eight. Variance RCA is automated. What-if simulation runs in real time. Cross-session memory means the agent remembers that last month you discussed EMEA margin trends. The analyst's workflow genuinely changes — they're reviewing and interpreting rather than gathering and formatting.

[POINT to Level 03 — Integrated]

Level three is Integrated, which is ACME's target for Q4 of FY2026. The agent writes the commentary draft. Forecasts auto-refresh on schedule. Anomaly alerts fire when actuals deviate from trend. FP&A's job becomes reviewing and approving rather than building.

[POINT to Level 04 — Autonomous]

Level four is Autonomous — the future state. The agent triggers close steps, the pipeline self-heals, the board package is assembled end-to-end. FP&A is purely strategic. We are not building this today. I include it because it's where the technology is heading, and understanding the destination helps you make better architectural decisions at Level Two.

The practical value of this model: it lets you have a specific conversation with the CFO. "We're at Level One today, we'll deliver Level Two in eight weeks, Level Three is a Q4 initiative." That's a roadmap, not a pitch.

[PAUSE]

---

### Module 1.6 — ACME Today [~2.5m]

[SLIDE 9 — ACME Today: what's working, known gaps, FY2024 scorecard]

Let's ground ourselves in the current state of the ACME Finance system. This is the baseline for everything we build in the labs.

[POINT to "What Is Working" column]

What's working: the text-to-sql pipeline is live with an average response time of two-point-eight seconds from natural language input to formatted answer. The P&L, ARR, and AR aging dashboards are live in Streamlit. The FP&A team is using the NL query interface daily. The Bedrock Agent is deployed with AgentCore Gateway routing all five Lambda tools. AgentCore Memory is wired with a semantic strategy — analysts' context persists across sessions.

[POINT to "Known Gaps" column]

The known gaps going into Phase Nine and Ten: commentary auto-draft and board package automation. Management commentary — the written narrative — still requires a human to write from scratch. And the board package PDF still requires an analyst to assemble manually. Those are the two deliverables of Phase Nine and Phase Ten respectively, and we have working code for both of them in this codebase.

[POINT to FY2024 Scorecard]

The FY2024 Finance Scorecard is important — memorize these numbers. Total revenue: one-point-eight billion. Gross profit: one-point-four billion. Gross margin: seventy-seven-point-five percent. Operating income: negative one hundred and seventy million. Operating margin: negative nine-point-four percent. Three entities: US, EMEA, APAC. Period range: January through December 2024.

These are your ground-truth numbers for every lab exercise. If your queries return different figures, the first place to look is the dbt model logic. We'll come back to why in Section Two.

[PAUSE]

---

### Module 1.7 — Solution Architecture [~3m]

[SLIDE 10 — End-to-End Architecture: four layers, all managed services]

Here's the end-to-end architecture. I want you to be able to describe every component in this diagram without looking at notes before you start the labs.

[POINT to UI Layer]

At the top: the UI Layer. Streamlit is the analyst-facing dashboard — five tabs: P&L, ARR, AR Aging, Chat, Commentary, and Board Pack. FastAPI sits behind it as a REST proxy, handling all communication with AWS services. The reason for FastAPI rather than calling AWS directly from Streamlit is clean separation: the API handles authentication, request validation, and response formatting, while Streamlit handles purely the visual layer.

[POINT to AI Orchestration layer]

Next: AI Orchestration. The Bedrock Agent running Claude Sonnet is the brain. It receives questions, decides which tools to call, reads the results, and decides what to say next. AgentCore Gateway sits between the agent and the Lambda tools — it's the unified MCP-compatible tool registry. AgentCore Memory provides cross-session context, keyed by a per-analyst memory ID.

[POINT to Tool Layer]

The Tool Layer is five Lambda functions: text-to-sql for natural language queries, variance-rca for root-cause analysis, forecast for forward projection, whatif-sim for scenario modeling, and describe-metric for business definitions. Each one is registered as a target in the AgentCore Gateway.

[POINT to Data Layer]

At the bottom: the Data Layer in Redshift. Four marts that the AI tools query: mart-pl for P&L actuals, fct-arr for ARR movement data, mart-ar-aging for accounts receivable, fct-gl-entries for raw journal entries used in variance analysis, and stg-epm-plan-line for budget data.

The critical design principle here: all AI tools query the marts layer only. Never staging, never intermediate. We'll explain why in Section Two when we cover the dbt model map.

Notice that every component is either serverless or fully managed. There is no persistent EC2 instance in the AI path. This is what makes the cost model in Section Three feasible.

[PAUSE]

---

### Module 1.8 — Phase Roadmap [~3m]

[SLIDE 11 — Eight-Phase Roadmap, horizontal timeline]

Let me walk you through all eight phases so you understand how the system was built incrementally and why each phase exists.

[POINT to P1]

Phase One: natural language querying. The first thing we built was the text-to-sql Lambda and the first version of the Bedrock Agent. FP&A could type a question and get a SQL-powered answer. Minimal UI — just an input box. But it proved the core capability immediately.

[POINT to P2]

Phase Two: the P&L dashboard. mart-pl was the first dbt mart we built, and Phase Two put a visual on it. Bar charts by entity, quarterly breakdown, the numbers the CFO looks at every month.

[POINT to P3]

Phase Three: ARR tracking. fct-arr stores all the ARR movement data — new, expansion, contraction, churn, renewal. Phase Three added the ARR waterfall visualization. This is the chart that investors look at.

[POINT to P4]

Phase Four: AR aging. mart-ar-aging buckets outstanding invoices by days overdue. This is the Treasury team's tool — they use it to prioritize collections. Phase Four added that third dashboard tab.

[POINT to P5 and P6]

Phase Five: variance RCA Lambda. Phase Six: what-if simulation and the forecast Lambda. By the end of Phase Six, the full tool suite is implemented, but the agent is still calling Lambda functions directly via action groups — not through a gateway.

[POINT to P7 and P8]

Phase Seven wired everything to the Bedrock Agent with a proper ReAct loop. Phase Eight — the big one — introduced AgentCore Gateway and Memory. The gateway eliminated the action-group wiring overhead for five tools. Memory gave the agent persistent cross-session context. Phase Eight is the production architecture.

Phases Nine and Ten are commentary automation and board package generation. If you're doing the labs, you'll build these last two phases yourself. The code is already in the repository.

All right. Let's wrap up Section One.

[PAUSE]

---

### Section 1 — Recap [~1.5m]

[SLIDE 12 — Section 1 Recap, six checkmarks]

Section one complete. Let's lock in the key points.

[POINT to each checkmark as you name it]

The five CFO pain points: close lag, variance delay, forecast drift, data bottleneck, and commentary hours. Every tool we build addresses at least one of these.

The cost of staying manual: one-point-nine million dollars per year at ACME. That number comes from twelve analysts at sixty-two percent wasted time. It's the business case floor.

The 2024 inflection: foundation model reasoning plus managed Bedrock plus mature dbt analytics patterns. All three had to converge. They did.

The three AI capabilities: natural language understanding, root-cause reasoning, and scenario simulation. These map directly to the Lambda tools.

The four maturity levels: Assisted, Augmented, Integrated, Autonomous. ACME is completing Level Two today.

The architecture: Bedrock Agent plus AgentCore Gateway plus Memory plus five Lambda tools. All managed, all serverless, all Terraform-managed.

Take a short break if you need one. Section Two is the most important section in the course for long-term success with finance AI. Let's go.

[PAUSE]

---

## Section 2 — The Finance Domain

---

### Section Opener [~30s]

[SLIDE 13 — Section 02 title card]

Section Two: The Finance Domain. This is the section where we translate finance into the vocabulary you'll need to read and write code for FP&A systems. Nine modules. We cover the finance organization, the three financial statements, P&L and SaaS metrics, the monthly close calendar, data vocabulary, and the dbt model map. When you finish this section, you'll be able to read an FP&A analyst's question and know exactly which table, column, and mart it maps to.

[PAUSE]

---

### Module 2.1 — The Finance Organization [~2.5m]

[SLIDE 14 — Finance Organization table: five roles]

Before we write a single line of code, we need to know who we're building for.

Finance is not a monolith. There are five distinct roles in the finance org, and they have almost nothing in common from a day-to-day workflow perspective.

[POINT to CFO row]

The CFO owns strategy, board reporting, and budget approval. The CFO is your business case sponsor. They will approve the investment, define what success looks like, and — if things go wrong — they're the one calling for answers. You rarely build tools for the CFO directly. You build tools that make the CFO's team faster, and the CFO measures success by how much time they get back.

[POINT to FP&A row]

FP&A — Financial Planning and Analysis — is our primary user. I'll repeat that because it's the most important sentence in this entire section: we are building for FP&A. They own budgeting, forecasting, variance analysis, and management reporting. Everything — every Lambda tool, every API endpoint, every Streamlit tab — is designed for the FP&A analyst workflow.

[POINT to Accounting row]

Accounting, or the Controller's team, does the month-end close. They post journal entries, reconcile accounts, and produce the final GL entries. We don't build AI tools for them — their work is too procedural and compliance-sensitive. But we depend heavily on their output: fct-gl-entries is the source of truth for every actuals number in our system.

[POINT to Treasury row]

Treasury manages cash and AR collections. They consume the AR aging data. The mart-ar-aging table feeds their prioritization workflow.

[POINT to Tax row]

Tax handles tax provision and filings. Out of scope for every phase in this course.

Write this on a sticky note if you need to: we are building for FP&A. When a tool doesn't feel right — when an output is formatted awkwardly or a question is hard to ask — the test is: would Sarah the FP&A analyst find this useful? We'll meet Sarah properly at the end of Section Two.

[PAUSE]

---

### Module 2.2 — Three Financial Statements [~4m]

[SLIDE 15 — Three Financial Statements, three-column layout]

Every business produces three financial statements. You need to know all three, but you need to understand that P&L is where we live for Phases One through Eight.

[POINT to P&L column]

The P&L, or Income Statement, is the primary report. It answers: how much money did we make? The structure is straightforward. Start with Revenue — the total from subscriptions and services. Subtract Cost of Goods Sold, which we call COGS — the direct cost of delivering the product, things like hosting and customer support. The result is Gross Profit. Then subtract Operating Expenses — Sales and Marketing, Research and Development, General and Administrative. The result is Operating Income. The two percentages that matter most are Gross Margin Percent and Operating Margin Percent. In our codebase, the P&L lives in mart-pl.

[POINT to Balance Sheet column]

The Balance Sheet is a snapshot at a specific point in time. Unlike the P&L, which covers a period, the balance sheet says: here is what we own, here is what we owe, and here is the difference. Assets — cash, accounts receivable, property — minus Liabilities — payables, debt — equals Equity. We only model one piece of the balance sheet: Accounts Receivable, in mart-ar-aging. We don't model the full balance sheet in this course.

[POINT to Cash Flow column]

The Cash Flow Statement records when cash actually moves, which is different from when revenue or expenses are recognized on the P&L. A company can be profitable on the P&L and cash-flow negative at the same time — this is common in SaaS because customers pay invoices 30 to 90 days after the revenue is recognized. The key metric is Free Cash Flow: Operating Cash Flow minus CapEx. ACME does not model Cash Flow in Phases One through Eight. I mention it because FP&A analysts will sometimes ask questions that require cash flow context, and you need to be able to say: "That's not in our data set today" rather than returning a wrong answer.

The takeaway from this slide: when an FP&A analyst asks any question about revenue, margin, or costs, they're asking about the P&L. When they ask about collections, they're asking about AR, which lives in the balance sheet. When they ask about cash conversion, they'd need cash flow data that we don't currently model. The system knows what it knows and is honest about what it doesn't.

[PAUSE]

---

### Module 2.3 — Core P&L Metrics [~4m]

[SLIDE 16 — Core P&L Metrics table with ACME FY2024 column]

This is the slide I'd most recommend you keep open during the labs. These are the eight metrics that drive every FP&A conversation at ACME, with their formulas, typical SaaS ranges, and ACME's actual FY2024 numbers.

[POINT to Revenue row]

Revenue: one-point-eight billion for FY2024. This is recognized subscription revenue plus professional services. At a SaaS company, "recognized" is the key word — revenue that was contracted in 2023 but delivered in 2024 shows up in 2024.

[POINT to COGS row]

COGS: twenty-two-point-five percent of revenue at ACME. Typical SaaS range is fifteen to thirty percent. COGS includes hosting costs, customer support, and the cost of delivering the software. When COGS is high, Gross Margin suffers.

[POINT to Gross Profit and Gross Margin rows]

Gross Profit is one-point-four billion. Gross Margin is seventy-seven-point-five percent. This is healthy for SaaS — the target range is seventy to eighty-five percent. A seventy-seven-point-five percent gross margin means that for every dollar of revenue, we keep seventy-seven-and-a-half cents after paying for delivery. That's the ceiling for everything below it.

[POINT to Total OpEx and Operating Income rows]

Total OpEx — Sales and Marketing plus R&D plus G&A — is eighty-six-point-nine percent of revenue. Add that to COGS and you exceed one hundred percent, which is why Operating Income is negative. Operating Income at ACME is negative one-hundred-and-seventy million. Operating Margin is negative nine-point-four percent.

[POINT to Operating Margin and the callout box]

Here's where the course gets practical. The negative nine-point-four percent operating margin is not a crisis — it's a deliberate choice. ACME is in a growth-stage investment phase. They're over-investing in R&D and Sales today to drive future ARR growth. The CFO knows this. The board approved it. The question is whether the investment is producing the expected return.

Look at the callout at the bottom of the slide: R&D minus fifteen percent. If ACME cut R&D by fifteen percent — about sixty-three million dollars — Operating Margin would improve by three-hundred-and-forty-eight basis points and Operating Income would improve by sixty-two-point-nine million. That is the output of the whatif-sim Lambda for that specific scenario. When your labs produce this number, you know the system is working correctly.

Memorize these figures. Revenue: one-point-eight billion. Gross Margin: seventy-seven-point-five. Operating Margin: negative nine-point-four. They come up in every lab exercise.

[PAUSE]

---

### Module 2.4 — SaaS Metrics [~5m]

[SLIDE 17 — SaaS Metrics table, eight rows with formula and why-it-matters columns]

This slide is where most architects get lost, because these metrics don't exist in traditional enterprise finance. They're specific to subscription businesses — and they're the ones FP&A will ask about most frequently.

Let's go through each one.

[POINT to ARR row]

ARR — Annual Recurring Revenue — is the primary growth metric for B2B SaaS. It's the sum of all active subscription values annualized. An analyst who asks "how is the business doing?" is often really asking "what's ARR doing?" If ARR is growing, the business is healthy regardless of what the P&L says today.

[POINT to MRR row]

MRR — Monthly Recurring Revenue — is just ARR divided by twelve. It's used for operational tracking — the team looks at MRR monthly to see if the number is trending in the right direction.

[POINT to NRR row]

NRR — Net Revenue Retention — is the holy grail metric. The formula is: Beginning ARR, plus expansion from upsells and cross-sells, minus contraction from downgrades, minus churn from cancellations, divided by Beginning ARR, times one hundred. If NRR is above one hundred percent, it means your existing customer base is growing on its own — you'd keep growing even if you never sold another new customer. ACME's target NRR is one-hundred-and-ten percent or higher. This is the metric VCs and investors watch most closely.

[POINT to GRR row]

GRR — Gross Revenue Retention — is the floor version of NRR. Same formula, but without expansion. It measures how well you're retaining existing revenue, ignoring upsells. GRR can never be higher than NRR. At ACME in FY2024, GRR was eighty-five-point-five percent.

[POINT to Churn row]

Churn is the percentage of ARR lost to cancellations. It's calculated as Churned ARR divided by Beginning ARR. Churn is the enemy of compounding growth. A seven percent annual churn rate means you have to sell seven percent of your beginning ARR just to stay flat. ACME's FY2024 churn was seven-point-three percent.

[POINT to CAC and LTV rows]

CAC — Customer Acquisition Cost — is total Sales and Marketing spend divided by the number of new customers acquired. It measures the efficiency of your growth engine. LTV — Customer Lifetime Value — is ARR per customer times Gross Margin percent, divided by Churn rate. The relationship between LTV and CAC tells you whether you're building value or destroying it. LTV to CAC ratio greater than three is generally considered healthy.

[POINT to DSO row]

DSO — Days Sales Outstanding — measures how quickly customers pay. The formula is AR Balance divided by Revenue, multiplied by days in the period. A lower DSO is better. High DSO means customers are slow to pay, which creates cash conversion risk — you've recognized the revenue but haven't collected the cash. The Treasury team watches DSO closely.

Now here's the connection to the codebase: fct-arr in Redshift tracks every ARR movement — new, expansion, contraction, churn, renewal — at the period and entity level. When an FP&A analyst asks "what's our NRR for Q3?" the agent calls text-to-sql, which queries fct-arr and calculates the formula live against the actual movement data.

[PAUSE]

---

### Module 2.5 — The FP&A Calendar [~4m]

[SLIDE 18 — FP&A Calendar: annual, monthly, quarterly cycle]

This slide is the most practical one in the domain section. It maps the finance team's actual monthly workflow to the specific AI tools that accelerate each step.

The FP&A cycle has three rhythms: annual, monthly, and quarterly.

[POINT to ANNUAL section]

Once a year, the finance team does Annual Planning. This is where they set revenue targets, expense budgets, and headcount plans by entity. The output is a plan file that gets loaded into our system as stg-epm-plan-line — the budget data that variance-rca compares against actuals. The AI use case for annual planning is the whatif-sim and forecast Lambdas: "If we assume fifteen percent revenue growth, what does the expense structure need to look like to hit twenty percent operating margin by Q4?"

[POINT to MONTHLY section]

Monthly is the most intense cycle. There are five distinct steps.

Days one through five: Month-End Close. This is owned by Accounting, not FP&A. Journal entries are posted, accounts are reconciled, the GL is finalized. fct-gl-entries gets updated with final actuals. The AI system is not involved in the close itself — this work is too compliance-sensitive for automation.

Days three through five: Flash Report. The CFO wants a preliminary view of revenue versus budget before the close is fully complete. Currently this takes four hours. With AI, the agent queries mart-pl for preliminary actuals and formats a comparison in three seconds.

Days seven through ten: Variance Report. This is the formal root-cause analysis. Actuals versus budget by cost center, by entity, by GL account. This is the variance-rca Lambda's primary use case.

Day ten onwards: Management Commentary. The written narrative explaining what happened. This is Phase Nine — the agent drafts the numbers section, and FP&A edits and approves. Writing from scratch versus editing a draft is the difference between two hours and twenty minutes.

[POINT to QUARTERLY section]

Quarterly, the team produces the Board Package — the full P&L, ARR waterfall, AR aging, and four-quarter forecast in one document. This is Phase Ten: one button click generates the PDF. Separately, Investor Prep involves compiling KPIs for earnings calls, which uses describe-metric and text-to-sql.

The sentence at the top of this slide is the most important framing in the course: we are automating the data retrieval inside each of these steps — not the steps themselves. The FP&A analyst still reviews, approves, and signs off on every output. The AI removes the hours of mechanical gathering, not the judgment call at the end.

[PAUSE]

---

### Module 2.6 — Finance Data Vocabulary [~3m]

[SLIDE 19 — Finance Data Vocabulary, three-column table]

This slide is a reference. I want to walk through each term and connect it to a specific column or table in the ACME codebase, because the vocabulary mismatch between what FP&A says and what's in the database is a common source of bugs.

[POINT to Fiscal Year / Period rows]

Fiscal Year: every mart table has a fiscal-year column. Period — in the format YYYYMM — is the primary time key across the entire codebase. When an analyst says "March results" they mean period two-zero-two-four-zero-three. When you write a Lambda, always accept and return period in YYYYMM format. Never date strings with slashes.

[POINT to Chart of Accounts / Cost Center / Entity]

Chart of Accounts is the master taxonomy of all financial categories. It maps to account-id in fct-gl-entries. Cost Center is an organizational unit — "Engineering EMEA," "Sales West." It shows up in variance-rca output. Entity is the geographic subsidiary: US, EMEA, or APAC. entity-id is a primary grouping dimension in every mart table.

[POINT to Actuals / Plan / Variance]

Actuals means what actually happened — sourced from fct-gl-entries. Plan or Budget is what was expected — sourced from stg-epm-plan-line. Variance is actuals minus plan. For revenue, a positive variance is good — you made more than expected. For expenses, a positive variance is bad — you spent more than budgeted. This sign convention trips up engineers who aren't used to finance. Make sure your variance-rca output labels this clearly.

[POINT to AR / Aging Bucket / ARR Movement rows]

AR is Accounts Receivable — money ACME has earned but not yet collected. In the code, it's the amount column in mart-ar-aging. Aging Bucket categorizes AR by days overdue: zero to thirty, thirty-one to sixty, sixty-one to ninety, and ninety-plus. The older the bucket, the higher the collection risk. ARR Movement is the monthly change in ARR: new, expansion, contraction, and churn — stored as movement-type in fct-arr.

Read this table before every lab. You'll save yourself an hour of debugging when you know that "fiscal quarter" is a column called fiscal-quarter, not quarter or Q3.

[PAUSE]

---

### Module 2.7 — dbt Model Map [~4m]

[SLIDE 20 — dbt Model Map: staging → intermediate → marts, three sections]

This is the most technically important slide in Section Two. It maps every finance concept to the specific dbt model layer where it lives — and explains why the AI tools only query the marts.

dbt models in this codebase are organized into three layers: staging, intermediate, and marts. This is the standard dbt project structure, and understanding why it exists will help you reason about performance, data freshness, and correctness.

[POINT to STAGING LAYER]

The staging layer is raw-to-cleaned. Each model in staging corresponds to one source system table, cleaned and standardized — column names normalized, data types cast, nulls handled. stg-erp-gl-entries is the raw journal entry data from the ERP. stg-erp-invoices is customer invoice data, the source for AR. stg-erp-subscriptions is subscription records, the source for ARR. stg-epm-plan-line is budget data exported from the FP&A planning tool.

The staging layer is never queried by AI tools directly. Why? Because it's too close to the source. Column names may be cryptic. There may be duplicates before deduplication logic runs. Dates may be in inconsistent formats. Querying staging is like reading a database backup rather than a report.

[POINT to INTERMEDIATE LAYER]

The intermediate layer applies business logic. int-revenue calculates recognized revenue by entity and period from the raw subscription data. int-arr-movements categorizes each subscription change into a movement type. int-ar-aging ages each invoice against the report date. int-pl-components assembles P&L line items into the revenue, COGS, and OpEx categories the business uses.

The intermediate layer is also never queried by AI tools. These models exist to make the marts accurate — they're the calculation layer. Querying them directly would bypass the final aggregations.

[POINT to MARTS LAYER]

The marts layer is the final output — clean, aggregated, business-ready. This is where all AI tools query.

mart-pl is the full P&L by entity and quarter. It powers the slash-metrics-slash-pl API endpoint and the P&L tab in Streamlit.

fct-arr is the ARR waterfall by period and movement type. It powers the ARR tab.

mart-ar-aging is AR aging by bucket and customer segment. It powers the AR tab.

fct-gl-entries is not quite a mart — it's a detailed fact table that variance-rca queries for the raw journal entries needed to compute granular variance drivers.

Write this rule somewhere prominent: AI tools query marts only. If an analyst asks a question that requires data from staging or intermediate, the correct response is to build a new mart model and expose it through a new API endpoint — not to route the AI directly into the lower layers.

[PAUSE]

---

### Module 2.8 — ACME P&L Visual [~2.5m]

[SLIDE 21 — P&L Bar Chart by Entity, scorecard metrics]

This is the data visualization that anchors Section Two. The bar chart shows revenue versus gross profit for each of the three ACME entities in FY2024.

[POINT to US bars]

The US entity is the largest. Revenue of one-point-oh-eight billion, gross profit of eight-hundred-and-forty million. The US entity generates about sixty percent of total ACME revenue.

[POINT to EMEA bars]

EMEA is the second largest: five-hundred-and-five million in revenue, three-hundred-and-ninety-one million in gross profit. Gross margin is similar to US — roughly seventy-seven percent.

[POINT to APAC bars]

APAC is the smallest entity at two-hundred-and-eighteen million revenue. If you notice that APAC's gross margin looks slightly lower, that's real — APAC has higher delivery costs due to infrastructure in that region.

[POINT to scorecard on the right]

Total revenue across all entities: one-point-eight billion. Gross profit: one-point-four billion. Gross margin: seventy-seven-point-five percent. Operating income: negative one-hundred-and-seventy million. Operating margin: negative nine-point-four percent.

When you run the P&L tab in Streamlit, these are the numbers you'll see — and this is the chart it renders. When your query of mart-pl returns values that match these figures, the pipeline is working correctly. This is also why understanding the source data matters: a wrong GROUP BY or a missing entity filter will produce numbers that look plausible but don't match.

[PAUSE]

---

### Module 2.9 — ARR Waterfall [~3m]

[SLIDE 22 — ARR Waterfall chart with beginning, movements, and ending ARR]

The ARR waterfall is how investors and finance leaders visualize recurring revenue health. Let me explain both the concept and how it maps to the ACME data model.

[POINT to the waterfall bars]

The waterfall starts at Beginning ARR: one-point-six-five billion at the start of FY2024. Then four types of movement are applied.

New ARR — plus two-hundred-and-eighty million — represents new customers who signed contracts during the year.

Expansion ARR — plus one-hundred-and-ninety-five million — represents existing customers who upgraded or bought additional seats.

Contraction ARR — minus eighty-five million — represents existing customers who downgraded or reduced their subscription.

Churn ARR — minus one-hundred-and-twenty million — represents customers who cancelled entirely.

Add these up: plus two-eighty, plus one-ninety-five, minus eighty-five, minus one-twenty. Net new ARR is positive two-hundred-and-seventy million. Ending ARR is one-point-nine-two billion.

[POINT to NRR and GRR figures]

NRR — Net Revenue Retention — is one-hundred-and-sixteen-point-four percent. That means even without any new customer acquisition, the existing customer base grew sixteen-point-four percent due to expansion outpacing contraction and churn. That is a strong NRR. GRR — Gross Revenue Retention — is eighty-five-point-five percent.

[POINT back to the data model]

Now: how does this live in the codebase? fct-arr has one row per entity, per period, per movement type. A row with movement-type equals "new" and period equals "202403" represents new ARR contracts signed in March 2024. The waterfall chart is built by aggregating these rows. When the agent is asked about ARR trends, it queries fct-arr and calculates these numbers live.

One important note for the labs: the synthetic dataset does not include "beginning-arr" or "ending-arr" as explicit movement types. Those values are calculated by the frontend, not stored as rows. This is a data model decision — you'll see it reflected in how the ARR tab constructs the chart.

[PAUSE]

---

### Module 2.10 — AI Touchpoints in the Close [~3m]

[SLIDE 23 — AI Touchpoints: five close steps, two manual, three AI-powered]

This slide brings the FP&A calendar from module two-point-five together with the architecture from Section One. For each step in the monthly close process, we now know what AI does and what stays manual.

[POINT to Days 1-5: Month-End Close]

Days one through five — Month-End Close — is manual. The human icon is intentional. Accounting posts journal entries and reconciles accounts. There is no AI in this step. Attempting to automate GL reconciliation would introduce compliance risk. The output of this step — fct-gl-entries updated with final actuals — is what all subsequent AI steps depend on. If the close is delayed, everything downstream is delayed.

[POINT to Days 3-5: Flash Report]

Days three through five — the Flash Report — is AI-powered. Before the close is even fully complete, the CFO wants a preliminary revenue versus budget view. The agent queries mart-pl for whatever actuals have been loaded so far, formats a comparison table by entity, and adds a two-line narrative for any entity showing a significant variance. Total time: three seconds instead of four hours.

[POINT to Days 7-10: Variance Report]

Days seven through ten — the full Variance Report — is AI-powered via the variance-rca Lambda. Actuals versus budget by account and cost center. Ranked by variance magnitude. The analyst reviews the ranked list and escalates the top three or four items for management discussion.

[POINT to Day 10+: Management Commentary]

Management Commentary is Phase Nine. The agent chains variance-rca and text-to-sql to draft the written numbers section. "EMEA R&D over-budget by four-point-two million in Q3, driven primarily by three additional FTE hires in Engineering EMEA versus plan." FP&A reviews and edits rather than writing from scratch.

[POINT to Day 15: Board Package]

The Board Package is Phase Ten. One button click generates the PDF that previously took a day and a half to assemble manually.

This five-step sequence is the justification for every phase of the ACME build. Keep it in mind when someone asks "why did you build it that way?"

[PAUSE]

---

### Module 2.11 — Finance Quick Reference [~2m]

[SLIDE 24 — Quick Reference card: key ratios and lab validation numbers]

This is a reference slide — keep it open during every lab.

[POINT to left column]

The four ratios on the left are the ones you'll calculate or verify constantly.

Gross Margin: Gross Profit divided by Revenue. ACME: seventy-seven-point-five percent. Target SaaS range: seventy to eighty-five.

Operating Margin: Operating Income divided by Revenue. ACME: negative nine-point-four. Context: deliberate growth investment.

NRR: the full formula — Beginning plus Expansion minus Contraction minus Churn, all divided by Beginning. Target: above one hundred. ACME target: one-ten.

DSO: AR Balance divided by Revenue, times days in period. Lower is better. Anything above ninety days deserves a collections flag.

[POINT to R&D -15% callout]

The R&D minus-fifteen-percent result — plus three-forty-eight basis points, plus sixty-two-point-nine million — is your whatif-sim validation target. When you run the lab, this is what the Lambda should return.

[POINT to right column]

The right column is every critical number you need for lab exercises. Total revenue one-point-eight billion. Gross profit one-point-four billion. All three entities. Period range two-zero-two-four-zero-one through two-zero-two-four-one-two. AR aging buckets: zero-to-thirty, thirty-one-to-sixty, sixty-one-to-ninety, ninety-plus. ARR movement types: new, expansion, contraction, churn.

If your queries return different values, check the dbt model first. These numbers have been validated against the source data.

[PAUSE]

---

### Module 2.12 — The Finance Analyst Persona [~3m]

[SLIDE 25 — Sarah Chen persona card]

I want to introduce you to Sarah Chen. Sarah is a composite persona based on the actual FP&A analyst workflow that this system was designed for. Whenever you're making a design decision, ask yourself: would Sarah find this useful?

[POINT to her profile]

Sarah is a Senior FP&A Analyst at ACME, eight years of finance experience, owns the monthly variance report for the US entity. She does not know SQL. She shouldn't have to. She was hired to understand the business, not to write database queries.

[POINT to Daily Reality]

Her daily reality: she spends three hours a day waiting on data from Redshift, either waiting for IT to run queries or running her own exports and pasting them into Excel. During month-end, she works fourteen-hour days for five straight days. Not because the analysis is complex — because the data gathering is.

[POINT to What She Wants]

What Sarah wants is immediate: when she asks "why is EMEA R&D over budget?" she wants the answer in the time it takes to read a text message. She wants a forward view — if we freeze hires today, where does Q4 end up? She wants a commentary draft she can edit, not a blank document. She wants one dashboard she trusts, not six spreadsheets with different numbers.

[POINT to What Breaks Trust]

Now here's the section I want you to read twice: what breaks Sarah's trust. Wrong numbers — she will check every number you return against her Excel. She has done this job for eight years. If the system gives her a wrong gross margin figure once, she will not trust it again for months. Slow responses — Sarah asks twelve questions in a row during a close. If each one takes thirty seconds, she'll abandon the tool. Hallucinated account names or period labels — she knows the chart of accounts cold, and a fabricated account name signals to her that the system can't be trusted with anything. Jargon she has to translate for the CFO — the system should output in finance language, not API language.

Build with Sarah in mind. Every tool, every prompt, every output format. If it would confuse her or break her trust, rethink it.

[PAUSE]

---

### Section 2 — Recap [~1.5m]

[SLIDE 26 — Section 2 Recap, eight checkmarks]

Section Two complete. Here's what you now know.

Finance org: FP&A is our user. Accounting is the source of actuals. We build for the FP&A workflow.

Three statements: P&L is primary for Phases One through Eight. Balance Sheet gives us AR. Cash Flow is not modeled.

P&L metrics: Gross Margin seventy-seven-point-five, Operating Margin negative nine-point-four. These drive every FP&A conversation.

SaaS metrics: ARR, NRR above one hundred equals the holy grail, GRR is the floor, Churn is the enemy, DSO measures collection speed.

FP&A calendar: the monthly cycle — close, flash, variance, commentary, board package. AI touches four of the five steps.

Data vocabulary: period-YYYYMM, entity-id, fct-gl-entries, stg-epm-plan-line. Every column name has a finance meaning.

dbt model layers: AI tools query marts only, never staging or intermediate.

AI touchpoints: Accounting close stays manual. Everything after the close runs on AI.

Take a breath. Section Three is where we get into the transformation strategy — use cases, business case, the full architecture, and how Bedrock and AgentCore work together. Let's go.

[PAUSE]

---

## Section 3 — Transformation Strategy

---

### Section Opener [~30s]

[SLIDE 27 — Section 03 title card]

Section Three: Transformation Strategy. Nine modules. We go use case by use case, we build the business case with real numbers, and we go deep on the Bedrock plus AgentCore architecture. This is where you learn how to explain this system to both a CFO and an AWS Solutions Architect. Let's start with the use case portfolio.

[PAUSE]

---

### Module 3.1 — Use Case Portfolio [~3m]

[SLIDE 28 — Six use cases with Lambda tool and impact rating]

All six use cases in the ACME Finance system are live in Phase Eight. Let me walk through each one with honest impact ratings.

[POINT to Use Case 01 — Natural Language Querying]

Use case one: Natural Language Querying. An FP&A analyst types a question in English, gets a SQL-powered answer in under three seconds. Tool: text-to-sql. Impact: High. This is the foundational capability — it makes everything else possible. It's also the highest adoption driver because FP&A starts using it immediately for ad-hoc questions.

[POINT to Use Case 02 — Variance Root-Cause Analysis]

Use case two: Variance Root-Cause Analysis. This is the highest-impact use case in the portfolio. The variance-rca Lambda compares fct-gl-entries against stg-epm-plan-line and ranks the top budget variance drivers. Impact: Very High. It replaces a two-to-three analyst-day process with a five-minute automated run. This is the use case that gets board-level attention.

[POINT to Use Case 03 — Revenue Forecasting]

Use case three: Revenue Forecasting. The forecast Lambda uses statsforecast to project four quarters forward based on historical ARR and revenue patterns. Impact: High. It doesn't replace FP&A judgment — it gives them a data-driven baseline to start from instead of a blank spreadsheet.

[POINT to Use Case 04 — What-If Scenario Modeling]

Use case four: What-If Scenario Modeling. The whatif-sim Lambda takes a percentage change on any P&L line and cascades the downstream impact. Impact: High. "What if we freeze sales headcount?" is a question that previously required an Excel model rebuild. With whatif-sim, it's a three-second operation.

[POINT to Use Case 05 — Metric Definitions]

Use case five: Metric Definitions. The describe-metric Lambda returns the business definition, formula, and ACME data location for any finance term. Impact: Low — but it's a trust-builder. New FP&A team members use it constantly. It signals that the system understands finance, not just SQL.

[POINT to Use Case 06 — Management Commentary]

Use case six: Management Commentary. The agent chains variance-rca and text-to-sql to draft the written narrative section of the board package. Impact: Very High. This is Phase Nine. The numbers section of commentary goes from a two-hour writing task to a five-minute review-and-edit task.

The overall portfolio follows the right sequence: start with high-adoption, low-risk use cases (NL query), build trust, then add the higher-impact, more complex ones.

[PAUSE]

---

### Module 3.2 — Natural Language Querying [~4m]

[SLIDE 29 — Five-step flow diagram: analyst input → agent → Lambda → Redshift → formatted response]

Let's trace exactly what happens when an FP&A analyst asks a natural language question. Understanding this flow end-to-end is essential before you build anything.

[POINT to Step 1]

Step one: the analyst types "What was EMEA gross margin for each quarter in FY2024 versus budget?" in the Streamlit chat interface. That question is sent to FastAPI as a POST to the slash-chat endpoint, with a session ID and a memory ID.

[POINT to Step 2]

Step two: the FastAPI endpoint first calls AgentCore Memory's retrieve operation — looking for relevant context from prior sessions for this analyst. It finds a note that this analyst has been focused on EMEA margin trends for two months. That context is prepended to the question before it's sent to the Bedrock Agent.

The Bedrock Agent then does intent parsing. It extracts: entity equals EMEA, metric equals gross margin, time period equals Q1 through Q4 FY2024, intent equals actuals versus plan comparison.

[POINT to Step 3]

Step three: the agent calls the text-to-sql Lambda through the AgentCore Gateway. The Lambda receives the structured intent, generates a SQL query — SELECT entity, fiscal quarter, gross profit divided by revenue — against mart-pl, filtered to EMEA. The SQL is parameterized, not concatenated, to prevent injection.

[POINT to Step 4]

Step four: the Redshift Data API executes the query. Average execution time for mart queries is one-point-two seconds. The result set comes back as JSON.

[POINT to Step 5]

Step five: the Bedrock Agent formats the response. It constructs a table, calculates the variance against budget figures from stg-epm-plan-line, and adds a narrative sentence for each quarter that shows significant deviation. "EMEA Q3 gross margin was seventy-four-point-two percent, three-point-one percentage points below budget. Primary driver: hosting cost overrun."

Total time from analyst question to formatted answer: two-point-eight seconds average.

The whole chain is what makes this useful. A query-only system that returned a JSON blob would be useless for Sarah. The agent formatting the output into a readable table with narrative context is what makes it feel like an analyst, not a database.

After the response is delivered, FastAPI calls AgentCore Memory's batch-create operation to store this Q&A pair. The next time this analyst asks a follow-up — "what was the trend in Q4 for that entity?" — the agent retrieves the EMEA context from memory and answers without needing clarification.

[PAUSE]

---

### Module 3.3 — Variance RCA [~4m]

[SLIDE 30 — Variance RCA: how-it-works steps and sample output table]

Variance root-cause analysis is the use case I'm most proud of in this system. Let me show you exactly how the Lambda works and why the output is useful.

[POINT to the seven steps]

The workflow: an FP&A analyst asks "Why is EMEA R&D over budget in Q3?" The Bedrock Agent recognizes this as a variance question — it calls variance-rca, not text-to-sql. This routing decision is made by the agent based on intent classification.

The variance-rca Lambda makes two queries. First, it queries fct-gl-entries for every GL journal entry in EMEA, in the R&D account category, for Q3 — grouped by account and cost center. This gives it actuals. Second, it queries stg-epm-plan-line for the corresponding budget rows — same entity, category, period. It calculates variance for every account-cost-center combination, ranks by absolute variance magnitude, and returns the top N drivers.

[POINT to Sample Output table]

Look at the sample output. Total over-budget: four-point-two million, eighteen-point-three percent above plan. Three drivers ranked:

Number one: R&D Personnel in the Engineering EMEA cost center. Two-point-eight million over budget, twenty-two percent variance. This is the primary driver.

Number two: R&D Contractors in Engineering EMEA. Nine-hundred-thousand over budget, forty-five percent variance.

Number three: R&D Software across all cost centers. Five-hundred-thousand, twelve percent.

[POINT to the Agent Commentary Draft]

The agent then takes this ranked list and writes a draft narrative: "EMEA R&D over-budget by four-point-two million in Q3. Primary driver is personnel costs in Engineering EMEA, up two-point-eight million at plus twenty-two percent, due to three additional FTE hires versus plan approved in the June board meeting. Recommend reforecast Q4 R&D plus one-point-four million."

That last sentence — the recommendation — comes from the agent reasoning about the pattern in the data. The Lambda just gives numbers. The agent adds the narrative context.

The time comparison: this workflow previously took two to three analyst-days. The agent produces this output in five minutes. That's a ninety-three percent reduction in cycle time for the most time-intensive FP&A task. If you deliver nothing else from this course, delivering a working variance-rca Lambda will justify the entire build.

[PAUSE]

---

### Module 3.4 — What-If Simulation [~3.5m]

[SLIDE 31 — What-If Simulation: input parameters, P&L impact table, results summary]

The whatif-sim Lambda answers one of the CFO's most common questions: "What does our margin look like if we make this decision?" Let me walk through the specific scenario on this slide.

[POINT to Input section]

The input: "What happens to operating margin if we cut R&D by fifteen percent?" The Lambda parameters are: line-item equals R&D, change-pct equals negative fifteen, base-period equals FY2024, cascade equals true.

[POINT to P&L Impact table]

Watch what cascades. R&D Expense starts at three-hundred-and-fifty-five-point-three million. A fifteen percent cut reduces it by sixty-two-point-seven million. That directly reduces Total OpEx by the same amount. Operating Income improves from negative one-hundred-and-seventy million to negative one-hundred-and-seven-point-seven million. Operating Margin improves from negative nine-point-four percent to negative five-point-nine-six percent. Gross Profit is unchanged — cost cuts don't affect the revenue side.

[POINT to Results box]

The headline result: plus three-hundred-and-forty-eight basis points on operating margin. Plus sixty-two-point-nine million on operating income. New operating margin: negative five-point-nine-six percent. Analysis time: under three seconds.

When you run this in the labs, these are the exact numbers you'll get. The R&D minus fifteen percent scenario is the most commonly tested what-if at ACME, and it's become the canonical validation test for the whatif-sim Lambda.

One important design note: the "cascade equals true" parameter tells the Lambda to propagate the change through the full P&L structure — recalculating every downstream metric. With cascade false, you'd only see the direct effect on R&D and OpEx. For board-level questions, cascade true is always what you want.

The FP&A use case here is scenario planning before a board meeting. The CFO asks "If we implement a cost efficiency program, what does our margin trajectory look like?" Instead of an analyst rebuilding a financial model over two days, the whatif-sim Lambda answers in seconds.

[PAUSE]

---

### Module 3.5 — Flash Report Automation [~3m]

[SLIDE 32 — Flash Report: before vs. after comparison]

The Flash Report is the first deliverable that every FP&A team produces after month-end close — a preliminary view of revenue and margin versus budget, delivered to the CFO before the full variance report is ready.

[POINT to "The Problem (Before AI)" section]

Before the AI system: Day three of close, the CFO asks "where are we versus budget?" The analyst says "I need a few hours to pull the data." They export GL data, paste into Excel, build a pivot table, manually calculate variances by entity, copy numbers into a PowerPoint slide, email it. Four-plus hours. Error rate around eight percent because someone's doing arithmetic at eleven PM.

[POINT to "With AI" section]

After Phase Eight: the CFO types the same question into the Streamlit chat interface. The agent routes to text-to-sql, which queries mart-pl for preliminary actuals. Actuals versus budget by entity, formatted as a comparison table, with a two-line narrative for any entity showing more than two percent variance. Three seconds. Error rate: zero — the query runs against the source-of-truth mart.

The error rate point deserves emphasis. Eight percent of manually produced flash reports contain errors. Not because analysts are careless — because humans make mistakes with numbers at midnight. The AI system queries the mart directly. If the mart is correct, the flash report is correct. The only error vector is a data pipeline issue upstream — and that's visible in monitoring.

This use case has the highest immediate adoption rate of anything in the system, because FP&A knows their monthly pain. They start using it in week one of deployment.

[PAUSE]

---

### Module 3.6 — Business Case [~4m]

[SLIDE 33 — Business Case: benefits, cost structure, CFO framing]

This is the slide you'll use in the executive conversation. Knowing how to build the business case is as important as knowing how to build the system — because you'll need to justify the investment before you write any code.

[POINT to benefit numbers at top]

Four headline benefit metrics:

Annual FP&A capacity freed: one-point-two million dollars. This is forty-four percent of the one-point-nine million wasted cost, recovered as analyst time redirected to value-added analysis.

Variance analysis ROI: twenty-eight times. Forty-five thousand dollars in annual AWS infrastructure cost versus one-point-two-six million in analyst hours saved on variance analysis alone.

Close acceleration: minus two-point-nine days. The close drops from six-point-four to three-point-five days. The business implication: the board gets final results two-point-nine days earlier, which means decisions are made two-point-nine days earlier.

Build time: six weeks. This is the number that surprises finance leaders most. They expected eighteen months.

[POINT to Quantified Benefits section]

The full benefits list for a three-year TCO analysis: one-point-nine million wasted capacity with one-point-two million recoverable; close acceleration; variance turnaround from two days to four hours; forecast accuracy improvement that reduces decision error by an estimated eighteen million dollars in better capital allocation.

[POINT to Cost to Build and Run section]

The cost side: AWS infrastructure — Bedrock, Lambda, Redshift, AgentCore — runs roughly forty-five thousand dollars per year. Engineering build time was six weeks for two engineers. Ongoing maintenance is estimated at zero-point-two-five FTE per year. Total three-year TCO: approximately three-hundred-and-fifty thousand dollars, versus five-point-seven million in cumulative benefits over three years.

[POINT to CFO Framing section]

The CFO framing is the most important part of this slide. Don't lead with "we're using AI" or "we're deploying Bedrock." Lead with these four sentences:

"We are buying back analyst time from data wrangling."

"Not replacing FP&A — amplifying their strategic capacity."

"Payback period: three-point-four months from go-live."

"Risk: low — all AWS managed services, no custom models."

Finance leaders have seen failed IT projects. The word "AI" triggers skepticism. "Managed services with no custom models and a three-month payback" does not trigger skepticism. Lead with the outcome, not the technology.

[PAUSE]

---

### Module 3.7 — AWS Cost Model [~4m]

[SLIDE 34 — AWS Cost Model table by service, usage pattern, and monthly cost]

Let's go line by line through what this system actually costs to run. One of the advantages of the fully managed architecture is that costs scale with usage — low months cost near zero, close months cost more.

[POINT to Bedrock row]

Amazon Bedrock — Claude Sonnet — at approximately five-hundred agent invocations per month at an average of four thousand tokens, costs roughly one-hundred-and-eighty dollars per month. That's input at three dollars per million tokens plus output at fifteen dollars per million. The most expensive part of the AI stack is surprisingly affordable because most invocations are short.

[POINT to AgentCore rows]

AgentCore Gateway adds about ten dollars per month for routing five hundred invocations. AgentCore Memory for twenty analysts adds about twenty-five dollars per month. These are genuinely small costs relative to the value delivered.

[POINT to Lambda row]

The five Lambda tools together — five hundred invocations, average eight seconds, one gigabyte memory — cost about fifteen dollars per month. Lambda is essentially free at this usage level.

[POINT to Redshift row]

Redshift Serverless is actually the most significant line item: approximately one-hundred-and-eighty dollars per month. This uses RPU-based billing at thirty-seven-and-a-half cents per RPU-hour. The key benefit of Serverless is that it scales to zero between queries — you're not paying for idle capacity.

[POINT to ECS Fargate row]

FastAPI on ECS Fargate — a quarter vCPU, half a gig of memory, always-on — runs about twelve dollars per month. Alternatively, you could use Lambda URLs and pay only on invocation.

[POINT to TOTAL]

Total: approximately four-hundred-and-twenty-four dollars per month, or five-thousand-and-eighty-eight dollars per year. For the full finance AI platform.

The practical ranges: a heavy close month with twice the query volume runs about six-hundred-and-fifty dollars. A light off-month runs about one-hundred-and-eighty. The annual blended rate of about fifty-one hundred dollars is what you'd put in the business case.

Compare that to the one-point-two million in recovered analyst capacity. The ROI isn't twenty-eight times — it's many multiples of that. The cost model is one of the strongest arguments for the managed services architecture.

[PAUSE]

---

### Module 3.8 — System Architecture — Component Reference [~3.5m]

[SLIDE 35 — Component Reference table: nine rows, type, role, key config]

This slide is the production architecture reference. Every component, its type, what it does, and the specific configuration decisions that matter.

[POINT to Streamlit and FastAPI rows]

The UI layer: Streamlit is a Python web app with six tabs — P&L, ARR, AR Aging, Chat, Commentary, and Board Pack. It stores memory ID in session state, keyed per analyst user. FastAPI is the REST proxy — POST slash-chat invokes the Bedrock Agent, GET slash-metrics queries Redshift directly for dashboard data.

[POINT to Bedrock Agent row]

The Bedrock Agent is AWS-managed LLM orchestration. It runs on Claude Sonnet, version four. Its action groups point to the AgentCore Gateway endpoint rather than directly to Lambda ARNs. This is the Phase Eight change from Phase Seven — the gateway decoupling.

[POINT to AgentCore Gateway row]

AgentCore Gateway: five Lambda targets registered. Authentication via IAM — the agent's execution role has bedrock-agentcore:InvokeTool permission on the gateway ARN. Rate limiting is configured per-tool — the Redshift-bound tools (text-to-sql and variance-rca) have tighter throttle limits than the in-memory tools (describe-metric).

[POINT to AgentCore Memory row]

AgentCore Memory: SEMANTIC strategy with the ID financeSemanticMemory. Memory ID equals analyst user ID — this is the per-analyst persistent namespace. The session ID is ephemeral — a new UUID per browser session. You pass both to invoke-agent: session ID for conversation continuity within a session, memory ID for cross-session recall.

[POINT to Lambda rows]

The five Lambda functions: text-to-sql uses Bedrock for SQL generation and the Redshift Data API for execution. variance-rca compares fct-gl-entries against stg-epm-plan-line and returns ranked drivers. forecast uses the statsforecast library for a four-quarter projection. whatif-sim applies a percentage delta and cascades through the mart-pl structure. describe-metric is a static glossary lookup.

Each one is independently deployable, independently testable, and independently monitorable. That's the design principle — tools should be atomic.

[PAUSE]

---

### Module 3.9 — The ReAct Loop [~3m]

[SLIDE 36 — ReAct Loop: four boxes (Reason → Act → Observe → Answer) with Lambda reference]

The ReAct loop — Reason, Act, Observe, Repeat — is the fundamental pattern behind how the Bedrock Agent operates. Understanding it helps you debug agent behavior and write better tool schemas.

[POINT to REASON]

Reason: the agent reads the analyst's question, any memory context retrieved, and the tool schemas registered in the gateway. It decides which tool to call and what parameters to pass. For a question like "What's driving the EMEA R&D overrun?" the agent reasons: this requires variance data, not just a SQL query; call variance-rca with entity equals EMEA and category equals R&D.

[POINT to ACT]

Act: the agent calls the AgentCore Gateway with the tool name and parameters. The gateway routes to the correct Lambda and invokes it. The agent is waiting.

[POINT to OBSERVE]

Observe: the Lambda returns a JSON result. The agent reads it. It decides: is this enough to answer the question, or do I need to call another tool? For a simple variance question, one tool call is usually sufficient. For a management commentary request, the agent will call variance-rca, then text-to-sql for supplementary metrics, before it has enough data to draft the narrative.

[POINT to ANSWER]

Answer: the agent formats the final response. It cites the source mart and period. It writes in FP&A language, not JSON. It stores the Q&A pair in AgentCore Memory before returning the response.

[POINT to Lambda Tool Reference]

The five tools and their implementations: text-to-sql is Python plus boto3. variance-rca is Python plus pandas for the ranking logic. forecast is Python plus statsforecast. whatif-sim is Python plus numpy for the cascade arithmetic. describe-metric is pure Python with a static dictionary.

When an agent call returns a wrong answer, trace back through the loop. Was the reasoning correct? Did the right tool get called? Did the Lambda return the right data? Did the agent format it correctly? The four-step loop gives you four places to look.

[PAUSE]

---

### Module 3.9 cont. — AgentCore Gateway and Memory [~4m]

[SLIDE 37 — AgentCore Gateway and Memory: two sections, problem/solution/config format]

This slide goes deeper on the two AgentCore components that differentiate the Phase Eight architecture from Phase Seven.

[POINT to AgentCore Gateway section]

First: the Gateway. The problem it solved was action-group sprawl. In Phase Seven, each Lambda required its own action group defined in the Bedrock Agent — with a schema, a role, and a Lambda permission. With five tools, that's five action group definitions to maintain. When you add a sixth tool, you update the agent definition, redeploy, and potentially break something in an existing action group.

The Gateway replaces all of that with a single MCP-compatible endpoint. The agent calls one gateway URL. The gateway routes to the correct Lambda based on tool name. Adding a sixth tool means adding a new gateway target — the agent definition doesn't change.

The additional benefits: auth is handled at the gateway level with built-in IAM and OAuth support. Rate limiting is per-tool configuration — you can throttle the Redshift-heavy tools independently of the fast in-memory ones. Monitoring is unified — one CloudWatch namespace for all five tools, one dashboard.

[POINT to ACME config for Gateway]

ACME config: five targets registered — text-to-sql, variance-rca, forecast, whatif-sim, describe-metric. The gateway ARN and the Lambda ARNs are managed via Terraform. The IAM policy on the gateway role grants invoke-function on all five Lambda ARNs.

[POINT to AgentCore Memory section]

Second: Memory. The problem in Phase Seven was session amnesia. Every conversation started fresh. The analyst had to re-explain context every time — "We're looking at EMEA, Q3, R&D, comparing against the September budget" — in every session. Experienced FP&A users gave up on the tool because it felt like talking to someone with short-term memory loss.

AgentCore Memory with a SEMANTIC strategy means the agent can say: "Based on your previous sessions, you've been tracking EMEA R&D variance. The trend continued into Q4 — an additional one-point-eight million over budget." That's a qualitatively different experience.

[POINT to session model]

The session model: session ID is ephemeral — a new UUID per browser tab, per session. Memory ID is durable — it's keyed to the analyst's user identifier and persists indefinitely. FastAPI passes both to invoke-agent. The Streamlit tab stores the memory ID in st.session-state, pulled from the analyst's login.

[POINT to example recall]

The example recall on the slide is real behavior we tested: "Last month you asked about EMEA R&D variance. Q3 trend continued into Q4: plus one-point-eight million." That sentence came from the agent reading the memory record created in the prior session. It requires no special prompt engineering — it's the semantic memory layer doing what it was designed to do.

[PAUSE]

---

### Module 3.10 — Implementation Timeline [~2.5m]

[SLIDE 38 — Implementation Timeline: four two-week phases with deliverables]

For architects who want to replicate this at their own company, here is the realistic timeline and sequence. Two engineers — one backend and one ML or data engineer — eight weeks.

[POINT to P1-2, Weeks 1-2]

Weeks one and two: Foundation. Stand up Redshift, run the dbt models, create mart-pl. Build the text-to-sql Lambda. Wire up the first version of the Bedrock Agent. By end of week two, you should be able to ask "what was total revenue in Q3?" and get a correct answer.

[POINT to P3-4, Weeks 3-4]

Weeks three and four: Dashboards. Add fct-arr and mart-ar-aging dbt models. Build the ARR waterfall tab and the AR aging tab in Streamlit. Stand up FastAPI with the metrics endpoints. By end of week four, the three core dashboard tabs are live and correct.

[POINT to P5-6, Weeks 5-6]

Weeks five and six: AI Tools. Build the variance-rca, whatif-sim, forecast, and describe-metric Lambdas. Run the R&D minus-fifteen validation. Test variance RCA against a known over-budget scenario. By end of week six, all five tools are functional.

[POINT to P7-8, Weeks 7-8]

Weeks seven and eight: AgentCore. Wire the Bedrock Agent v2 to the Gateway. Set up AgentCore Memory with the SEMANTIC strategy. End-to-end QA — test cross-session recall, test multi-tool chains. Go live.

This timeline is tight but achievable if the data pipeline already exists. The biggest risk is data quality — if your marts have inconsistencies or missing data, variance-rca will produce wrong answers. Budget an extra week for data validation if you're working with real production data.

[PAUSE]

---

### Module 3.11 — Monitoring and Governance [~3m]

[SLIDE 39 — Monitoring, Accuracy Controls, and Governance sections]

Production finance AI requires audit trails, accuracy validation, and fallback procedures. This slide covers the operational layer that makes the system trustworthy in a regulated environment.

[POINT to What to Monitor]

Monitoring: track latency percentiles P50, P95, and P99 per tool. A variance-rca call that normally takes four seconds taking forty seconds means either Redshift is under load or there's a data issue. Track Lambda error rate and timeout rate. Monitor Redshift query execution time and slot utilization. In AgentCore Memory, track hit rate — if semantic retrieval isn't finding relevant memories, the strategy configuration may need tuning. The most important operational metric: data freshness — the timestamp of the last fct-gl-entries pipeline run. Stale actuals produce incorrect variance calculations.

[POINT to Accuracy Controls]

Accuracy is what builds FP&A trust and accuracy failures are what destroy it. Three controls:

Validation queries: after every agent response that contains a number, a background process runs the equivalent direct Redshift query and checks for more than zero-point-five percent deviation. If the agent returns a gross margin of seventy-three percent and the mart says seventy-seven-point-five, something is wrong.

FP&A sign-off: every agent output that enters a board material requires an FP&A analyst to approve before use. The AI drafts; a human signs.

Source citation: the agent is instructed to cite the source mart and period for every number it returns. "Gross margin seventy-seven-point-five percent, source: mart-pl, entity: ALL, period: FY2024." This makes validation easy and hallucination visible.

[POINT to Governance]

Governance: every agent invocation is logged to CloudTrail and S3 — the full request, response, and tool calls. No customer PII in the mart layer — only entity and account IDs. Session data retained ninety days, memory retained twelve months. Lambda versions are pinned — model upgrades require explicit version bumps, not automatic adoption. And there's an incident runbook: if the Bedrock Agent fails, FP&A falls back to the direct Streamlit query interface, which bypasses the agent entirely.

Finance is an audited function. The governance layer isn't optional — it's what makes this deployable at an enterprise that has compliance obligations.

[PAUSE]

---

### Module 3.12 — Key Takeaways [~2.5m]

[SLIDE 40 — Six Key Takeaways]

You've completed three sections. Before we close, let me give you the six things I most want you to remember when you sit down to build this.

[POINT to Takeaway 01]

The stack is proven. Bedrock plus AgentCore plus Lambda plus dbt plus Streamlit is production-tested. You can replicate it in six to eight weeks. This is not a research architecture.

[POINT to Takeaway 02]

Domain knowledge is the moat. This is the one I'll emphasize most strongly. Finance AI fails when the architects don't understand FP&A. You now understand variance, close cycles, and why NRR matters. That knowledge is what separates a system that FP&A actually uses from one that gets abandoned after the first wrong answer.

[POINT to Takeaway 03]

Start with one use case. Natural language querying has the lowest effort and the highest FP&A adoption rate. Start there. Prove the value. Show the FP&A team that it returns correct numbers. Then add variance RCA, then forecast, then what-if. Do not try to deliver all five tools at once.

[POINT to Takeaway 04]

Accuracy equals trust. The FP&A analyst will check your numbers. They've been working with these figures for years. If the system gives them one wrong answer on a metric they know cold, they will not trust it again for months. Build validation queries. Cite sources. Do not hallucinate account names.

[POINT to Takeaway 05]

Frame it as capacity, not replacement. The CFO conversation is about one thing: "We're buying back one-point-two million dollars of analyst time from data wrangling and redirecting it to analysis." Every time you're tempted to say "AI-powered" in a CFO meeting, replace it with "capacity reclaimed."

[POINT to Takeaway 06]

AgentCore is the accelerator. The Gateway removes action-group maintenance overhead for every additional tool you add. Memory makes the agent genuinely useful for follow-up questions — not just a one-shot query engine. If you're starting a new finance AI project today, AgentCore is the right foundation. Use both.

[PAUSE]

---

### Closing Slide [~1.5m]

[SLIDE 41 — Course closing: "You now have enough finance domain knowledge..." with summary card]

You now have enough finance domain knowledge to design AI systems that solve real FP&A problems. Not just technically correct ones.

[PAUSE]

Three sections. Forty-one slides. Approximately one hundred and ten minutes.

You know the strategy: the pain points, the business case, the maturity model. You know the domain: P&L, ARR, NRR, DSO, the FP&A calendar, the dbt model map. You know the architecture: Bedrock Agent, AgentCore Gateway and Memory, five Lambda tools, Redshift marts, FastAPI, Streamlit.

The next step is building. Start with Phase One — the text-to-sql Lambda and your first natural language query against mart-pl. Everything else follows from that first working query.

The ACME Finance repository has the complete implementation for all ten phases. The README has setup instructions. Every Lambda, every dbt model, every Terraform module is there.

Thank you for working through these three sections. Build something great.

[END]

---

## Appendix: Recording Notes

### Pacing Guidelines
- Speak at approximately 130 words per minute — slightly slower than conversational, slightly faster than formal presentation
- Pause after each bullet point when gesturing to the slide
- Longer pause (2–3 seconds) after key numbers to let them land: gross margins, operating margin percentages, dollar figures

### Emphasis Cues
- "We are building for FP&A" — emphasize on every repetition
- "Accuracy equals trust" — the phrase that anchors Sarah's persona
- "Domain knowledge is the moat" — the lesson most architects miss
- Numbers should be said slowly: "seventy-seven-point-five percent" not "77.5%"

### Slide Reference Cues for Screen Recording
- Streamlit demo: stop recording narration, switch to live demo, then continue
- Code blocks shown in labs: do not read code aloud — say "you can see the implementation here" and pause

### Total Target Duration by Section
| Section | Slides | Target |
|---------|--------|--------|
| Section 1 | 1–12 | ~28 min |
| Section 2 | 13–26 | ~42 min |
| Section 3 | 27–41 | ~40 min |
| **Total** | **41** | **~110 min** |

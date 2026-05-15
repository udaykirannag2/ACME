# Section 1 Narration Script
## Finance AI Agents on AWS — Your AI Finance Agent Starts Here
**Total duration:** ~36 min | **Pacing:** ~130 wpm | **Slides:** 15

---

## Module 1.1 — Live Demo: Ask ACME a Question
*~12 minutes · Slides 1–5*

---

**[SLIDE 1] Section Divider — Why This, Why Now, and What You'll Build**

Welcome to Section 1 of Finance AI Agents on AWS: Build Real Systems for FP&A.

I want to do something unusual before we get into any theory or architecture diagrams. I want to show you the finished system first. Not a demo video, not a screenshot — the actual running system answering real finance questions in real time.

This section runs about 36 minutes and covers three modules. Module 1.1 is a live demo — we'll ask ACME Finance two real questions and watch the system answer them instantly. Module 1.2 shows you exactly what you'll build — every component, every tab, every Lambda function. And Module 1.3 talks about who this course is designed for and maps out your complete learning journey.

[PAUSE 2s]

By the time this section is done, you'll understand what we're building, why it matters, and whether you're the right person to build it. Let's start with the demo.

---

**[SLIDE 2] Before We Explain Anything — Watch This**

Before I explain a single architecture decision, before I draw a single diagram, I want you to see what's possible. [POINT to the left panel] This is the ACME Finance AI chat interface — a simple text input, just like any chat tool you've used.

On the left you can see a simulated conversation. A user types a plain English question — no SQL, no filter menus, no dashboard navigation. Just a question. [POINT to the first user bubble] "What was ACME's revenue in 2024?" And within less than two seconds, the system responds: Revenue FY2024, $1,807.9M. Check mark. Done.

[PAUSE 2s]

Then the user asks a harder question. [POINT to second bubble] "Compare operating margin for the last three fiscal years." The system comes back: margin trend, plus 8.9%, plus 5.5%, negative 9.4%. Three years of financial performance in one answer, in under two seconds.

[POINT to the right panel] On the right side you can see how it works. Four steps: natural language query, Bedrock Agent running a ReAct reasoning loop, a Lambda tool that executes against Redshift, and an answer back to the user. That's the entire system in four steps.

[CLICK] Let's look at those two queries in detail.

---

**[SLIDE 3] Live Query #1: Revenue $1,807.9M**

[POINT to the dark query bar at top] Here's the first question exactly as typed: "What was ACME's revenue in 2024?" No year filters, no dropdown selections, no SQL knowledge required.

[POINT to the large KPI card on the left] The answer: $1,807.9 million. Full year 2024 actuals. And notice the green confirmation bar — answered in under 1.8 seconds, no SQL written, no IT ticket. That's a real person asking a real finance question and getting an instant, accurate answer.

[POINT to the right side KPIs] On the right we can see the surrounding context the system pulled alongside the headline number. Year-over-year change: plus $3.6 million, up 0.2% from FY2023. Cost of revenue: $1,038.2 million, which is 57.4% of revenue. And gross profit down at the bottom: $769.7 million, a 42.6% gross margin versus 47.7% the year before.

[PAUSE 2s]

[POINT to the agent trace at the bottom] This line at the bottom is the agent trace — what actually happened under the hood. The agent converted that natural language question into SQL: SELECT SUM revenue FROM fact_financials WHERE fiscal_year equals 2024. That's it. The agent wrote the query, executed it against Redshift Serverless, and formatted the result. No human SQL required.

[CLICK] Now let's look at the second question — and this is where the story gets interesting.

---

**[SLIDE 4] Live Query #2: Operating Margin — Last 3 Fiscal Years**

[POINT to the query bar] "Compare operating margin for the last 3 fiscal years." That's it. No parameters, no date range pickers. Just that question.

[POINT to the table] The system returns a full data table — fiscal year, revenue, gross profit, operating expenses, operating income, and operating margin — for all three years. Look at the margin column on the right. [POINT to the green badge] FY2022: positive 8.9%. [POINT to the amber badge] FY2023: positive 5.5%. [POINT to the red badge] FY2024: negative 9.4%.

[PAUSE 2s]

This is a profitable company that turned into a loss-making company in two years. And here's the thing that should stop you cold: look at the revenue numbers. $1.45 billion, $1.8 billion, $1.81 billion. Revenue barely moved. It went up 0.2% between 2023 and 2024.

[POINT to the three insight cards] So what happened? [POINT to first card] Revenue change: plus $3.6 million — essentially flat. [POINT to second card] Gross margin dropped 5.1 points — cost of revenue rose faster than revenue. [POINT to third card] Operating margin collapsed 14.8 points — operating expenses surged $377 million in two years.

[PAUSE 2s]

[POINT to the dark banner at bottom] Revenue barely changed. Margin collapsed 14.8 points. The system answers WHY — automatically. That's what we're building. Not just a dashboard that shows numbers, but a system that explains them.

[CLICK] Let's look at exactly how that system works under the hood.

---

**[SLIDE 5] What Just Happened? Under the Hood in 4 Steps**

[POINT to card 1] Step one is simple. You type a plain English question. That's it. No SQL, no query language, no special syntax. The system accepts natural language just like you'd talk to a colleague. This is the input — less than 500 milliseconds to reach the agent.

[POINT to card 2] Step two is where the intelligence lives. The Bedrock Agent runs what's called a ReAct loop — Reason plus Act. Claude reads your question, reasons about what it needs: "I need operating margin data for three years. I should use the text-to-sql tool against the financials table." It selects the right tool and knows what parameters to pass. This is the planning layer.

[POINT to card 3] Step three is execution. The Lambda tool takes the agent's reasoning and converts it into actual SQL — structured, parameterized, safe SQL — then fires it against Redshift Serverless. The database runs the query, returns a JSON result set, and passes it back up the chain. Under 1.5 seconds for most queries.

[POINT to card 4] Step four is synthesis. The agent takes the raw data, formats it into a human-readable answer, adds units and context, and returns it. Full answer delivered in under two seconds total.

[PAUSE 2s]

[POINT to the POWERED BY row] The four AWS services doing this work: Amazon Bedrock as the AI platform, Claude 3.7 Sonnet as the language model, AWS Lambda for the tool execution, and Redshift Serverless for the data. Each one is a managed service — minimal ops overhead.

[CLICK] That was Module 1.1. Now let's look at what you'll build across the full course.

---

## Module 1.2 — What You'll Build
*~12 minutes · Slides 6–10*

---

**[SLIDE 6] What You'll Build — Full System Overview**

[POINT to the left panel] Here is everything you will have built by the end of this course. Let me read through it so you understand the full scope.

A production-ready Streamlit finance dashboard with six tabs — we'll cover those tabs in a moment. A FastAPI backend connecting the UI to all the AWS services. A Bedrock Agent with five custom Lambda tools — the core of the AI capability. An AgentCore Gateway for secure, enterprise-grade access. A Redshift Serverless data warehouse with dbt transformation models. Memory-augmented agents that actually learn your preferences over time. An AI commentary generation pipeline for writing board-quality narrative. And automated board pack PDF generation.

[PAUSE 2s]

[POINT to the right panel] Now look at the numbers. Eight sections of course content. Over 120 slides total across the full course. Five Lambda functions. Six Streamlit tabs. Ten build phases. Estimated build time of 12 to 16 hours of focused work — not watching, actually building.

[POINT to the green and blue badges at the bottom] All of the code is open-sourced on GitHub. And an AWS CDK stack is included — you can deploy the entire infrastructure in under 30 minutes with a single command.

[CLICK] Let me show you the architecture of the full system.

---

**[SLIDE 7] System Architecture — End-to-End**

[POINT to the leftmost column] The presentation layer is Streamlit — a Python-native web framework that's become the standard for data applications. Six dashboard tabs, all connected to a FastAPI backend that handles routing and authentication.

[POINT to AI AGENT column] The intelligence sits in Amazon Bedrock — specifically, a Bedrock Agent configured with Claude 3.7 Sonnet. This is the ReAct loop we just saw in the demo. The agent decides which tool to call, passes the right parameters, and synthesizes the results.

[POINT to GATEWAY column] In between the agent and the user is AgentCore Gateway. This is a newer AWS service that handles enterprise concerns — authentication, rate limiting, request logging, and audit trails. We dedicate a full phase to this.

[POINT to COMPUTE column] The compute layer is five Lambda functions in Python 3.12. Latency under three seconds. Up to 1,000 concurrent executions. VPC-enabled for secure Redshift access.

[POINT to DATA column] And at the data layer — Redshift Serverless. No cluster management, automatic scaling, pay-per-query. dbt handles the transformation models. S3 stores the raw data. Glue catalogs it. CloudWatch monitors everything.

[PAUSE 2s]

[POINT to the dark request flow bar] The full request path reads: User sends a message, FastAPI receives it, AgentCore authenticates and routes it, Bedrock's agent reasons and selects a tool, Lambda executes the tool, Redshift returns data, Bedrock synthesizes the answer, FastAPI returns it to the user.

[CLICK] Now let's look at those five Lambda tools individually.

---

**[SLIDE 8] The 5 Lambda Tools — Agent's Capabilities**

[POINT to card 1 — text_to_sql] Tool one is text_to_sql — and this is the workhorse. Every ad-hoc data question goes through this tool. It takes a natural language question, uses schema context and few-shot examples to construct accurate SQL, executes it, and returns a structured result. This is what answered both demo questions.

[POINT to card 2 — forecast] Tool two is forecast. When a user asks about projections or outlooks, this tool kicks in. It reads historical actuals from Redshift, applies time-series logic, and generates a 12-month forward projection with confidence bands. FP&A teams use this during budget season.

[POINT to card 3 — variance_rca] Tool three is variance_rca — root cause analysis. This is the tool that answers "why did operating margin collapse?" It decomposes budget versus actual variances by business unit, cost center, and driver. Monthly close teams run this automatically.

[POINT to card 4 — whatif_sim] Tool four is whatif_sim — the scenario simulator. A CFO asks: what happens to our P&L if we cut headcount by 10%? This tool takes those inputs, runs the model against the financial structure, and projects the impact within seconds. No spreadsheet required.

[POINT to card 5 — describe_metric] And tool five is describe_metric. This is a simpler but critical tool — it retrieves the canonical definition of any finance KPI from a metric catalog. It ensures that when the AI says "operating margin," it's using the exact same definition as the finance team. Consistency across all outputs.

[PAUSE 2s]

[POINT to the dark strip at bottom] All five are Python 3.12, average latency under 2.5 seconds, support up to 1,000 concurrent executions, IAM-secured, and fully unit-tested.

[CLICK] Now let me show you the six Streamlit tabs these tools power.

---

**[SLIDE 9] The 6 Streamlit Tabs — Finance Dashboard**

[POINT to the tab bar at top] The Streamlit UI has six tabs — and you can see the active tab is AI Analyst, which is the chat interface we showed in the demo. Let me walk through each one.

[POINT to P&L card] Tab one is the P&L — the full Income Statement. Revenue, gross profit, EBITDA, net income. Monthly actuals versus budget. A three-year trend chart. This is your primary finance view.

[POINT to ARR card] Tab two is ARR — Annual Recurring Revenue. For SaaS businesses, this is the growth story. New ARR, expansion, contraction, churn — in a waterfall chart by month. Plus Net Revenue Retention, which is the single most important SaaS metric.

[POINT to AR Aging card] Tab three is AR Aging — Accounts Receivable. Which customers owe money and how overdue are they? Aging buckets: current, 30 days, 60 days, 90-plus days. Days Sales Outstanding trend. Collections risk flags.

[POINT to AI Analyst card] Tab four — this is the AI Analyst. The chat interface from the demo. Natural language queries, instant answers, full conversation history. Powered by the Bedrock Agent and all five tools.

[POINT to Commentary card] Tab five is Commentary. AI-generated narrative for each metric. The system writes CFO-quality language explaining what happened and why. Editable, version-controlled, one click to regenerate with a different tone or length.

[POINT to Board Pack card] Tab six is Board Pack. One click generates a complete, branded PDF board package — cover page, executive summary, all charts, all commentary. Downloadable in under 30 seconds.

[CLICK] Now let me show you how we build all of this across 10 phases.

---

**[SLIDE 10] Build Phases — 10-Phase Progression**

[POINT to the group brackets at top] The 10 phases are grouped into five categories. Foundation covers the first three phases — data layer, API, and UI. Agent covers phases four through six — the tools, the Bedrock agent, and testing. Production is phases seven and eight — AgentCore Gateway and memory. AI is phase nine — commentary. And Ship is phase 10 — board pack and deployment.

[POINT to Phase 1 card] Phase 1: Data Foundation. This is where we set up Redshift Serverless, create the dbt models, and seed the ACME Finance data. About 90 minutes of work.

[POINT to phases 2 and 3] Phase 2 gives us the FastAPI backend skeleton — about 60 minutes. Phase 3 builds all six Streamlit tabs — 90 minutes.

[POINT to phases 4 and 5] Phase 4 is where it gets exciting — we build all five Lambda tools and wire them to Bedrock. 120 minutes, the biggest phase. Phase 5 configures the actual Bedrock Agent with the ReAct loop — 90 minutes.

[POINT to phases 6 through 8] Phase 6 is testing and QA — 60 minutes of unit and integration tests. Phase 7 adds AgentCore Gateway — 90 minutes. Phase 8 adds conversation memory and user preferences — 60 minutes.

[POINT to phases 9 and 10] Phase 9 builds the AI commentary pipeline — 60 minutes. Phase 10 adds board pack generation and does the full deployment — 90 minutes.

[PAUSE 2s]

Total estimated time: about 14 hours of focused build time. Not rushed — deliberate, with explanation at every step.

[CLICK] Let's move to Module 1.3 — who this course is for and your complete roadmap.

---

## Module 1.3 — Who This Is For + Your Roadmap
*~12 minutes · Slides 11–15*

---

**[SLIDE 11] Who This Is For + Your Roadmap**

[POINT to the SA avatar] This section is for one specific person — the Solution Architect who has built on AWS, knows Python, has heard about Bedrock but never built an agent end-to-end, and has never touched a finance AI system.

Let me read through the criteria so you can self-assess. [POINT to first check] You've deployed AWS services — EC2, Lambda, RDS, maybe even Bedrock. You know how AWS works. [POINT to second check] You know Python well enough to read and modify code. Not expert-level, but comfortable. [POINT to third check] You've heard of Bedrock Agents — maybe you've read the docs — but you've never built one end-to-end with production tools.

[POINT to fourth check] And critically — you've never built a finance AI system. You don't know what a P&L is at a deep level. You don't speak the CFO's language. This course bridges that gap. [POINT to fifth check] And you want something real to show at the end — architecture diagrams you created, a working system you built, not just slides you consumed.

[PAUSE 2s]

[POINT to the red NOT FOR YOU strip] Let me be direct about who this is not for. If you need basic Python tutorials, this isn't the course. If you want theory without code, this isn't the course. If you're looking for a no-code tool, definitely not this course.

[POINT to the prerequisites row] Prerequisites: Python 3.10 or higher, an AWS account you can deploy to, basic SQL knowledge — not expert-level — and Git for version control. That's it.

[CLICK] Let me show you what you'll gain beyond just building the system.

---

**[SLIDE 12] The Gap This Course Fills**

[POINT to "You Already Know" column] You already know AWS core services — you can spin up a Lambda, create an RDS instance, read a CloudFormation template. You know Python well enough. You can call REST APIs. You can read architecture diagrams. You have Infrastructure as Code basics.

[POINT to "You Will Learn" column] Here's what you don't know yet, and what this course teaches. Finance domain vocabulary — the language CFOs actually speak. P&L mechanics, ARR metrics, variance analysis, what it means when operating margin moves. Bedrock Agent patterns — how to structure tools, write action group schemas, configure the ReAct loop. And AgentCore Gateway — the enterprise-grade access layer that makes these systems production-ready.

[POINT to "You Will Build" column] And here's what you'll have at the end — not just knowledge, but artifacts. A working ACME Finance system deployed on your AWS account. Five Lambda-backed AI tools you can adapt for any domain. A production Streamlit dashboard with six tabs. An AI commentary pipeline that writes CFO-quality narrative. And an automated board pack generator.

[PAUSE 2s]

[POINT to the quote bar at bottom] This is the key distinction: most finance AI courses teach theory. This one ships a system. By the end, you'll have 15 or more files of production-ready code that you wrote, that you understand, and that you can adapt for a real client.

[CLICK] Let me show you the deliverables in concrete terms.

---

**[SLIDE 13] What You'll Have When You're Done**

Six specific things you'll leave with. [POINT to first checkmark card] First — a working ACME Finance system. Not a toy demo, a fully functional AI finance system running on your AWS account. Deployable in under 30 minutes via CDK. You can walk into a client conversation and demo it live.

[POINT to Architecture Patterns card] Second — architecture patterns. The Bedrock Agent structure, the Lambda tool pattern, the AgentCore Gateway setup — these are reusable across any domain. Finance, healthcare, logistics — the patterns transfer.

[POINT to Finance Domain Fluency card] Third — finance domain fluency. You'll be able to speak the language: P&L, ARR, EBITDA, variance analysis, DSO, Net Revenue Retention. Enough to partner credibly with any CFO and understand what they're asking for.

[POINT to Use Case Framework card] Fourth — a use case framework. A structured way to identify which business problems are good candidates for AI agents, how to scope them, and how to pitch them to finance stakeholders. Battle-tested from real implementations.

[POINT to Business Case Template card] Fifth — a business case template. A complete ROI calculator and business case slide deck for finance AI initiatives. You customize it for your specific client — the structure is already there.

[POINT to Production Checklist card] Sixth — a production checklist. Security controls, monitoring setup, cost management, observability — everything you need to take a Bedrock deployment from prototype to production safely.

[PAUSE 2s]

[POINT to the green bar at bottom] All of these materials — slides, code, CDK stacks, templates — are in the GitHub repository that comes with the course. Not separate downloads, not paywalled extras. Everything included.

[CLICK] Now let me show you the complete course roadmap so you know exactly where this section fits.

---

**[SLIDE 14] Your Journey — 8-Section Course Roadmap**

[POINT to Section 1 block] You are here. Section 1 — the Hook. Why this, why now. That's what we've been doing for the last 30 minutes. You've seen the finished system, you know what you'll build, and you understand whether this course is for you.

[POINT to Section 2 block] Section 2 is the Finance Domain. We go deep on P&L mechanics, ARR waterfall, accounts receivable aging, how finance teams are organized, and the data vocabulary you need to build systems for them.

[POINT to Section 3 block] Section 3 is Strategy — use case identification, business case development, how to scope an AI finance initiative, and how to present it to a CFO.

[POINT to Section 4 block] Section 4 is the Data Layer — we build the Redshift infrastructure and dbt models that power everything. The data foundation that all the AI sits on top of.

[POINT to Section 5 block] Section 5 is Architecture — AWS design patterns for AI systems, security considerations, networking, and infrastructure as code.

[POINT to Section 6 block] Section 6 is the Agent Build — this is where we build all five Lambda tools and configure the Bedrock Agent. The hands-on core of the course.

[POINT to Section 7 block] Section 7 is Production — AgentCore Gateway, memory augmentation, conversation history. Making it enterprise-ready.

[POINT to Section 8 block] Section 8 is Scale — AI commentary, board pack generation, deployment automation. The final mile from built to shipped.

[PAUSE 2s]

[POINT to the END GOAL bar] The end goal: a working finance AI agent on AWS, deployed in production, ready to present to a CFO.

[POINT to the time estimate] Estimated completion: 16 to 20 hours of focused study and build time. You can do this in a focused week or spread it over a month. The materials are yours to keep.

[CLICK] Let's close out Section 1.

---

**[SLIDE 15] Section 1 Complete**

Let's do a quick recap before we move on.

[POINT to first checkmark] You saw the finished system answer two real finance questions — live, no SQL, no dashboards. Just natural language in, accurate answers out.

[POINT to second checkmark] Query one: ACME's revenue, $1,807.9 million FY2024, answered in under 2 seconds via natural language to Bedrock Agent to Lambda to Redshift and back.

[POINT to third checkmark] Query two: The operating margin story — positive 8.9%, positive 5.5%, negative 9.4%. A profitable company that swung to a $170 million operating loss while revenue barely moved. That's the problem the system solves.

[POINT to fourth checkmark] Under the hood: a four-step ReAct loop — Plan, Select Tool, Execute, Answer. That's the entire AI architecture in four steps.

[POINT to fifth checkmark] You'll build: Streamlit UI, FastAPI, Bedrock Agent, five Lambda tools, and Redshift — across 10 phases with an estimated 14 hours of hands-on build time.

[POINT to sixth checkmark] This course is for Solution Architects who want working code, not theory. If that's you, you're in the right place.

[PAUSE 2s]

[POINT to the blue CTA bar at bottom] Next up is Section 2 — the Finance Domain and the Problem We're Solving. We go deep on financial statements, SaaS metrics, the ACME data model, and why finance is actually a perfect domain for AI agents.

I'll see you in Section 2.

---

*End of Section 1 Narration Script*

---

## Timing Reference

| Slide | Title | Target Time | Cumulative |
|-------|-------|-------------|------------|
| 1 | Section Divider | 1:30 | 1:30 |
| 2 | Before We Explain — Watch This | 2:30 | 4:00 |
| 3 | Live Query #1: Revenue | 2:30 | 6:30 |
| 4 | Live Query #2: Operating Margin | 2:30 | 9:00 |
| 5 | What Just Happened — 4 Steps | 3:00 | 12:00 |
| 6 | What You'll Build — Overview | 2:30 | 14:30 |
| 7 | System Architecture | 2:30 | 17:00 |
| 8 | The 5 Lambda Tools | 2:30 | 19:30 |
| 9 | The 6 Streamlit Tabs | 2:00 | 21:30 |
| 10 | Build Phases — 10-Phase Timeline | 2:30 | 24:00 |
| 11 | Who This Is For | 2:30 | 26:30 |
| 12 | The Gap This Course Fills | 2:00 | 28:30 |
| 13 | What You'll Have When Done | 2:00 | 30:30 |
| 14 | 8-Section Course Roadmap | 3:00 | 33:30 |
| 15 | Section 1 Complete | 2:30 | 36:00 |

---

## Presenter Notes — Common Questions to Anticipate

**"Why Bedrock and not OpenAI?"**
AWS Bedrock gives enterprise-grade security, VPC isolation, IAM access control, and no data leaving your account. For finance AI handling confidential P&L data, that's a hard requirement for most enterprises.

**"Do I need to know finance to take this course?"**
No. Section 2 teaches you exactly what you need. We assume zero prior finance knowledge. By the end of Section 2, you'll have enough vocabulary to have a credible conversation with any CFO.

**"Can I use this with a different database?"**
The Lambda tools are designed with Redshift in mind, but the patterns work with any SQL database. The text_to_sql tool can be adapted to PostgreSQL, MySQL, or any ANSI SQL database with minor changes.

**"How much does this cost to run on AWS?"**
With Redshift Serverless on-demand pricing and Claude 3.7 Sonnet rates, a typical demo workload costs under $10 per day. We cover cost controls and budget alerts in Phase 6.

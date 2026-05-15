# Section 5 — Reference Architecture
## Narration Script
**Duration:** ~45 minutes | **Pace:** ~130 wpm | **Total slides:** 18

---

**[SLIDE 1] Section 5 — Reference Architecture (Section Divider)**

Welcome to Section 5 — Reference Architecture. This is the section where everything comes together.

[PAUSE 2s]

Up until now, we've talked about the finance domain, the transformation strategy, and the components in isolation. In this section, we're going to look at all nine components as a working system. We're going to understand how they connect, how data moves through them, and why the architecture is designed the way it is.

[POINT] By the end of this section, you should be able to walk up to a whiteboard — with no slides, no notes — and draw this system for a client. That's the goal.

We have five modules. Module 5.1 gives you the overview and full diagram. Module 5.2 traces how a dashboard metric query flows — the fast path. Module 5.3 traces how a natural language question flows — the agent path. Module 5.4 covers the security model: what's locked down now and what we're deferring to production. And Module 5.5 covers observability — the seven signals you need to monitor from day one.

[PAUSE 2s]

Let's start with the big picture. Module 5.1.

---

**[SLIDE 2] ACME Finance: Full System Architecture**

[POINT] Here is the full system on one slide. Three layers.

At the top is the **Presentation layer** — Streamlit, running on port 8501, with six tabs. Each tab is a different view of the finance data: P&L, ARR, AR Aging, the AI Analyst chat, Commentary generation, and Board Pack compilation.

[CLICK]

In the middle is the **Orchestration layer**. This is where the intelligence lives. You have FastAPI in the centre, acting as the API gateway. To its left: AgentCore Memory, which stores cross-session analyst context, and Bedrock Agent, which runs the Claude Sonnet model and manages the reasoning loop. To its right: AgentCore Gateway, which is the MCP tool registry, and the five Lambda functions — text-to-sql, forecast, variance-rca, what-if-sim, and describe-metric.

[CLICK]

At the bottom is the **Data layer** — Redshift Serverless, specifically the acme-finance-dev workgroup and the analytics-dev-marts schema.

[PAUSE 2s]

Notice the two vertical lines dropping from FastAPI down to Redshift. One is labelled "direct metrics" — that's the fast path for dashboard data. The other goes through Lambda — that's the agent path for NL queries. We'll trace both in the next two modules.

---

**[SLIDE 3] Component Inventory**

[POINT] Let's put every component in a table so nothing is ambiguous.

[CLICK]

Twelve rows. The first column is the component name. Then type, layer, and key configuration.

Starting at the top: **Streamlit UI** — a web app, Presentation layer, port 8501, six tabs.

**FastAPI** — REST API, Orchestration, port 8000. The endpoints you'll use most are /chat, /commentary, /boardpack, /metrics/*, and /health.

**Bedrock Agent** — LLM orchestrator. Claude Sonnet. Agent ID is LUUHZWRDA4 — you'll see this in the AWS console when we deploy.

**AgentCore Gateway** — tool registry using MCP protocol version 2025-03-26. This is the gatekeeper that decides which Lambda gets called.

[CLICK]

Then the five Lambdas: text-to-sql converts natural language to SQL. Forecast does four-quarter projections. Variance-RCA compares actuals to plan ranked by cost center. What-if-sim runs percentage change simulations on P&L lines. And describe-metric returns business glossary definitions.

**AgentCore Memory** — semantic store, cross-session, top-5 retrieval.

And at the bottom: **Redshift Serverless** — workgroup acme-finance-dev, schema analytics-dev-marts.

[PAUSE 2s]

Keep this table as your reference. Every component has one job.

---

**[SLIDE 4] The Core Design Principle**

[POINT] This quote is the most important thing on this slide.

[CLICK]

*"Every AI call goes through Bedrock Agent, then Gateway, then Lambda, then Redshift. No direct database access from the UI."*

[PAUSE 2s]

Why does this matter? Three reasons.

**Auditable.** [POINT] Every query is logged. Bedrock traces every ReAct step. If a CFO asks why the AI gave a particular variance number, you can replay the exact reasoning chain. That's a compliance requirement in most finance environments.

**Replaceable.** [POINT] Because the architecture uses a clean interface at each boundary, you can swap any layer. Swap Claude for another model. Replace a Lambda with a different data source. Point to a different Redshift workgroup. The contract between components stays the same.

**Controllable.** [POINT] The Streamlit UI has zero database credentials. Zero. Lambda roles are narrowly scoped. There are no surprise access paths where a compromised frontend could exfiltrate financial data.

[PAUSE 2s]

This is the architecture decision that separates a production AI system from a quick prototype. Hold onto it.

---

**[SLIDE 5] Module 5.2 — How a Dashboard Query Flows (Module Intro)**

Module 5.2. Eight minutes.

[PAUSE 2s]

In Module 5.1 we saw the full system diagram with two distinct paths from FastAPI down to Redshift. In this module, we focus on the first one — the direct path. No agent, no Lambda, no reasoning loop. Just FastAPI talking straight to Redshift.

We're going to trace what happens when a user loads the P&L tab in Streamlit. This is the most common operation in the system — every time someone opens a dashboard tab, this path fires.

[CLICK]

The key thing to understand before we start: the dashboard metrics do **not** go through the Bedrock Agent. There's no ReAct loop, no Lambda invocation, no tool call. FastAPI queries Redshift directly with pre-defined SQL. That's intentional — it's what makes dashboards fast and predictable. We'll explain the design rationale in slide 7.

[PAUSE 2s]

Let's trace it step by step.

---

**[SLIDE 6] Direct Metrics Path: The P&L Tab**

[POINT] Six steps. Watch how simple this is compared to the agent path we'll see in Module 5.3.

[CLICK]

Step 1: **Browser loads the tab.** The user switches to the P&L tab in Streamlit. Streamlit fires a request.

Step 2: **GET /metrics/pl.** FastAPI receives an HTTP GET request. No authentication token needed in the dev environment.

Step 3: **FastAPI queries Redshift.** FastAPI calls the Redshift Data API directly. It runs pre-defined SQL against the analytics-dev-marts schema.

[CLICK]

Step 4: **SQL runs on Redshift.** The query executes on the serverless cluster. It's reading from the dbt-built mart tables — structured, pre-aggregated P&L data.

Step 5: **JSON returned.** FastAPI serialises the result set into JSON and sends it back in the HTTP response.

Step 6: **Plotly renders the chart.** Streamlit receives the JSON and passes it to a Plotly chart component. The user sees a waterfall chart.

[POINT] Key insight: FastAPI queries Redshift directly for all /metrics/* endpoints. No Bedrock, no Lambda, no agent loop. This is why dashboard load times are under one second.

[CLICK]

Look at the latency numbers: FastAPI overhead is less than 20 milliseconds. Redshift query, when the cluster is warm, is 200 to 800 milliseconds. Chart render is under 100 milliseconds. Total end-to-end: under one second.

[PAUSE 2s]

These five endpoints all follow this pattern: /metrics/pl, /metrics/arr, /metrics/ar-aging, /metrics/revenue, and /health.

---

**[SLIDE 7] Why Two Paths? Agent vs Direct**

[POINT] So we have two paths. Why not just use one? Let's be precise about when you use each.

[CLICK]

The **Agent path** — on the left — is for anything that requires reasoning. Natural language questions. Complex multi-step analysis. What-if scenarios. Questions you can't predict in advance. The trigger is a POST to /chat or /commentary. The flow goes all the way through memory retrieval, Bedrock Agent, Gateway, Lambda, and Redshift. Latency is three to six seconds.

[CLICK]

The **Direct path** — on the right — is for anything predictable. Dashboard rendering. Chart data. KPI tiles. Health checks. The trigger is a GET to /metrics/*. The flow goes FastAPI to Redshift Data API to JSON to Plotly. Latency is under one second.

[PAUSE 2s]

[POINT] The line at the bottom of this slide says it precisely: *"The agent is for reasoning. The direct endpoints are for rendering."*

Here's the practical implication: if a new business requirement is "show me last quarter's revenue on the dashboard," that's a direct endpoint. If the requirement is "explain why revenue was different from plan and suggest what to investigate," that's the agent path.

[PAUSE 2s]

Don't use the agent where you don't need reasoning. It costs inference time and money. Reserve it for questions that actually require intelligence.

---

**[SLIDE 8] Module 5.3 — How a Natural Language Query Flows (Module Intro)**

Module 5.3. Ten minutes.

[PAUSE 2s]

In Module 5.2, we saw the direct path — simple, fast, predictable. Now we trace the agent path: the flow that activates when a user asks a question the system has never seen before.

This is the heart of ACME Finance. Without this flow, we'd have a sophisticated dashboard but no intelligence. With it, we have a system that can answer unstructured questions, reason about data, and build context across sessions.

[CLICK]

We're going to go through seven steps — from the user typing a question all the way back to the rendered answer. Then we'll zoom in on Step 5, the ReAct loop, with a concrete real-world example. And we'll close with the latency budget so you know exactly where the seconds go.

[PAUSE 2s]

This module is the one clients find most impressive. Understand it deeply. Let's go.

---

**[SLIDE 9] NL Query: 7-Step End-to-End Flow**

[POINT] Seven steps. Left column is the sequence. Right panel shows Step 5 in detail — that's the ReAct loop, which is where the AI actually works.

[CLICK]

Step 1: **User types a question** in the Streamlit AI Analyst tab. For example: "What was our EMEA variance in Q4?"

Step 2: **POST /chat.** Streamlit sends the question to FastAPI as a POST request to the /chat endpoint.

Step 3: **Retrieve memory.** Before invoking the agent, FastAPI calls AgentCore Memory and retrieves the top-5 most relevant records from previous sessions. This gives the agent context — what has this analyst been investigating? What did we discuss last week?

[CLICK]

Step 4: **Invoke Bedrock Agent.** FastAPI calls the Bedrock Agent runtime API, passing both the user's question and the memory context.

Step 5: **ReAct loop.** [POINT] This is where the reasoning happens. Reason, Act, Observe — one or more turns until the agent has a confident answer. We'll zoom in on this in a moment.

Step 6: **Store to memory.** Once the agent returns an answer, FastAPI stores the question-and-answer pair back to AgentCore Memory. This is what builds the context for future sessions.

Step 7: **Response returned to Streamlit.** FastAPI sends the answer back. Streamlit renders it in the chat interface.

[PAUSE 2s]

[POINT] Look at the ReAct detail on the right. Five phases: Reason, Act, Observe, Reason again, and Final. Each phase has a specific job.

---

**[SLIDE 10] The ReAct Loop: One Full Cycle**

[POINT] Let's trace a complete ReAct cycle with a real question.

The user asks: *"What was the EMEA variance in Q4?"*

[CLICK]

**REASON.** The model reads the question plus the memory context. It identifies: this is a variance analysis request, EMEA region, Q4 quarter. It selects the tool: variance-rca. That's the Lambda function that compares actuals to plan, ranked by cost center.

[CLICK]

**ACT.** The agent calls AgentCore Gateway via the MCP protocol. The payload is: tool equals variance-rca, quarter equals Q4, region equals EMEA.

[CLICK]

**OBSERVE.** Gateway routes the call to the variance-rca Lambda. Lambda executes SQL against fct-gl-entries joined against the EPM plan table, filters for EMEA and Q4, orders by variance descending. It returns a ranked list of cost centers with their variance values.

[CLICK]

**REASON again.** The model now has the data. It reads the ranked list and composes a structured answer. "EMEA Q4 variance was negative $2.1 million. Top drivers: Cloud Infrastructure at negative $0.8 million, Headcount at negative $0.6 million." It also generates follow-up suggestions — questions the analyst might want to ask next.

**FINAL.** That composed answer is returned to FastAPI, stored to memory, and displayed to the user.

[PAUSE 2s]

One ReAct cycle. Typically the agent completes in one to two turns. More complex questions — ones that need data from multiple Lambda functions — might require three or four turns.

---

**[SLIDE 11] Latency Budget: Complex NL Query**

[POINT] Let's talk numbers. What does "three to six seconds" actually mean in terms of where the time goes?

[CLICK]

Starting from the top of the waterfall:

**Memory retrieve** from AgentCore — around 200 milliseconds. Semantic search is fast.

**Agent invocation start** — 100 milliseconds. This is the Bedrock API call setup, before inference begins.

**Bedrock inference per ReAct turn** — approximately 1,200 milliseconds per turn. This is the Claude Sonnet inference time. For a two-turn conversation, double it.

**AgentCore Gateway routing** — 80 milliseconds. MCP dispatch overhead is minimal.

**Lambda cold start** — 500 milliseconds. [POINT] This is the big one to watch. A cold Lambda — one that hasn't been invoked recently — takes half a second just to initialise. A warm Lambda is around 50 milliseconds. Keep your Lambdas warm with scheduled pings in production.

**Redshift query** — 800 milliseconds to 2 seconds depending on query complexity. The analytics-dev-marts tables are pre-aggregated, so most queries are fast, but joins across multiple marts can take longer.

**Response serialisation** — 50 milliseconds. JSON plus memory write.

[CLICK]

Total: three to six seconds for a complex multi-step query. That is acceptable for analysis work — a CFO asking a strategic question expects to wait a few seconds. But for the best user experience, consider streaming tokens back from Bedrock so the analyst sees output appearing rather than waiting for a completed response.

[PAUSE 2s]

[POINT] The alert thresholds at the bottom: Bedrock over 10 seconds, Lambda over 30 seconds, Redshift over 5 seconds. We'll cover monitoring in Module 5.5.

---

**[SLIDE 12] Module 5.4 — Security: What's In, What's Deferred (Module Intro)**

Module 5.4. Nine minutes.

[PAUSE 2s]

Security in AI systems is a nuanced topic, and I want to be precise about it. Many teams either over-engineer security for a development environment — adding VPCs, WAFs, and identity layers that slow down iteration — or they under-engineer it and build something that can never go to production.

ACME Finance takes a deliberate middle ground: tight enough to ship to internal analysts today, with a clear production hardening checklist for when you're ready to go broader.

[CLICK]

We'll cover three things in this module. First, the IAM architecture — the permission chain from Bedrock Agent all the way to Redshift, and why it's structured the way it is. Second, what security properties are in scope right now. Third, what's explicitly deferred to Phase 11 — production hardening — with a reason for each deferral.

[PAUSE 2s]

Let's start with the IAM chain.

---

**[SLIDE 13] IAM Architecture: Permission Flow**

[POINT] Four IAM roles. Each one can only call the next layer. No skipping.

[CLICK]

**Bedrock Agent Role.** This role has exactly one permission: bedrock-agentcore:InvokeTool. That's it. The Bedrock Agent can call the AgentCore Gateway. It cannot call Lambda directly. It cannot access Redshift. It cannot call any other AWS service.

[CLICK]

**AgentCore Gateway Role.** This role has lambda:InvokeFunction — but only for five specific Lambda ARNs. Not all Lambdas in the account. Not by prefix. Five specific ARNs, hard-coded in the Gateway configuration.

[CLICK]

**Lambda Execution Roles.** Each Lambda has its own execution role. The permissions are: redshift-data:ExecuteStatement and redshift-data:GetStatementResult. Scoped to the specific acme-finance-dev workgroup. No other Redshift workgroups. No S3. No SSM. Just those two API calls on one workgroup.

[CLICK]

**FastAPI.** In the dev environment, FastAPI runs with dev credentials — either an IAM user or a role. It can invoke the Bedrock Agent runtime and call the Redshift Data API for the direct metrics endpoints.

[PAUSE 2s]

[POINT] Look at the data-layer scoping table below. Lambdas can only SELECT — no INSERT, UPDATE, or DELETE. The agent can only see results returned by Lambdas, never touching Redshift directly. The UI has no database credentials at all. Source systems are completely unreachable.

---

**[SLIDE 14] Security: What's In Scope Now**

[POINT] Five green checkmarks. These are the security properties you have right now, out of the lab.

[CLICK]

**Redshift scoped to analytics-dev-marts.** Lambda roles only grant access to the marts schema. The staging tables — stg-underscore-star — and raw tables are not reachable. Views are the public API surface.

**Lambda is read-only.** The IAM policies include ExecuteStatement and GetStatementResult only. There is no write path. The agent cannot modify financial data. This is critical for a finance system.

**No direct DB access from the UI.** Streamlit has zero database credentials. A compromised browser — even with a valid session — cannot reach Redshift.

[CLICK]

**Agent cannot reach source systems.** Bedrock Agent can only call tools registered in AgentCore Gateway. There's no internet access. No external API calls. No ERP connections. If someone attempts a prompt injection to exfiltrate data from external systems, there's simply no path for that call to succeed.

**Tool registry limits blast radius.** Gateway routes to exactly five registered Lambdas. The agent cannot invoke arbitrary AWS resources, even if a malicious prompt tried to instruct it to.

[PAUSE 2s]

Five properties. All implemented. All verified. This is solid enough for internal analyst use.

---

**[SLIDE 15] Security: What's Deferred to Production**

[POINT] Six items. All tagged Phase 11. All out of scope for this course.

[PAUSE 2s]

I want to be explicit about this — not to hide these gaps, but to give you a clear map of what production hardening looks like.

[CLICK]

**AgentCore Identity and Workload Tokens.** This is per-session identity scoping. In a multi-tenant deployment, different users should see different data. Workload tokens enable that. Currently all requests use the same identity.

**VPC Endpoints for Redshift.** Currently the Redshift cluster may accept connections over the public internet, protected only by authentication. VPC endpoints remove that exposure entirely — all traffic stays inside the AWS network.

[CLICK]

**WAF for FastAPI.** Rate limiting, OWASP rule sets, IP allowlisting. Required before any external-facing deployment. Not needed for an internal tool.

**Secrets Manager for credentials.** FastAPI currently uses dev IAM credentials or environment variables. Secrets Manager enables automatic rotation and full audit trails for secret access.

[CLICK]

**CloudTrail and GuardDuty integration.** Alerting on anomalous Bedrock invocation patterns, unusual Lambda call volumes, Redshift data exfiltration signals. This is your early warning system.

**PrivateLink for Bedrock.** Keeps Bedrock API calls inside the AWS network for sensitive inference workloads.

[PAUSE 2s]

Phase 11. Important for production. Not needed for the lab. Write these down as your go-live checklist.

---

**[SLIDE 16] Module 5.5 — What to Monitor (Module Intro)**

Module 5.5. Eight minutes.

[PAUSE 2s]

We've built the system. We understand the security model. The last question is: once this is running in production, how do you know it's working?

I've seen AI projects go live without any observability, and the first sign of trouble is an angry finance director who asked the agent a question and got silence back. Or worse — got a plausible-sounding wrong answer, because a Lambda was failing silently and the agent was guessing.

[CLICK]

We're going to prevent that. In this module, we define seven specific signals you need to monitor from day one. Five come from CloudWatch — two covering Bedrock, two covering Lambda, and one on Redshift. Two come from AgentCore's own telemetry. Each one has a specific alert threshold and a reason why that threshold matters.

[PAUSE 2s]

If you configure nothing else on this system, configure these seven signals before you let your first external user in. Let's walk through them.

---

**[SLIDE 17] Key Metrics to Track**

[POINT] Top section: CloudWatch. Bottom section: AgentCore telemetry.

[CLICK]

**Bedrock Agent InvocationLatency.** Alert if over 10 seconds. This tells you the ReAct loop is taking too long — either Bedrock inference is slow, the model is stuck in too many turns, or there's a timeout somewhere.

**Lambda Duration — all five functions.** Alert if over 30 seconds. This captures cold start time plus SQL query time combined. If a Lambda is regularly hitting 30 seconds, something is wrong with either the function or the query it's running.

**Lambda Errors.** Alert on any failure. Not "alert if error rate exceeds 5 percent." Alert on ANY error. Lambda errors reach the user as degraded or missing answers. Catch them immediately.

[CLICK]

**Redshift Query Duration.** Alert if over 5 seconds. Filter the metric by the acme-finance-dev workgroup so you're not getting noise from other workgroups in the account.

**FastAPI /health endpoint.** Custom synthetic monitor. Check every 60 seconds. If FastAPI is down, no one gets any data — dashboard or NL. This is your canary.

[CLICK]

Below the line: **AgentCore telemetry.**

**Memory retrieve latency.** Alert if over 2 seconds. Semantic search should be fast. If it's slow, you may have an index size issue or a configuration problem.

**Gateway tool invocation success rate.** Alert if it drops below 99 percent. Tool failures reach users as incomplete or vague answers. The user sees "I couldn't get that information" and loses trust in the system. Catch this before it happens.

[PAUSE 2s]

Seven signals. Put them in a CloudWatch dashboard. Review them every morning in the first two weeks after deployment.

---

**[SLIDE 18] Section 5 Recap + Next: Section 6 — Agent Design**

[POINT] Six takeaways. Then we move on.

[CLICK]

**Nine components across three layers.** Presentation is Streamlit. Orchestration is FastAPI, Bedrock Agent, AgentCore Gateway, AgentCore Memory, and five Lambdas. Data is Redshift Serverless.

**Two request paths.** Agent path for natural language queries — three to six seconds, reasoning-first. Direct path for dashboard metrics — under one second, rendering-first. Pick the right path for each use case.

**The ReAct loop.** Reason, Act through Gateway to Lambda to Redshift, Observe, Reason again, Answer. Typically one to two turns.

**IAM permission chain.** Bedrock Agent Role to Gateway Role to Lambda Execution Roles to Redshift Data API. Read-only, scoped to the marts schema.

**Seven monitoring signals.** Bedrock over 10 seconds, Lambda over 30 seconds, Redshift over 5 seconds are your primary alert thresholds.

**Security deferred to production.** AgentCore Identity, VPC endpoints, WAF, Secrets Manager, PrivateLink — Phase 11, not needed for the lab.

[PAUSE 2s]

[POINT] The goal I set at the beginning of this section: you should be able to whiteboard this system for a client with no slides and no notes.

Can you draw three layers? Can you name nine components? Can you explain why there are two request paths? Can you trace the ReAct loop from question to answer? Can you describe the IAM chain?

If yes — you've got it.

[PAUSE 2s]

Section 6 is Agent Design. We're going to go deeper into how the Bedrock Agent is configured, how tools are defined, how the ReAct loop handles edge cases, and how to extend the system with new capabilities.

Let's go.

---

*End of Section 5 narration — 18 slides — approximately 45 minutes at 130 wpm*

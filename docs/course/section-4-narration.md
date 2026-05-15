# Section 4 — Data Foundation: Narration Script
**Course:** Finance AI Agents on AWS: Build Real Systems for FP&A
**Section duration:** ~50 minutes | 20 slides | 130 wpm target

---

## Module 4.1 — Why Data Is the Hard Part

---

**[SLIDE 1] Section 4 — Data Foundation (Section Divider)**

Welcome to Section 4 — Data Foundation. This is, in my experience, the section that separates the AI projects that actually ship from the ones that get stuck in a proof of concept forever. [PAUSE 2s]

We have five modules today. Module 4.1 sets expectations — finance data is genuinely hard, and I want you to go in with eyes open. Module 4.2 maps the source systems landscape at ACME: ERP, EPM, and CRM. Module 4.3 covers ingestion — how we get data from those source systems into Redshift Serverless. Module 4.4 is where we build the dbt transformation layer — staging, intermediate, and marts. And Module 4.5 is a practical AI readiness checklist you can use before you connect any AI tool to your data.

[POINT] Notice the green color scheme — that's Section 4's identity throughout this deck. Fifty minutes, five modules, and by the end you will have a concrete picture of the data layer that every AI agent in the ACME architecture depends on. Let's get into it.

---

**[SLIDE 2] The Reality: Finance Data Is Messy**

Let me start with the uncomfortable truth. [POINT to the green banner] Most AI finance projects fail here — not at the model layer. Not because GPT-4 or Claude isn't smart enough. Not because the architecture is wrong. They fail because the data underneath is not ready, and nobody planned for how hard that would be.

[CLICK] Look at these four challenges. First: three or more source systems. ERP, EPM, CRM — each exports in a different format, on a different schedule, owned by a different team. Coordinating those three pipelines alone is a project.

Second: five-plus years of schema changes. Every Finance system accumulates drift. Columns get renamed. Account codes get restructured when the company reorganizes. Entity IDs change after an acquisition. And almost nobody writes this down.

Third: company-specific codes. GL account 4210 means something very specific at ACME. The AI has no idea what that means unless you tell it. That mapping is critical.

[PAUSE 2s] Fourth: political sensitivity. Who can see entity-level P&L? Who sees headcount costs by department? Access control is not a nice-to-have — it is a real architecture constraint. Plan for these four things before you write a single line of AI code.

---

**[SLIDE 3] The ACME Data Landscape**

Now let me ground this in ACME specifically. [POINT to the dark banner at top] Repeat after me: AI tools query marts only — never staging or raw. We will come back to this rule many times in this section.

[CLICK] ACME has three source systems. The ERP — whether that's SAP, NetSuite, or Oracle in your organization — holds GL entries, invoices, and subscription records. Those are the actuals. The EPM system — Adaptive, Anaplan, Hyperion — holds budget and plan data. That is what the variance RCA tool compares actuals against. And the CRM holds customer data that enriches the AR aging and ARR analyses.

[POINT to the staging table chips] Each source system maps to one or more staging tables. The ERP gives us three: `stg_erp__gl_entries`, `stg_erp__invoices`, and `stg_erp__subscriptions`. The EPM gives us one: `stg_epm__plan_line`.

[POINT to the mart chips at the bottom] And five mart tables power the entire AI system. `mart_pl` for the P&L, `fct_arr` for the ARR waterfall, `mart_ar_aging` for receivables, `fct_revenue` for revenue recognition, and `fct_gl_entries` for ad hoc GL queries. Everything the AI does traces back to those five tables.

---

## Module 4.2 — Source Systems Landscape

---

**[SLIDE 4] Module 4.2 — Know Your Sources Before You Build (Module Intro)**

Module 4.2. [PAUSE 2s] The single most common mistake I see solution architects make is starting to build pipelines before they fully understand what they're pulling from. You cannot design a good data layer if you don't know the source.

[POINT] Four questions you need to answer before you build anything. Where does each data type live? What format does the system export in — is it CSV, JDBC, a REST API, a flat file drop? What is the refresh frequency — nightly, weekly, real-time? And critically: who owns each pipeline? Not who uses the data — who owns the pipeline. That's the person you're going to negotiate with.

The last question on this slide is the framing for this entire module: what are you negotiating versus what are you building? Because with source systems, you are almost always negotiating. You don't control the ERP. You don't control the EPM. You are a consumer. [PAUSE 2s] Let's look at each source system now.

---

**[SLIDE 5] Source 1 — ERP System**

The ERP is the system of record for all financial actuals. At ACME, this could be SAP, NetSuite, or Oracle — the specific product matters less than what it contains.

[CLICK] Three types of data live here. GL Entries: every journal entry ever posted to the general ledger. Account code, entity, amount, period, description. This is the raw material for your P&L analysis and variance RCA. [POINT] The key insight here is that a Chart of Accounts mapping is required. GL account 4210 is meaningless without that map. This is a Finance artifact — go get it before you build.

[CLICK] Invoices: every invoice issued to customers. Due date, amount, aging bucket, customer ID, payment status. This feeds your AR aging mart and links to CRM data for customer segmentation.

[CLICK] Subscription Records: active contracts with MRR, start and end dates, plan type, and expansion or churn events. [PAUSE 2s] This is critical — the subscription records table is the canonical source for ARR calculations. Finance owns the definition of what counts as ARR. Do not invent your own definition. Go confirm it with Finance before you build a single model.

---

**[SLIDE 6] Source 2 — EPM System**

The EPM — Enterprise Performance Management — is where Finance sets the plan. [PAUSE 2s] This system is the answer to the question: "what were we supposed to spend?" Adaptive Insights, Anaplan, Hyperion — the product varies, but the function is the same.

[POINT to the left card] What lives in EPM: annual budgets set each October or November. Monthly plan lines with account, entity, scenario, period, and amount. Rolling forecasts updated monthly or quarterly. Headcount plans and CAPEX schedules. Driver-based models with growth percentages and cost ratios.

[CLICK] ACME has one staging table from EPM: `stg_epm__plan_line`. [POINT] The key columns are `account_code`, `entity_id`, `fiscal_year`, `fiscal_period`, `scenario`, and `amount`. The `scenario` column distinguishes Budget from Forecast from Actuals.

[POINT to the right card] Why does this matter for AI? Because variance RCA — one of our core AI use cases — compares actuals against these plan line amounts. When the AI says "marketing spend was twelve percent over budget," it's comparing `fct_gl_entries` to `stg_epm__plan_line`. Without EPM data, you don't have variance. You just have spend. [PAUSE 2s] And Finance must define the formula: actuals minus budget. Not the other way around. Go confirm that.

---

**[SLIDE 7] The Architect's Job: Negotiate the Extract**

Here is the mindset shift I want you to make before you build anything. [POINT to the dark banner] You don't control these source systems. You negotiate the extract. [PAUSE 2s] Read that again.

[CLICK] What does "know before you start" mean? You need to know what format the system exports — CSV, JDBC, API. You need to know the refresh frequency and the latency SLA. T plus one means data from Monday arrives Tuesday morning. T plus two means Tuesday. Some systems only do weekly exports. You need to know who actually owns the pipeline — the IT team, the Finance team, or the vendor.

[CLICK] What do you negotiate? Full historical extract — minimum two years, because AI trend analysis needs at least eight quarters of data. Consistent column names across export versions. Null handling agreements — does an empty field mean zero or genuinely absent? And incremental versus full load, which affects S3 cost significantly.

[CLICK] When do you escalate? When the system owner refuses to provide journal-level GL entries. When the export is only weekly but your AI tool needs daily data. When account code mapping isn't available — that's a critical blocker, not a nice-to-have. [PAUSE 2s] These are real conversations. Have them early, not after you've built the pipeline.

---

## Module 4.3 — Get It In: Ingestion and Storage

---

**[SLIDE 8] Module 4.3 — Getting Data Into Redshift (Module Intro)**

Module 4.3. Now we actually move data. [PAUSE 2s]

This module covers five things. S3 as the raw landing zone — and I'll explain why we go through object storage first rather than loading directly from source to Redshift. The COPY command: the simple, powerful bridge from S3 into Redshift. Redshift Serverless and its RPU billing model — the economics matter for a finance team's AWS budget. The three-layer storage design inside a single Redshift database. And the cost reality at ACME scale.

[POINT] The philosophy here is: keep the ingestion pattern simple and auditable. CSV files in S3 with a prefix per source system and per date. You can always replay a load. You have a complete audit trail. Finance teams love auditability. This pattern delivers it.

Let's go.

---

**[SLIDE 9] The Ingestion Pattern: Source → S3 → Redshift**

[POINT to the four flow boxes] Source systems export nightly to S3. Redshift COPY loads from S3 into staging tables. That's the whole pattern. Deliberately simple.

[CLICK] Why S3 first? Three reasons. First, durability — S3 is eleven nines of durability, so your source data is safe even if the Redshift load fails. Second, replayability — if a dbt model has a bug, you can reload from S3 without re-extracting from the ERP. Third, cost separation — storage is cheap in S3; Redshift compute only runs during query time.

[POINT to the config table] At ACME, the batch runs nightly at 02:00 UTC. CSV format with a header row. The S3 bucket is `acme-finance-raw`. The prefix pattern is `/{source}/{YYYY-MM-DD}/`. So ERP data from May 8th lands at `s3://acme-finance-raw/erp/2026-05-08/`. The COPY command uses an IAM role — `RedshiftCopyRole` — that has `s3:GetObject` on that bucket and nothing else.

[POINT to the S3 prefix diagram] You can see the folder structure on the right. Clean, date-partitioned, one folder per source. [PAUSE 2s] When someone asks "what data ran on Tuesday?", you open that folder. Auditability built in.

---

**[SLIDE 10] Redshift Serverless: Why It Fits This Use Case**

Why Redshift Serverless instead of a provisioned cluster? [POINT to the four KPI cards] Let me walk through the economics.

RPU-based billing: Redshift Processing Units per second. You pay only when queries are running. Auto-pause after thirty minutes of idle — the cluster literally stops charging you. Cold start of roughly sixty seconds on the first query after a pause. And the resulting cost at ACME scale: approximately one hundred and eighty dollars per month.

[CLICK] That one-eighty number comes from about thirty query-hours per month at eight RPU average, plus S3 storage, plus one seat of dbt Cloud. For a Finance AI system serving a team of thirty analysts, that is an extremely attractive number.

[POINT to the ACME config table] The specific configuration: workgroup `acme-finance-dev`, database `dev`, schema `analytics_dev_marts`, base RPU of eight which scales up to 512 under load. VPC-private — no public endpoint, because Finance data never travels over the public internet.

[POINT to the trade-off column] Now the honest trade-offs. [PAUSE 2s] The cold start is real. If nobody has queried Redshift in thirty minutes and a Finance analyst opens the AI tool, they wait about sixty seconds. Design your AI tool to show a loading indicator. Consider a warm-up Lambda that pings Redshift at 7:45 AM UTC every weekday before the Finance team starts work. Cold start is the tradeoff for low cost. Know it going in.

---

**[SLIDE 11] Storage Design: Three Layers in One Database**

One Redshift database. Three schemas. Three very different purposes. [PAUSE 2s] This is the architecture that makes the AI layer clean.

[POINT to the first card] Raw slash Staging. Schema: `analytics_dev_staging`. Direct output of the COPY command. One-to-one with source CSV files. Column names match the source system — warts and all. No business logic. [POINT to the red rule] AI tools must not query this layer. Full stop. This is a dbt-only zone.

[POINT to the middle card] Intermediate. Schema: `analytics_dev_intermediate`. Business logic applied. Joins across sources. Derived fields calculated. Tables named for what they represent, not where they came from. [POINT to the orange rule] Not for direct consumption. Still dbt-only.

[POINT to the right card] Marts slash Analytics. Schema: `analytics_dev_marts`. Final analytics-ready tables. Denormalized for query performance. AI agents, Bedrock Lambda functions, analysts, and BI tools all query here — and only here. [POINT to the green rule] This is the AI query layer.

[POINT to the arrows] Data flows left to right: staging feeds intermediate, intermediate feeds marts. The AI sees only the rightmost layer. [PAUSE 2s] When you onboard a new AI tool, the first question is: which mart table does it query? If the answer is "a staging table," fix the design before you ship.

---

**[SLIDE 12] Cost Reality: Redshift Serverless at ACME Scale**

Let's make the cost concrete. [POINT to the table] One hundred and eighty dollars per month, broken down.

Redshift compute: approximately eighty-six dollars for about thirty query-hours at eight RPU average. Redshift storage: five dollars for two hundred gigabytes of managed storage — Redshift compresses well. S3 raw storage: twelve dollars for five hundred gigabytes of five years of historical CSVs. S3 data transfer for the nightly COPY loads: twenty-seven dollars. And one seat of dbt Cloud Team tier at fifty dollars. Total: one hundred and eighty dollars.

[CLICK] For context: a provisioned `dc2.large` single-node cluster runs about two hundred and twenty dollars per month just for compute, and you pay whether you query it or not. Serverless wins for this use case.

[POINT to the cold start card] The cold start advisory I already mentioned: thirty minutes idle, then pause. First query waits sixty seconds. Design for it. Show a loading state. Add a warm-up Lambda.

[POINT to the scaling card] But here's the upside: during month-end close when Finance is running fifteen queries simultaneously, Redshift auto-scales to 128 RPU without any manual intervention. The max RPU cap is set at 512 to prevent runaway cost. [PAUSE 2s] Heavy dbt runs go Sunday at 03:00 UTC when nobody else is querying. AI tool queries use a separate read-only Redshift user so dbt and the AI don't compete.

---

## Module 4.4 — Transform with dbt

---

**[SLIDE 13] Module 4.4 — dbt: The Layer That Makes AI Trustworthy (Module Intro)**

Module 4.4. This is my favorite module in this section. [PAUSE 2s]

dbt — data build tool — is the layer that transforms raw ingested data into something an AI can actually trust. And that word "trust" is doing a lot of work here. When the AI says "marketing spend was twelve percent over budget in Q1," Finance leadership needs to trust that number. dbt is how you earn that trust.

[POINT] Five things in this module. The three-layer model map — staging to intermediate to marts — with actual ACME table names at each layer. What the staging layer does and, critically, what it does not do. Why business logic lives in intermediate and not staging. The mart tables that AI actually queries. And the cardinal rule that we will repeat until it sticks: if your AI tool queries staging, you have a design problem.

dbt also gives you version control for your transformations, automated testing, and documentation. It makes your data layer auditable in the same way that code review makes your application layer auditable. For Finance, that matters enormously.

---

**[SLIDE 14] The dbt Model Map: Three Layers**

[POINT to the staging row] The staging layer is the cleaning station. One dbt model per source table. `stg_erp__gl_entries`, `stg_erp__invoices`, `stg_erp__subscriptions`, `stg_epm__plan_line`. Purpose: clean, rename, cast types. No business logic. [POINT to the right rule card] If you find yourself joining two tables in the staging layer, stop. Move that logic to intermediate.

[CLICK] [POINT to the intermediate row] The intermediate layer is where Finance's business rules live. `int_revenue`, `int_arr_movements`, `int_ar_aging`, `int_pl_components`. Join sources together here. Apply business rules — what accounts count as revenue? What's the formula for ARR? Calculate derived fields. Name things for what they represent. [PAUSE 2s] This layer exists specifically so that business logic is defined once, in one place, and tested.

[CLICK] [POINT to the marts row] The marts layer is what the AI queries. `mart_pl`, `fct_arr`, `mart_ar_aging`, `fct_revenue`, `fct_gl_entries`. Denormalized. Performant. Pre-aggregated where sensible.

[POINT to the dark banner] "If your AI tool queries staging, you have a design problem." [PAUSE 2s] I'm going to say that a lot. Write it down.

---

**[SLIDE 15] Staging Layer: Clean, Rename, Cast**

Let's go one level deeper into staging. [POINT to the banner] Purpose: produce clean, consistently named columns from raw source files. One model per source table. That's the entire mandate.

[CLICK] `stg_erp__gl_entries`. The ERP exports with column names like `acct_cd` — that becomes `account_code`. The posted date arrives as a string — we cast it to a DATE type. We filter out voided entries. We add a `_source` metadata column so downstream models know where the row came from. No joins. No business logic.

[CLICK] `stg_erp__invoices`. We rename `inv_id` to `invoice_id`. We derive `aging_days` as today minus the due date — that's a simple calculation, not business logic. We standardize status codes so "PAID", "paid", and "Paid" all become the same value.

[CLICK] `stg_erp__subscriptions`. We parse `movement_type` from an event code — that's a lookup, not a business rule. We derive an `is_active` flag. We standardize plan tier names.

[CLICK] `stg_epm__plan_line`. We rename `scen` to `scenario`. We cast `fiscal_period` to an integer. We filter to only Budget and Forecast scenarios, dropping internal scenarios that Finance doesn't want in the analysis. [PAUSE 2s]

Notice: none of these staging models join to another table. That boundary is sacred.

---

**[SLIDE 16] Intermediate Layer: Business Rules Applied**

Now we cross the line into business logic territory. [POINT to the banner] The intermediate layer applies Finance's rules, joins across sources, and calculates derived fields. Only dbt accesses this layer.

[CLICK] `int_revenue`. Sources: `stg_erp__gl_entries` and `stg_erp__invoices`. We filter GL entries to revenue accounts — the 4000 range in ACME's Chart of Accounts. We join to invoices to confirm revenue recognition. We calculate the recognized versus deferred split. We apply entity-level allocation rules where revenue is shared across entities.

[CLICK] `int_arr_movements`. Source: `stg_erp__subscriptions`. We classify each subscription event as new, expansion, churn, or contraction. We calculate the MRR delta per period. We derive ARR as MRR times twelve. We flag reactivations separately from new logos. [PAUSE 2s] This model is the engine behind the ARR waterfall chart.

[CLICK] `int_ar_aging`. Source: `stg_erp__invoices`. We assign aging buckets: current, 30, 60, 90, and 90-plus days. We flag disputed invoices. We calculate DSO — Days Sales Outstanding — at the customer segment level.

[CLICK] `int_pl_components`. Sources: GL entries and EPM plan lines. [POINT] This is the critical join. We match actuals to plan by account, entity, and period. We calculate variance as actuals minus budget. We classify: favorable or unfavorable. We apply the P&L hierarchy from Revenue down to EBITDA. This model powers the entire variance RCA AI tool.

---

**[SLIDE 17] Marts Layer: What AI Queries**

[POINT to the green banner] Rule: AI tools, Bedrock Lambda functions, and analysts query marts only. This is where everything we've built so far materializes into something useful.

[CLICK] `mart_pl`. The full P&L by entity and quarter. Sourced from `int_pl_components`. AI use case: P&L variance RCA and trend queries. Key dimensions: `entity_id`, `fiscal_year`, `fiscal_quarter`, `pl_category`. Key metrics: actuals, budget, variance in dollars and percent, and prior year for comparison.

[CLICK] `fct_arr`. The ARR waterfall by movement type. Sourced from `int_arr_movements`. AI use case: ARR waterfall analysis and churn investigation. Dimensions: `customer_id`, `period`, `movement_type`, `plan_type`. Metrics: ARR delta, ending ARR, new logo ARR, churn ARR.

[CLICK] `mart_ar_aging`. AR by aging bucket and customer segment. AI use case: AR aging queries and DSO monitoring. The AI can answer "what percentage of our AR is more than sixty days overdue in the enterprise segment?"

[PAUSE 2s] `fct_revenue` and `fct_gl_entries` round out the five. Revenue recognition details and ad hoc GL queries respectively. [POINT] Notice that `fct_gl_entries` sources directly from staging — it's the one case where a mart reads staging, because GL entries are already clean enough. That's an exception, not a pattern. Every other mart goes through intermediate.

---

## Module 4.5 — AI Readiness Assessment

---

**[SLIDE 18] Module 4.5 — Is Your Data Ready for AI? (Module Intro)**

Module 4.5. The practical gut-check before you connect anything to an AI tool. [PAUSE 2s]

This module is built around a ten-item checklist. Think of it as a pre-flight. You wouldn't take off without running the pre-flight. You shouldn't connect a Bedrock agent to your data layer without running this checklist.

[POINT] Four categories of readiness: quality, pipeline, coverage and governance, and performance and security. Each of the ten items has a specific pass or fail criterion — not a vague "seems okay."

I've seen teams skip this checklist and ship an AI tool that gives wrong variance numbers because the staging refresh failed silently and nobody noticed. I've seen AI tools give confident answers based on data that was three days stale. [PAUSE 2s] Both are worse than not shipping the AI tool at all. Finance leadership will lose trust in the entire AI program based on one bad answer.

Run the checklist. Three slides, eight minutes. Let's go.

---

**[SLIDE 19] AI Readiness Checklist: 10 Must-Pass Criteria**

[POINT] Ten items. Two columns. Walk through each one before you sign off on the data layer.

[CLICK] Quality first. Item one: marts exist and are tested. dbt tests — not_null, unique, accepted_values — must be passing on all key columns. If your CI/CD pipeline is red, the data layer is not ready. Item two: column names are self-documenting. `fiscal_year`, not `fy`. `entity_id`, not `eid`. The AI uses column names as context when generating SQL. Abbreviated names produce worse results. Item three: no NULLs in primary dimensions. `account_code`, `entity_id`, `fiscal_period` — all non-null, all the time, in all mart tables.

[CLICK] Pipeline items. Item four: refresh schedule documented. The AI tool and the team consuming it must know that data is current as of last night at 02:00 UTC, not "recently." Item five: row counts validated against source. If the ERP exports 50,000 GL entries, your staging table must have 50,000 rows. Reconcile daily.

[CLICK] Coverage. Item six: historical data available, minimum two years. Trend analysis needs eight-plus quarters. [PAUSE 2s] Governance: item seven — variance formula defined and agreed. Finance must sign off. Item eight: access controls on staging. The AI service role has SELECT on marts only.

[CLICK] Performance and governance. Item nine: Redshift query performance under three seconds for mart queries. Run EXPLAIN ANALYZE on your top ten AI tool queries. Add SORTKEY and DISTKEY where needed. Item ten: schema change process defined. When EPM adds a column, who updates dbt? Who tests? Who notifies AI tool owners? Define the process before you need it.

---

**[SLIDE 20] Section 4 Recap — Next: Reference Architecture**

Let's land this section. [PAUSE 2s] Nine takeaways.

Finance data is messy by nature — three or more sources, schema drift, political access constraints. Plan for this explicitly, not as an afterthought.

You negotiate the extract. Understand format, frequency, and ownership before you build a single pipeline.

S3 to Redshift COPY is the ingestion pattern. Nightly batch, per-source prefixes, auditable. Simple beats clever here.

Redshift Serverless costs approximately one hundred and eighty dollars per month at ACME scale. Cold start is the tradeoff. Design your AI tool UI accordingly.

[CLICK] The dbt three-layer model: staging cleans, intermediate applies business logic, marts serve AI. Crossing these boundaries breaks the architecture.

Staging is 1-to-1 with source. Rename, cast, filter. No business logic crosses this boundary.

Intermediate is where Finance's rules live. Joins, derivations, variance calculations — all here, once, tested.

Marts are denormalized, performant, access-controlled. The only layer AI tools should query.

[PAUSE 2s] And run the ten-item AI Readiness Checklist before connecting any agent or Lambda to your data layer.

[POINT to the green link] Next up: Section 5 — Reference Architecture. That's where we wire all of this into a working Bedrock-powered system. See you there.

---

*End of Section 4 narration script*
*Total estimated duration: ~50 minutes at 130 wpm*
*Slide count: 20 | Module count: 5*

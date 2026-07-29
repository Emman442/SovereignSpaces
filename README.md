# SovereignSpaces

Decentralized, Self-Governing Communities Powered by On-Chain AI Consensus.

SovereignSpaces is a decentralized social platform where communities set their own plain-English rules ("Constitutions") and delegate content moderation to AI models running directly on-chain. Built on GenLayer, SovereignSpaces replaces centralized platform moderation and biased human mod teams with verifiable, deterministic-from-nondeterministic AI consensus.

---

## How It Works

1. Plain-English Constitutions: Founders establish communities with rules written in natural language (e.g., "No self-promotion, keep technical discussions focused on Web3 engineering").
2. On-Chain Web Fetching & Moderation: When reported posts cross the community threshold, GenLayer validators fetch the post content (or scrape target URLs/images via `gl.nondet.web.get`) and evaluate it against the constitution.
3. Consensus-Driven AI Verdicts: Using GenLayer's Equivalence Principle (`gl.eq_principle.prompt_non_comparative`), multiple validator nodes independently run LLM prompts and agree on structured JSON verdicts (`violation`, `no_violation`, or `inconclusive`).
4. Appeals & Governance: Authors can appeal hidden posts by providing contextual justifications, triggering higher-scrutiny AI evaluations. Community members can vote on amendments to change the constitution over time.

---

## Features

- Autonomous AI Moderation: No manual mod queues. AI validators evaluate text and linked web pages against exact constitutional clauses.
- Immutable Verdict Reasoning: Every moderation decision includes 2-3 sentences of AI reasoning and the specific rule cited, permanently stored on-chain.
- Two-Tier Appeals System: Supports `simple` or `supermajority` strictness thresholds for secondary reviews.
- Constitutional Governance: On-chain voting for proposed constitutional amendments.
- Role Management: Founder, Moderator, and Member roles with granular permission handling (banning, manual hides, appointing mods).

---

## Architecture & Tech Stack

### Smart Contract (Backend)
- Framework: `py-genlayer` (GenLayer Intelligent Contracts)
- Language: Python
- Core Modules: `gl.nondet.exec_prompt`, `gl.nondet.web.get`, `gl.eq_principle`

### Web Frontend
- Framework: Next.js / React (TypeScript)
- State & Data Fetching: TanStack Query (React Query)
- Styling: Tailwind CSS
- Blockchain Integration: Custom GenLayer JS SDK integration / Web3 providers

---

## Project Structure

```text
sovereign-spaces/
├── contracts/
│   └── sovereign_spaces.py    # GenLayer Intelligent Contract
├── frontend/
│   ├── components/            # UI Components (PostCard, AppealModal, Governance)
│   ├── hooks/                 # Web3 & Mutation hooks (useSubmitEvidence, useAppeal)
│   ├── pages/                 # Next.js routes
│   └── styles/                # Tailwind / Global CSS
└── README.md
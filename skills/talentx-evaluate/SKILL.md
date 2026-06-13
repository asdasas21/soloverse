---
name: TalentX Evaluate
description: AI-driven talent evaluation through real trial scenarios. Use when evaluating developer capabilities, generating skill portraits, or certifying talent through hackathon/code review/case study performance. Triggers on requests about talent assessment, skill evaluation, developer profiling, or capability certification.
---

# TalentX Evaluate

## Overview
TalentX evaluates developers and entrepreneurs through real trial scenarios (hackathons, code reviews, case studies). It observes behavioral data during challenges and generates a six-dimension trait portrait using an EMA (Exponential Moving Average) engine, then certifies candidates at three levels (C1/C2/C3).

## When to Use This Skill
- Evaluating a developer's code submission or project
- Generating a capability portrait from behavioral data
- Certifying talent at C1/C2/C3 levels
- Comparing candidates based on trial performance
- Providing feedback on trial submissions

## Core Evaluation Dimensions

### Five Scoring Dimensions (BARS)
| Dimension | Weight (Hackathon) | Description |
|-----------|-------------------|-------------|
| D1 Technical Implementation | 40% | Code quality, system stability, performance |
| D2 Solution Completeness | 20% | Feature completion, documentation, maintainability |
| D3 Innovation & Problem Solving | 20% | Problem definition, solution creativity, scalability |
| D4 Collaboration & Communication | 5% | Task allocation, communication efficiency |
| D5 AI Tool Application | 15% | AI coding, prompt engineering, API integration |

### Six Portrait Traits (EMA Engine)
1. **好奇心 (Curiosity)**: New tool exploration, skill diversity, question depth
2. **靠谱 (Reliability)**: Deadline adherence, code quality consistency, communication
3. **事实洁癖 (Fact-checking)**: Data verification, source citation, accuracy
4. **多元化思维 (Diverse Thinking)**: Cross-domain knowledge, alternative approaches
5. **忍受不确定性 (Uncertainty Tolerance)**: Adaptability, decision-making under ambiguity
6. **低ego高自驱 (Low Ego, High Drive)**: Feedback acceptance, self-improvement, initiative

### Certification Levels
| Level | Score | Requirements |
|-------|-------|-------------|
| C1 认证级 | ≥60 | ≥2 trial types, ≥5 events |
| C2 专业级 | ≥75 | ≥3 trial types, including 1 advanced |
| C3 专家级 | ≥88 | ≥4 trial types, including 2 advanced |

## Evaluation Process
1. Collect behavioral events from trial (commits, interactions, submissions)
2. Score each event on D1-D5 dimensions
3. Apply EMA engine: base score → implicit behavior correction → time decay
4. Map D1-D5 scores to six portrait traits
5. Compute certification score and level
6. Generate feedback and recommendations

## Usage Examples
- "Evaluate this code submission for the hackathon trial"
- "Generate a portrait for candidate based on their trial history"
- "What certification level does this candidate qualify for?"
- "Compare these two candidates' trial performance"

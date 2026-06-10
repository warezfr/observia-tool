---
name: recommendation-approach
description: User prefers starting with descriptive/prescriptive recommendations (A/B/C), with automatic remediation (D) as future feature
metadata:
  type: feedback
---

Start with recommendations that are descriptive (identify problems) and prescriptive (propose concrete actions), with optional semi-automatic remediation (generate scripts/configs to apply manually). Full automatic remediation (D) should be planned as future feature enhancement, not initial scope.

**Why:** User wants to build foundation first before automating remediation actions. Phased approach reduces initial complexity and risk.

**How to apply:** In the initial design, focus on analysis + actionable recommendations + script generation. Include automatic remediation in future roadmap but not in v1 scope.

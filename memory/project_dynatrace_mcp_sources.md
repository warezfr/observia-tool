---
name: dynatrace-mcp-sources
description: Official Dynatrace MCP server repositories for SaaS and Managed environments
metadata:
  type: reference
---

Official Dynatrace MCP server implementations:
- **SaaS MCP**: https://github.com/dynatrace-oss/dynatrace-mcp
- **Managed MCP**: https://github.com/dynatrace-oss/dynatrace-managed-mcp

**Why:** These are the authoritative MCP servers that expose Dynatrace APIs and data through the Model Context Protocol, enabling AI agents to query metrics, entities, problems, logs, and topology.

**How to apply:** Use these as dependencies/references when building the MCP client integration layer. Check their README for available tools, authentication methods, and configuration patterns.

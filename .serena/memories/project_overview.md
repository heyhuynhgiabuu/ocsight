# ocsight Project Overview

## Purpose
ocsight is an OpenCode ecosystem observability platform - a focused CLI tool for analyzing, visualizing, and exporting usage data from OpenCode AI coding sessions. It reads OpenCode's session/message storage and provides insights into tool usage, costs, performance patterns.

## Core Features
- **Analytics**: Session analysis, cost optimization insights, tool efficiency metrics
- **Export**: JSON, CSV, Markdown reports with filtering capabilities  
- **MCP Server**: Real-time analytics via Model Context Protocol
- **Performance**: Processes 17,400+ messages in <2 seconds with caching
- **Cross-platform**: Go binary wrapper for macOS, Linux, Windows distribution

## Tech Stack
- **Runtime**: Bun + TypeScript (ES modules)
- **CLI Framework**: Commander.js for command parsing
- **Output**: cli-table3 + chalk for structured table display
- **Distribution**: Go binary wrapper + Homebrew tap
- **Build**: TypeScript compilation + esbuild bundling
- **Testing**: Bun test framework

## Architecture Philosophy
**Focused simplicity**: Unlike OpenCode (40MB platform), ocsight is a specialized analytics tool with flat structure. No packages/, no plugin system, no web interface - just fast data analysis and reporting.
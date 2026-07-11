# GPAT-003 - Developmental Review Package

**Status:** Implementation in Progress  
**Runtime posture:** Controlled operational proof  
**Human boundary:** Mandatory

## Purpose

GPAT-003 governs the internal assembly support for the Developmental Review Package used during Developmental Editing.

## Authorized Input

- approved source manuscript
- inherited imprint and style-guide set
- current developmental stage and gate context
- governed source evidence already assembled by J Merrill Publishing

## Required Outputs

- Editorial Letter support
- Working Manuscript anchor support
- Revision Blueprint support
- Publisher Recommendation support
- Cross-reference support
- provenance and quality evidence

## Routing Policy

- preferred route: `jm1-editorial-devline-primary`
- current executable fallback: `jm1-pub-diagnostic-primary`
- direct Anthropic runtime: not approved for production use

## Human Review

GPAT output may assist analysis and drafting. GPAT may not:

- approve the package
- release the package
- contact the author
- close the gate
- advance the stage
- change the governing imprint or style guide

## Kill Switch

If the governed route is uncertified, disabled, or incomplete, the package remains human-controlled and the runtime fails closed.

## Evidence Requirements

Each controlled proof retains:

- prompt key/version
- provider and route
- style-guide set
- correlation IDs
- execution-log references
- human reviewer and publisher boundary

## Current Proof State

The Intentional Leader - Volume I serves as the first controlled proof title. Runtime promotion is live; Claude deployment remains externally quota-blocked; Azure OpenAI fallback remains the current executable governed path.

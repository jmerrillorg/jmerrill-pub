# 07 - Active Title Readback

Read-only Dataverse snapshot:

- generated: `2026-08-22T01:28:39.281Z`
- titles read: 250
- editorial stages read: 30
- assets read: 250
- intakes read: 31
- opportunities read: 5
- gates read: 16
- source artifact: `/tmp/jmp_wave_b_active_readback.json`

Observed examples:

| Author | Title | Canonical Stage | Substage | Mapping | Waiting On | System Attention | Next Action | Runtime Ready |
|---|---|---|---|---|---|---|---|---|
| Atta Boateng | Untitled | DATA_GAP | DATA_GAP | CANONICAL_MAPPING_CONFLICT | Author | TRANSITION_CONFLICT | Resolve lifecycle mapping conflict | false |
| Jackie Smith, Jr. | 'TIL DEATH DO US PART | DATA_GAP | DATA_GAP | CANONICAL_MAPPING_CONFLICT | JMP | TRANSITION_CONFLICT | Resolve lifecycle mapping conflict | false |
| Jackie Smith, Jr. | Establishing Glory: The Praise and Worship Handbook (2nd Edition) | 10 - Post-Publication Title & Author Relationship | 10A - Post-Publication Stewardship | CANONICAL_MAPPING_CONTEXTUAL | JMP | NONE | Maintain post-publication stewardship | true |
| Jackie Smith, Jr. | Establishing Glory: The Relationship Handbook | DATA_GAP | DATA_GAP | CANONICAL_MAPPING_INCOMPLETE | JMP | DATA_GAP | Resolve lifecycle mapping conflict | false |

The readback intentionally exposes conflict and incomplete mapping instead of silently assigning a guessed lifecycle state.

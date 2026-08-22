# 02 - Stage Contracts

Each canonical stage/substage in `registry.ts` defines:

- entry conditions;
- exit conditions;
- source of truth;
- work definition;
- source artifact types;
- output artifact types;
- quality gate;
- author gate requirement;
- commercial gate requirement;
- allowed waiting owners;
- allowed/disallowed transitions;
- allowed parallel work;
- terminal/persistent behavior;
- system attention behavior.

The focused guard verifies that every stage and substage has the universal contract fields and that the ten founder-approved stages exist exactly once.

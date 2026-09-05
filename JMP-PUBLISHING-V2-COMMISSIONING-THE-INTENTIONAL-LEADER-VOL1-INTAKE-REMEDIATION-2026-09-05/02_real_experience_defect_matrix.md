# Real Experience Defect Matrix

| DEFECT_ID | SURFACE | EXPECTED | ACTUAL | ROOT_CAUSE | SEVERITY | REPAIR | REGRESSION_TEST |
|---|---|---|---|---|---|---|---|
| INT-EXP-01 | V2 Publishing Engagement | Human-facing real-title surface | No adequate V2 title surface | Portal snapshot omitted V2 Intake authority | High | Added V2 readback to Publisher and Author Operating Centers | UAT Stage 02/readback proofs |
| INT-EXP-02 | Author Intake | Five fields with save, resume, review, submit | No governed response experience | No V2 response entity/command/UI | Critical | Added response entity, server command, write guards, and complete UI | Dev 30/30 plus UAT 39/39 |
| INT-EXP-03 | Commissioning/UAT readback | Real V2 truth in both centers | Readback incomplete | Application layer did not query V2 clean-room records | High | Added UAT-bound server readback and publisher snapshot | Author UI acceptance and real-title readback |
| INT-EXP-04 | Status/Waiting On/next action | Stage 02, Author, Complete Intake | Generic or incorrect attention | Presentation derived from legacy projection | High | Derived display from V2 Intake evidence | Waiting/next-action assertions |
| INT-EXP-05 | Environment provenance | JM1-Test / Commissioning UAT | JM1-Dev leakage | Transition plugin wrote a literal label | High | Added environment authority table and resolver | Environment authority and leakage proofs |

Defects total: 5. Repairs implemented: 5. Remaining experience defects before human completion: 0.

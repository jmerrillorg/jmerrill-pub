# Hold / Resume Semantics

Governed holds suppress active wait accumulation. Calendar duration may remain reportable as context, but active wait duration is not shown as authoritative during a hold. Resume creates a new timer only when a governed resume or responsibility-transfer timestamp is present.

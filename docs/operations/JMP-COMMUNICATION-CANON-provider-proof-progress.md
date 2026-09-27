# Publishing Presentation and Provider Readback

Packet: JMP-COMMUNICATION-CANON-REGRESSION-001
Status: IN_PROGRESS; not a closure certificate.

PR 881 deployed renderer 1.0.1 to web, relay, and the persistent Function runtime.
PR 883 registered the bounded mailbox readback and repaired exact-title stage
selection. Web and Function deployment readbacks passed at
87b4384f8dd60384139e5416ad69c76921ba6ca5.

The native production mailbox read completed both bounded queries: 11 messages
from the current canonical author address and 23 title-subject messages. Native
HTML and attachment metadata confirms the September 21 Developmental delivery
with Whole - Edited Manuscript.docx and Whole - Editorial Review Guide.txt.
No approval is inferred. A September 23 author email requests a new author
correspondence address; that source must be reconciled before claiming exhaustive
absence of a Developmental response. No author identity mutation was performed.

One explicitly authorized internal presentation check was submitted through the
existing enterprise relay to publishing@jmerrill.one, with the same canonical CC
and reply mailbox. No active author was contacted. Fixed idempotency key:
JMP-COMMUNICATION-CANON-REGRESSION-001:internal-render-proof:v1.
Ledger record: 301f7bc4-2e6e-42c5-a9b1-7fa443984459.

The relay returned accepted with renderer/template hashes but no provider ID.
Investigation found that enterprise transport inspected the initial ACS operation
instead of awaiting completion. This repair requires Succeeded plus an immutable
provider ID before recording acceptance. Transport ambiguity preserves the
reservation; it does not make the command automatically retryable.

Inquiry, agreement, approved-response, and enterprise relay producers now share
one completed-ACS receipt helper. Inquiry and agreement responses also expose
the generated renderer/template metadata for their producing workflows. This
does not itself prove that every upstream workflow durably persists those fields.

Production has no FORM_NOTIFICATION_TO override and therefore uses the internal
Publishing mailbox default. That internal Graph/Resend fallback now rejects any
other recipient. Its boundary test is part of the web deployment guards. It
cannot become an author-facing raw send path by changing configuration.

The explicitly requested system-sender census is limited to seven days and at
most 50 native HTML presentations, with truncation/completeness surfaced. It is
separate from immutable author/title business correlation and makes no decisions.

The existing internal proof must not be resent while its outcome is ambiguous.
The read-only mailbox endpoint can retrieve its native HTML only for the fixed
internal subject and exclusively contained Publishing mailbox recipients.
Remaining proof: actual mailbox copy, rendering contract, legacy-path containment,
full recent communication census, complete version persistence, and Whole's
separate onboarding/lifecycle reconciliation. Formatting-only resend remains NO.

Private native evidence is retained under Developer/evidence, not committed here.
Protected original checkouts and title workspaces are untouched.

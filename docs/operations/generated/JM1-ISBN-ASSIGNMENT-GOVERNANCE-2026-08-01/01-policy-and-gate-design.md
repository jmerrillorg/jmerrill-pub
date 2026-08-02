# Policy and Gate Design

## Assignment Point

ISBN assignment occurs at the Production Metadata Gate, after title, author/contributor presentation, imprint, edition, format, rights holder, and publication intent are confirmed.

## Author-Review Proofs

Author-review proofs are not distributed products. They may omit ISBN or show ISBN pending according to the J Merrill Publishing copyright-page standard.

The Intentional Leader Interior Layout author-review proof remains released and awaiting author response. Its ISBN-pending state is correct.

## Final Distribution Proofs

Final distribution-ready files require assigned ISBNs before certification:

| Format | ISBN treatment |
| --- | --- |
| Paperback | Separate ISBN |
| Hardcover | Separate ISBN |
| EPUB | Separate ISBN under JM1 policy |
| Large Print paperback | Separate ISBN |
| Large Print hardcover | Separate ISBN |
| Audiobook | Separate ISBN when distributed as an ISBN-identified product |
| Revised/new edition | New ISBN |
| Unchanged reprint | Usually retains existing ISBN |

## Gate

Gate name: ISBN_ASSIGNMENT_READY

Required fields:

- canonical title;
- subtitle, if approved;
- author/contributors;
- title ID;
- imprint;
- format;
- edition;
- rights holder;
- publication status;
- proposed publication date;
- duplicate ISBN check;
- proposed next available ISBN.

Approval options:

- APPROVE_ASSIGNMENT;
- CORRECT_METADATA;
- HOLD_FORMAT;
- CANCEL_PRODUCT.

After APPROVE_ASSIGNMENT, the ISBN is locked to title, edition, format, and imprint.

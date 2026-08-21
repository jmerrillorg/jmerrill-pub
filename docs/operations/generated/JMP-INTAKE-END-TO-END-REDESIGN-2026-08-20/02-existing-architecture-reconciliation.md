# Existing Architecture Reconciliation

Reused components:

- Intake entity: `jm1_publishingintakes`
- Dataverse API adapter: `lib/publishing/intake/dataverse.ts`
- Current `/join` route: `app/api/publishing/intake/route.ts`
- Manuscript workspace/upload: `lib/publishing/intake/manuscriptUpload.ts`
- Internal notification: `lib/publishing/intake/internalNotification.ts`
- Author acknowledgment: `lib/publishing/intake/authorAcknowledgment.ts`
- Dead-letter/recovery queues: `lib/publishing/intake/deadLetter.ts`
- Publisher Operating Center server module: `lib/server/publisher-operating-center.ts`
- Editorial Review initialization: `autoInitializeOutsideInquiryEditorialReview`

No third-party form platform or second permanent intake database was introduced.


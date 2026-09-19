# Correlation Authority Contract

The smallest source correction establishes this fail-closed order:

1. Parse and retrieve the supplied publishing engagement.
2. Parse and retrieve the supplied canonical contact.
3. Parse and retrieve the supplied canonical title.
4. Compare the engagement's canonical author ID with the supplied contact ID as normalized GUIDs.
5. Compare the engagement's canonical title ID with the supplied title ID as normalized GUIDs.
6. Compare the engagement's lifecycle ID with the supplied lifecycle ID as normalized GUIDs.
7. Retrieve the lifecycle and require both engagement and lifecycle to be at `06_ONBOARDING`.
8. For post-activation commands, compare the onboarding record's author, title, and lifecycle IDs to the same supplied tuple.

No author name, email, title text, price, time proximity, latest-record selection, or single-author/title assumption participates in correlation.

Bounded denials in the prepared source are `UNKNOWN_ENGAGEMENT`, `UNKNOWN_AUTHOR`, `UNKNOWN_TITLE`, `UNKNOWN_LIFECYCLE`, `AUTHOR_ENGAGEMENT_MISMATCH`, `TITLE_ENGAGEMENT_MISMATCH`, `WORK_ENGAGEMENT_MISMATCH`, and `ENGAGEMENT_NOT_AT_STAGE_06`.

The prior synthetic engagement-creation fallback was removed from the Phase 6 plug-in. Test engagement creation remains the responsibility of the governed legacy activation fixture, eliminating a production `Create` requirement on `jmpv2_publishingengagement`.

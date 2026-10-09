# Jackie-title production guard acceptance

The existing authenticated VERIFY_REVIEW_GUARDS mode also executes fixed Stage 13/15 fixtures through the canonical preflight and publication readback evaluators. No caller title, source, provider, URL, authority or fixture is accepted. Local provider/public-page functions make no network call, submit no edition, and register no identifier. No stage event is published, persisted or dispatched.

Stage 13 proves a complete synthetic evidence snapshot passes, while missing proof identity, pending agreement and mismatched approved checksum fail. The missing-ID regression previously let two absent artifact IDs compare equal; a nonblank proof artifact ID is now mandatory alongside the existing exact match.

Stage 15 proves exact synthetic provider receipt/edition/public-ISBN matching, a bounded read retry with backoff, wrong-edition rejection before subsequent reads, and propagating state remaining pending. This is not current provider access, publication, purchase, natural scheduling or title advancement proof.

The probe remains EFFECT_FREE_SYNTHETIC_NOT_TITLE_ACCEPTANCE. Live invocation verifies the deployed canonical evaluator code with bounded fixtures, not a commissioned customer journey or all-stage dispatch. Existing review, wait and broad stage workers remain disabled. All real Jackie-title source, spend and editorial gates remain unchanged; non-Jackie authors remain manual.

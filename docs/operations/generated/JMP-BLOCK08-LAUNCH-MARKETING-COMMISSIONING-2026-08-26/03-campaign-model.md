# Campaign Model

Last Verified: 2026-08-26

## Title Marketing Campaign

Block 08 creates/reuses one governed `TITLE_MARKETING_CAMPAIGN` for each title/release scope.

Required campaign identity includes:

- campaign ID;
- title ID;
- edition ID;
- release manifest ID;
- campaign type;
- objective;
- audience;
- start, launch, and end dates;
- launch window type;
- status;
- scope version;
- budget;
- owner/supporting owner;
- UTM campaign;
- release-health dependency;
- campaign health.

## Lifecycle

Supported states:

`PLANNING`, `CAMPAIGN_PREP`, `PRELAUNCH_ACTIVE`, `LIVE_LAUNCH_ACTIVE`, `POST_LAUNCH_ACTIVE`, `LAUNCH_WINDOW_COMPLETE`, `PERFORMANCE_REVIEW_COMPLETE`, `EVERGREEN_HANDOFF_COMPLETE`, `LAUNCH_CYCLE_COMPLETE`

Exception states:

`BLOCKED`, `CAMPAIGN_AT_RISK`, `RELEASE_HEALTH_HOLD`, `AUTHOR_ACTION_REQUIRED`, `SYSTEM_ATTENTION_REQUIRED`, `SCOPE_CHANGE_REQUIRED`, `PAUSED`, `CANCELLED`


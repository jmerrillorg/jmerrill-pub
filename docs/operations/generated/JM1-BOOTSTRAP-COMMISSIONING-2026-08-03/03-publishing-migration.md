# Publishing Migration

## Commissioned Publishing Workflows

Count: 12.

- Editorial packages.
- Developmental Editing.
- Copyediting.
- Proofreading.
- Interior Layout.
- Cover Review.
- Publication Approval.
- Author Activation.
- Author Recovery.
- Approval Requests.
- Reminder Messages.
- Release Notifications.

## Active Path

PublishingDispatchService uses `buildAuthorReviewNotificationCopy`.

The author package notification engine uses `renderAuthorCommunicationEmail`.

The author communication brand renderer delegates to `renderJm1EnterpriseCommunication`.

ACS remains the delivery provider.

## Legacy Path

Active commissioned Publishing App Service legacy HTML renderers: 0.

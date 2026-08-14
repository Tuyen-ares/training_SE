# US-F07-02 – Mark as read

## User Story

As an **Employee, Asset Manager, or Admin**,\
I want to **mark my notifications as read**,\
so that **I can distinguish viewed content from unviewed content**.

## Acceptance Criteria

- AC-US-F07-02-01: Given an unread notification belongs to the user, when marking it as read, then its status becomes read and the read time is recorded.
- AC-US-F07-02-02: Then the unread count decreases accordingly.
- AC-US-F07-02-03: Given a notification is already read, when marking it again, then the system does not create an inconsistent state.
- AC-US-F07-02-04: Given the notification belongs to another user, then the system rejects the request and does not change data.

## Applicable Business Rules

`BR-NOT-02`, `BR-NOT-03`.

## Related Functional Requirements

`FR-F07-02`, `FR-F07-03`.

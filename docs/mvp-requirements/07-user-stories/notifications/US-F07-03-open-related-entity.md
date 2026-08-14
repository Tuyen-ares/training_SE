# US-F07-03 – Open the related entity

## User Story

As an **Employee, Asset Manager, or Admin**,\
I want to **open the related business entity**,\
so that **I can view the notification's full context**.

## Acceptance Criteria

- AC-US-F07-03-01: Given a valid logical reference and a user with permission to view the entity, when opening it, then the system navigates to the corresponding content.
- AC-US-F07-03-02: Given a notification has no reference, then the system still allows its content to be viewed but does not provide incorrect navigation.
- AC-US-F07-03-03: Given the entity no longer exists, then the system reports that it was not found without breaking the notification list.
- AC-US-F07-03-04: Given the user lacks permission to view the entity, then the system rejects access even though the user owns the notification.

## Applicable Business Rules

`BR-NOT-01`, `BR-NOT-02`, `BR-RBAC-01`.

## Related Functional Requirements

`FR-F07-04`.

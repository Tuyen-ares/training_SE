# US-F04-02 – Approve a detail

## User Story

As an **Asset Manager or Admin**,\
I want to **approve a pending asset in a request**,\
so that **the equipment is reserved for the requester before handover**.

## Acceptance Criteria

- AC-US-F04-02-01: Given the detail is `PENDING` and the asset is `AVAILABLE`, when approving it, then the detail becomes `APPROVED` and the asset becomes `RESERVED`.
- AC-US-F04-02-02: Then the system records the person and time that processed the detail.
- AC-US-F04-02-03: Given the asset is no longer `AVAILABLE`, when approving the detail, then the system reports a conflict and the detail remains `PENDING`.
- AC-US-F04-02-04: Given two people concurrently approve details reserving the same asset, then only one operation succeeds.
- AC-US-F04-02-05: Given any part of the operation fails, then both the detail and asset retain their pre-operation statuses.

## Applicable Business Rules

`BR-BOR-03`, `BR-BOR-06`, `BR-BOR-07`, `BR-BOR-08`, `BR-BOR-10`.

## Related Functional Requirements

`FR-F04-02`, `FR-F04-05`, `FR-F04-06`.

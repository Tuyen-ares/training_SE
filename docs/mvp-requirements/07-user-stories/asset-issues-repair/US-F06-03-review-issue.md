# US-F06-03 – Review an issue

## User Story

As an **Asset Manager or Admin**,\
I want to **confirm or reject a pending report**,\
so that **only genuine issues affect the asset status**.

## Acceptance Criteria

- AC-US-F06-03-01: Given the issue is `REPORTED`, when confirming it, then the issue becomes `CONFIRMED` and the asset becomes `DAMAGED`.
- AC-US-F06-03-02: Given the issue is `REPORTED`, when rejecting it, then the issue becomes `REJECTED` and the asset does not become `DAMAGED` because of that issue.
- AC-US-F06-03-03: Then the system records the processor and update time according to the baseline data.
- AC-US-F06-03-04: Given the issue is no longer `REPORTED`, when reviewing it again, then the system rejects the request.
- AC-US-F06-03-05: Given updating the issue or asset fails, then no partial status is saved.
- AC-US-F06-03-06: Given the asset is confirmed damaged at return, then the history records the return, the issue is `CONFIRMED`, and the asset is `DAMAGED`.

## Applicable Business Rules

`BR-ISS-01`, `BR-ISS-02`, `BR-ISS-03`, `BR-ISS-08`.

## Related Functional Requirements

`FR-F06-03`, `FR-F06-04`.

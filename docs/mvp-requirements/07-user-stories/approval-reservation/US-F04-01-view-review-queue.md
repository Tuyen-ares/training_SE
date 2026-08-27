# US-F04-01 – View the review queue

## User Story

As an **Asset Manager or Admin**,\
I want to **view requests and details requiring review**,\
so that **I can approve or reject the correct items**.

## Acceptance Criteria

- AC-US-F04-01-01: Given the user has permission, when opening the list, then the system displays requests within the permitted scope.
- AC-US-F04-01-02: Then the system shows the overall status and the status of each detail.
- AC-US-F04-01-03: Then the user can identify which details remain `PENDING`.
- AC-US-F04-01-04: Given the user lacks permission to view all requests, then the system does not provide other users' data.
- AC-US-F04-01-05: Then filter hỗ trợ `PENDING` (mặc định), `ALL`, `APPROVED` và `REJECTED`; khi chọn `ALL`, request có detail `PENDING` được hiển thị trước các request còn lại và vẫn phân trang theo request.

## Applicable Business Rules

`BR-BOR-03`, `BR-BOR-04`, `BR-RBAC-01`.

## Related Functional Requirements

`FR-F04-01`.

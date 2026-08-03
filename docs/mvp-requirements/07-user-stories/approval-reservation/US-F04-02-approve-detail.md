# US-F04-02 – Duyệt một detail

## User Story

Là một **user có quyền duyệt**,  
tôi muốn **duyệt một asset đang chờ trong phiếu**,  
để **giữ thiết bị đó cho người yêu cầu trước khi bàn giao**.

## Acceptance Criteria

- AC-US-F04-02-01: Given detail `PENDING` và asset `AVAILABLE`, when duyệt, then detail thành `APPROVED` và asset thành `RESERVED`.
- AC-US-F04-02-02: Then hệ thống ghi người và thời điểm xử lý detail.
- AC-US-F04-02-03: Given asset không còn `AVAILABLE`, when duyệt, then hệ thống báo xung đột và detail vẫn `PENDING`.
- AC-US-F04-02-04: Given hai người đồng thời duyệt các detail giữ cùng asset, then chỉ một thao tác thành công.
- AC-US-F04-02-05: Given bất kỳ phần nào của thao tác thất bại, then detail và asset đều giữ trạng thái trước thao tác.

## Business Rules áp dụng

`BR-BOR-03`, `BR-BOR-06`, `BR-BOR-07`, `BR-BOR-08`, `BR-BOR-10`.

## Functional Requirements liên quan

`FR-F04-02`, `FR-F04-05`, `FR-F04-06`.

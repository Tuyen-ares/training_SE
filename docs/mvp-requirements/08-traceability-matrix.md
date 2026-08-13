# Traceability Matrix

Ma trận truy vết ở mức Business Requirement → Functional Requirement → Feature → User Story. Business Rule được tham chiếu trực tiếp trong từng story và không ép quan hệ 1–1.

| Business Requirement | Functional Requirements | Feature | User Stories |
|---|---|---|---|
| BREQ-01 | FR-F01-01..07 | F01 | US-F01-01..05 |
| BREQ-02 | FR-F02-01..09 | F02 | US-F02-01..08 |
| BREQ-03 | FR-F03-01..05 | F03 | US-F03-01..04 |
| BREQ-04 | FR-F04-01..06 | F04 | US-F04-01..04 |
| BREQ-05 | FR-F05-01..05 | F05 | US-F05-01..05 |
| BREQ-06 | FR-F06-01..08 | F06 | US-F06-01..06 |
| BREQ-07 | FR-F07-01..05 | F07 | US-F07-01..03 |
| BREQ-08 | FR-F08-01..12 | F08 | US-F08-01..08 |

## Functional Requirement có điều kiện

| FR | Story | Trạng thái |
|---|---|---|
| FR-F02-08 | US-F02-07 | Đã chốt permission phù hợp và loại trừ RESERVED/BORROWED. |
| FR-F02-09 | US-F02-08 | Tra cứu QR thuộc F02, không phải kiểm kê. |
| FR-F06-01 | US-F06-01 | Chỉ người đang mượn hoặc user có permission issue theo phạm vi được cấp. |
| FR-F06-08 | US-F06-06 | FAILED chuyển asset về DAMAGED. |
| FR-F07-05 | US-F07-01 | Event/recipient đã được chốt trong requirement. |

## Liên kết chéo quan trọng

- US-F03-04 sử dụng FR-F04-05 vì thu hồi làm thay đổi trạng thái tổng.
- US-F05-03 sử dụng FR-F04-05 vì hoàn trả cuối cùng có thể làm phiếu `COMPLETED`.
- F05 và F06 giao nhau tại BR-ISS-08 về tài sản hỏng khi hoàn trả.
- F01/RBAC là điều kiện truy cập xuyên suốt F02–F08.

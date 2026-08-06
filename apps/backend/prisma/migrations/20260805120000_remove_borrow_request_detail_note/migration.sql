-- MVP keeps one note on the borrow request header; detail-level notes are not part of the contract.
ALTER TABLE `borrow_request_details`
    DROP COLUMN `note`;

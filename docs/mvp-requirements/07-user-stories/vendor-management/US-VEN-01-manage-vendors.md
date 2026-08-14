# US-VEN-01 – Manage shared vendors

## User Story

As a user with the appropriate Vendor permission, I want to manage a shared
vendor catalog so that I can select vendors for repairs and preserve history
when a vendor stops working with the company.

## Acceptance Criteria

- Vendors can be searched, paginated, and filtered by Active/Inactive with
  `vendor.view`.
- An active vendor can be created with `vendor.create`; an empty contact is
  stored as `null`.
- Vendor information can be edited and the vendor can be activated/deactivated
  with `vendor.update`.
- An inactive vendor does not appear in the default repair selector but remains
  visible in Vendor Management and issue history.
- Vendor deletion is not available in the MVP; a vendor that no longer works
  with the company can be deactivated to preserve the record and issue history.
- Runtime checks only the permission code and does not infer access from the
  role name.

# Permission Code Registry

Đây là contract mã quyền mà backend route/use case và frontend cùng sử dụng.
Bảng `permissions` là dữ liệu runtime và phải được migration/seed đồng bộ với danh
sách này. Không có wildcard; mỗi dòng là một code độc lập.

Snapshot chuẩn hiện tại: **54 permission codes**.

## Dashboard

dashboard.view

## Departments

department.view
department.create
department.update
department.delete

## Brands

brand.view
brand.create
brand.update
brand.delete

## Asset types

asset_type.view
asset_type.create
asset_type.update
asset_type.delete

## Asset models

asset_model.view
asset_model.create
asset_model.update
asset_model.delete

## Assets

asset.view
asset.create
asset.update
asset.delete
asset.checkout
asset.checkin

## Asset issues

asset_issue.report
asset_issue.view
asset_issue.create
asset_issue.update
asset_issue.close

## Vendors

vendor.view
vendor.create
vendor.update

## Borrow requests

borrow_request.create
borrow_request.view_own
borrow_request.view_all
borrow_request.update_own
borrow_request.cancel_own
borrow_request.approve
borrow_request.reject

## Borrow histories

borrow_history.view_own
borrow_history.view_all

## Users

user.view
user.create
user.update
user.delete

## Roles and role assignment

role.view
role.create
role.update
role.assign

`role.delete` is intentionally not implemented in this version.

role.delete

## Permission catalogue

permission.view

Permission records are read-only in the application. The following write codes remain deferred and are not exposed by routes:

The current phase does not expose `permission.create`, `permission.update`, or
`permission.delete`. Permission records and `role_permissions` are managed by
seed/migration.

permission.create
permission.update
permission.delete

## Registration review

user_registration.review

## Essential administration set

The lockout guard uses the explicit set below and never a role name:

`user.view`, `user.create`, `user.update`, `user.delete`, `role.view`, `role.create`, `role.update`, `role.assign`, `permission.view`, `user_registration.review`.

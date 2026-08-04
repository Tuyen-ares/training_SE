-- Preserve the existing role ID so all user_roles and role_permissions mappings remain intact.
-- This is idempotent: after a successful run no `staff` row remains to update.
-- A pre-existing manually-created `employee` role makes the unique constraint fail
-- deliberately, so an operator can reconcile duplicate role mappings instead of
-- silently leaving users assigned to the legacy role.
UPDATE roles
SET name = 'employee'
WHERE name = 'staff';

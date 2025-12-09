# Database Migrations

> 📚 **Note**: Complete migration documentation has been moved to [`docs/database/migrations.md`](../docs/database/migrations.md)

## Quick Reference

Migration files in this folder:
- `001_initial_schema.sql` - Initial database schema
- `002_add_expenses_table.sql` - Expenses table
- `003_add_rls_policies.sql` - RLS policies (REQUIRED)
- `004_add_user_email_unique_constraint.sql` - Email uniqueness constraint (OPTIONAL - recommended)
- `005_add_catalogue_tables.sql` - Adds categories and brands tables, updates products (NEW)
- `006_add_catalogue_rls_policies.sql` - Adds RLS policies for categories and brands (NEW)

**Run migrations in order: 001 → 002 → 003 → 004 (optional) → 005 → 006**

For detailed instructions, see [Database Migrations Guide](../docs/database/migrations.md)


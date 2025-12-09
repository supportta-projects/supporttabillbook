# Documentation Structure

This document explains the organization of all documentation in the `docs/` folder.

## Folder Structure

```
docs/
├── README.md                          # Main documentation index
├── DOCUMENTATION_STRUCTURE.md         # This file
├── getting-started/
│   ├── setup.md                       # Complete setup guide
│   └── installation.md                # Installation instructions
├── database/
│   ├── migrations.md                  # Database migrations guide
│   └── rls-policies.md                # RLS policies setup and troubleshooting
├── setup/
│   └── superadmin.md                  # Superadmin user creation guide
└── development/
    └── implementation-summary.md      # Implementation details and summaries
```

## Documentation Categories

### Getting Started (`getting-started/`)
**Purpose**: Help new users get the project up and running

- **setup.md**: Complete step-by-step setup guide
  - Installation
  - Environment configuration
  - Database setup
  - First user creation
  - Troubleshooting

- **installation.md**: Detailed installation instructions
  - Prerequisites
  - Installation steps
  - Verification
  - Common issues

### Database (`database/`)
**Purpose**: Database-related documentation

- **migrations.md**: Database migration guide
  - Migration files overview
  - How to run migrations
  - Migration details
  - Verification queries
  - Troubleshooting

- **rls-policies.md**: Row Level Security policies
  - RLS overview
  - Setup instructions
  - Policy explanations
  - Testing RLS
  - Troubleshooting

### Setup & Configuration (`setup/`)
**Purpose**: Configuration and setup guides

- **superadmin.md**: Superadmin user creation
  - Multiple methods to create superadmin
  - Step-by-step instructions
  - Verification
  - Troubleshooting
  - Security best practices

### Development (`development/`)
**Purpose**: Development and implementation documentation

- **implementation-summary.md**: Implementation details
  - Completed features
  - File structure
  - Security features
  - UI/UX features
  - Next steps
  - Testing checklist

## Root Documentation Files

### `README.md` (Root)
- Project overview
- Quick start
- Links to detailed documentation
- Project structure overview

### `docs/README.md`
- Complete documentation index
- Quick navigation
- Links to all documentation sections
- External resources

## Migration Notes

The following files were moved to `docs/`:

- `SETUP.md` → `docs/getting-started/setup.md`
- `IMPLEMENTATION_SUMMARY.md` → `docs/development/implementation-summary.md`
- `migrations/README.md` → `docs/database/migrations.md` (with new README.md pointing to docs)
- `scripts/SETUP_RLS_POLICIES.md` → `docs/database/rls-policies.md`
- `scripts/CREATE_SUPERADMIN_INSTRUCTIONS.md` → `docs/setup/superadmin.md`

## Adding New Documentation

When adding new documentation:

1. **Choose the right category**:
   - User guides → `getting-started/` or `setup/`
   - Database docs → `database/`
   - Development docs → `development/`
   - API docs → `development/` (or create `api/` folder)

2. **Update the index**:
   - Add link in `docs/README.md`
   - Update relevant category section

3. **Follow naming conventions**:
   - Use lowercase with hyphens: `my-guide.md`
   - Be descriptive: `creating-tenants.md` not `guide.md`

4. **Include in root README**:
   - Add link in root `README.md` if it's important for quick start

## Documentation Standards

- **Clear headings** - Use descriptive headings
- **Code examples** - Include working code examples
- **Step-by-step** - Break complex tasks into steps
- **Troubleshooting** - Include common issues and solutions
- **Links** - Link to related documentation
- **Updates** - Keep documentation up to date with code changes

## Quick Links

- [Main Documentation Index](./README.md)
- [Setup Guide](./getting-started/setup.md)
- [Database Migrations](./database/migrations.md)
- [Superadmin Setup](./setup/superadmin.md)


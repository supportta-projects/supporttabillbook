# Installation Guide

## Prerequisites

- **Node.js** 18+ installed
- **npm** or **yarn** package manager
- A **Supabase** account and project
- **Git** (optional, for version control)

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd supporttabillbook
```

Or download and extract the project files.

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Supabase client libraries
- Zustand (state management)
- TanStack Query (data fetching)

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Where to find these values:**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **API**
3. Copy the values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Database Setup

See the [Database Migrations Guide](../database/migrations.md) for complete database setup instructions.

**Quick setup:**
1. Go to Supabase Dashboard > SQL Editor
2. Run `src/lib/db/schema.sql`
3. Run migrations in order: `001`, `002`, `003`

### 5. Verify Installation

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - you should see the login page.

## Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Create superadmin user (if script exists)
npm run create-superadmin
```

## Project Structure

```
supporttabillbook/
├── src/
│   ├── app/              # Next.js pages (App Router)
│   ├── components/        # React components
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilities & configs
│   ├── providers/        # React providers
│   ├── store/            # State management
│   └── types/            # TypeScript types
├── public/               # Static assets
├── migrations/           # Database migrations
├── scripts/              # Setup scripts
├── docs/                 # Documentation
└── package.json          # Dependencies
```

## Next Steps

After installation:
1. Complete database setup (see [Setup Guide](./setup.md))
2. Create your first superadmin user
3. Start developing!

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
# Use a different port
npm run dev -- -p 3001
```

### Environment Variables Not Loading

- Make sure `.env.local` is in the root directory
- Restart the development server after adding/changing variables
- Check that variable names start with `NEXT_PUBLIC_` for client-side access

### TypeScript Errors

```bash
# Check for TypeScript errors
npx tsc --noEmit
```

### Module Not Found Errors

```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
```

## Support

For more help, see:
- [Setup Guide](./setup.md)
- [Main Documentation](../README.md)


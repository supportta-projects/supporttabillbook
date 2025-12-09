/**
 * Script to create a superadmin user
 * Run with: npm run create-superadmin
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), '.env.local')

// Use known values from .env.local (since parsing is having issues)
// These should match your .env.local file
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://foinykpziaunhwmytmhr.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvaW55a3B6aWF1bmh3bXl0bWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE5NTY5NywiZXhwIjoyMDgwNzcxNjk3fQ.tElyJKZnLIwExZcgMNO9Y9WoRdSRPw_5sqOAtD15jMw'

// Try to load from file if not already set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://foinykpziaunhwmytmhr.supabase.co') {
  try {
    config({ path: envPath })
    const envContent = readFileSync(envPath, 'utf-8')
    const lines = envContent.split(/\r?\n/)
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const equalIndex = trimmed.indexOf('=')
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim()
          const value = trimmed.substring(equalIndex + 1).trim()
          if (key && value) {
            process.env[key] = value
          }
        }
      }
    }
  } catch (error) {
    // Use hardcoded values if file reading fails
    console.log('Using environment variables from script')
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('\nEnvironment check:')
console.log('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? `✓ Set (${supabaseUrl.substring(0, 30)}...)` : '✗ Missing')
console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Set' : '✗ Missing')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Missing Supabase environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createSuperadmin() {
  const email = 'superadmin@gmail.com'
  const password = 'superadmin123'
  const fullName = 'Super Admin'

  try {
    console.log('🔍 Checking for superadmin user...\n')

    // Step 1: Check if user exists in Auth first
    const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Error listing users:', listError)
      process.exit(1)
    }

    const existingAuthUser = authUsers?.find(u => u.email === email)
    
    if (existingAuthUser) {
      console.log('✓ User exists in Supabase Auth')
      console.log(`  User ID: ${existingAuthUser.id}`)
      console.log(`  Email: ${existingAuthUser.email}\n`)
      
      // Check if user exists in users table
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', existingAuthUser.id)
        .single()

      if (dbError && dbError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('❌ Error checking users table:', dbError)
        process.exit(1)
      }

      if (dbUser) {
        console.log('✓ User exists in users table')
        console.log('  Full Name:', dbUser.full_name)
        console.log('  Role:', dbUser.role)
        console.log('  Active:', dbUser.is_active)
        console.log('\n✅ Superadmin user is already in the database!')
        console.log('\nLogin credentials:')
        console.log(`  Email: ${email}`)
        console.log(`  Password: ${password}`)
        return
      } else {
        console.log('⚠️  User exists in Auth but NOT in users table')
        console.log('Creating user record in users table...\n')
        
        // Create user record
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: existingAuthUser.id,
            email: email,
            full_name: fullName,
            role: 'superadmin',
            is_active: true,
          })
          .select()
          .single()

        if (insertError) {
          console.error('❌ Error creating user record:', insertError)
          console.error('Details:', JSON.stringify(insertError, null, 2))
          process.exit(1)
        }

        console.log('✓ User record created in users table')
        console.log('\n✅ Superadmin user created successfully!')
        console.log('\nLogin credentials:')
        console.log(`  Email: ${email}`)
        console.log(`  Password: ${password}`)
        console.log(`  Role: superadmin`)
        return
      }
    }

    // User doesn't exist in Auth - create it
    console.log('⚠️  User does NOT exist in Supabase Auth')
    console.log('Creating user in Auth and database...\n')

    // Step 2: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        role: 'superadmin',
      },
    })

    if (authError) {
      console.error('❌ Error creating user in Auth:', authError)
      console.error('Details:', JSON.stringify(authError, null, 2))
      process.exit(1)
    }

    if (!authData.user) {
      console.error('User creation failed: No user data returned')
      process.exit(1)
    }

    console.log('✓ User created in Auth')
    console.log(`  User ID: ${authData.user.id}`)

    // Step 2: Create user record in users table
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role: 'superadmin',
        is_active: true,
      })

    if (userError) {
      console.error('Error creating user record in users table:', userError)
      
      // Try to clean up - delete the auth user if users table insert failed
      await supabase.auth.admin.deleteUser(authData.user.id)
      console.error('Cleaned up: Deleted auth user due to users table error')
      process.exit(1)
    }

    console.log('✓ User record created in users table')
    console.log('\n✅ Superadmin user created successfully!')
    console.log('\nLogin credentials:')
    console.log(`  Email: ${email}`)
    console.log(`  Password: ${password}`)
    console.log(`  Role: superadmin`)
    console.log(`  User ID: ${authData.user.id}`)

  } catch (error) {
    console.error('Unexpected error:', error)
    process.exit(1)
  }
}

// Run the script
createSuperadmin()
  .then(() => {
    console.log('\n✓ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })


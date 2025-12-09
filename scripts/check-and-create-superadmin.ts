/**
 * Script to check and create superadmin user if it doesn't exist
 * Run with: npm run create-superadmin
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
const envPath = resolve(process.cwd(), '.env.local')
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://foinykpziaunhwmytmhr.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvaW55a3B6aWF1bmh3bXl0bWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE5NTY5NywiZXhwIjoyMDgwNzcxNjk3fQ.tElyJKZnLIwExZcgMNO9Y9WoRdSRPw_5sqOAtD15jMw'

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
  console.log('Using environment variables from script')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkAndCreateSuperadmin() {
  const email = 'superadmin@gmail.com'
  const password = 'superadmin123'
  const fullName = 'Super Admin'

  try {
    console.log('🔍 Checking for superadmin user...\n')

    // Step 1: Check if user exists in Auth
    const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      process.exit(1)
    }

    const existingAuthUser = authUsers?.find(u => u.email === email)
    
    if (existingAuthUser) {
      console.log('✓ User exists in Supabase Auth')
      console.log(`  User ID: ${existingAuthUser.id}`)
      console.log(`  Email: ${existingAuthUser.email}`)
      
      // Step 2: Check if user exists in users table
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', existingAuthUser.id)
        .single()

      if (dbError && dbError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error checking users table:', dbError)
        process.exit(1)
      }

      if (dbUser) {
        console.log('\n✓ User exists in users table')
        console.log('  Full Name:', dbUser.full_name)
        console.log('  Role:', dbUser.role)
        console.log('  Tenant ID:', dbUser.tenant_id || 'None')
        console.log('  Branch ID:', dbUser.branch_id || 'None')
        console.log('  Active:', dbUser.is_active)
        console.log('\n✅ Superadmin user is already in the database!')
        return
      } else {
        console.log('\n⚠️  User exists in Auth but NOT in users table')
        console.log('Creating user record in users table...')
        
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
    } else {
      console.log('⚠️  User does NOT exist in Supabase Auth')
      console.log('Creating user in Auth and database...\n')
      
      // Create user in Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
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
        console.error('❌ User creation failed: No user data returned')
        process.exit(1)
      }

      console.log('✓ User created in Supabase Auth')
      console.log(`  User ID: ${authData.user.id}`)

      // Create user record in users table
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          full_name: fullName,
          role: 'superadmin',
          is_active: true,
        })
        .select()
        .single()

      if (insertError) {
        console.error('❌ Error creating user record in users table:', insertError)
        console.error('Details:', JSON.stringify(insertError, null, 2))
        
        // Try to clean up
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
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

// Run the script
checkAndCreateSuperadmin()
  .then(() => {
    console.log('\n✓ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })


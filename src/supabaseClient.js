import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://adegnkmewqwxhhnyjcpp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZWdua21ld3F3eGhobnlqY3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjg3MTIsImV4cCI6MjA4MzgwNDcxMn0.id92x3quPYyM-_RAkqgVv6xhXgj7EVn5ZxjBGHh4ORU'

export const supabase = createClient(supabaseUrl, supabaseKey)

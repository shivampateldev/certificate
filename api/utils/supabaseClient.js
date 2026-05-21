const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://yukzelssqufzegoyjlcx.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1a3plbHNzcXVmemVnb3lqbGN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzc3MTAsImV4cCI6MjA5MjUxMzcxMH0.t7c0kpgB5LS-SgEKxY0mUukrVgoweMUYrdNsBJNYqgA';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };

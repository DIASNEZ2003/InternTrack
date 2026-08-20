import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://khlhuaehfjdujgajwhyp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtobGh1YWVoZmpkdWpnYWp3aHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2OTMxMjIsImV4cCI6MjEwMTI2OTEyMn0.719ddIzqXq68lboHDxKeNNeGm1hs5fhXOgPFzit83fA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
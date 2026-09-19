/**
 * Seeds the tracks table. Run with:
 *   VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx seed_tracks.ts
 * Uses the service role key so it bypasses RLS.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, key);

const tracks = [
  {
    name: "EdTech",
    description: "Innovate the future of learning. Build solutions to detect at-risk students and track industry-ready skills."
  },
  {
    name: "On-Demand Local Services",
    description: "Empower local communities. Create hyperlocal platforms for fragmented services and build trust through verification."
  },
  {
    name: "Healthcare",
    description: "Transform patient care. Secure fragmented medical records and enable real-time emergency resource discovery."
  }
];

async function seed() {
  const { error: clearError } = await supabase
    .from('tracks')
    .delete()
    .not('id', 'is', null);
  if (clearError) throw clearError;

  const { error } = await supabase.from('tracks').insert(tracks);
  if (error) throw error;

  tracks.forEach(t => console.log(`Added track: ${t.name}`));
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

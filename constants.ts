import { Vase } from './types';

export const TOTAL_VASES = 60;

const REGIONS = ['East Asia', 'Mediterranean', 'West Africa', 'Mesoamerica', 'Northern Europe', 'Persia'];
const PERIODS = ['Neolithic', 'Bronze Age', 'Iron Age', 'Classical', 'Ming Dynasty', 'Modern'];

// Deterministic pseudo-random helper (simple implementation)
let seed = 1234;
const random = () => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(random() * arr.length)];

// =========================================================================
// INSTRUCTIONS FOR DATA INTEGRATION:
// 1. Place your 'frontend_master_db.json' in the 'public' folder.
// 2. Uncomment the fetch logic below and remove the mock generation block.
// =========================================================================

/* 
// Example of how to load your real data:
export let REAL_DB: Vase[] = [];

// Call this in App.tsx using useEffect
export const loadData = async () => {
  const response = await fetch('/frontend_master_db.json');
  const data = await response.json();
  REAL_DB = data;
  return data;
}
*/

// =========================================================================
// MOCK DATA GENERATION (Delete this block when using real data)
// =========================================================================
export const MOCK_DB: Vase[] = Array.from({ length: TOTAL_VASES }).map((_, i) => {
  const id = `vase_${i + 1}`;
  
  // Distribute somewhat evenly on a sphere for the globe visual
  const lat = (random() * 180) - 90;
  const lon = (random() * 360) - 180;

  // Use seed-based URLs instead of ID-based to ensure availability
  const seedBase = `latent_kiln_${id}`;
  
  return {
    id,
    region: getRandomItem(REGIONS),
    period: getRandomItem(PERIODS),
    globe_coordinates: { x: lon, y: lat },
    assets: {
      image_url: `https://picsum.photos/seed/${seedBase}/300/400`,
      parts: {
        neck: `https://picsum.photos/seed/${seedBase}_neck/150/100`, 
        body: `https://picsum.photos/seed/${seedBase}_body/200/200`,
        base: `https://picsum.photos/seed/${seedBase}_base/150/80`,
      },
    },
  };
});

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
  const tracksCol = collection(db, 'tracks');
  
  // Clear existing
  const snapshot = await getDocs(tracksCol);
  for (const d of snapshot.docs) {
    await deleteDoc(doc(db, 'tracks', d.id));
  }
  
  // Add new
  for (const track of tracks) {
    await addDoc(tracksCol, track);
    console.log(`Added track: ${track.name}`);
  }
  process.exit(0);
}

seed();

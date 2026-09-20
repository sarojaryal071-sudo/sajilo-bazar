// Demo data for local/dev use - a handful of approved, bookable workers
// across every service category, plus a couple of bookings in end-states
// (completed+reviewed, cancelled) so the manual-booking screens have real
// data to render against. Safe to re-run: every write is a find-or-create
// or an idempotent upsert, never a blind INSERT.
//
// Does NOT seed a requested/accepted/in_progress booking - those states
// should only ever come from actually running the booking flow.

import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { pool } from './pool.js';
import * as authModel from '../modules/auth/auth.model.js';

const SEED_PASSWORD = 'Seed@12345';
const SEED_CUSTOMER_PHONE = '+9779800000001';
const REAL_CUSTOMER_EMAIL = 'sarojaryal071@gmail.com';
const PLACEHOLDER_DOC_URL = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

const WORKERS = [
  {
    category: 'plumbing',
    fullName: 'Bikash Shrestha',
    phone: '+9779810000001',
    email: 'bikash.shrestha.seed@example.com',
    isOnline: true,
    ratingAvg: 4.8,
    jobsCompletedCount: 42,
    serviceAreaLabel: 'Baneshwor, Kathmandu',
    latitude: 27.6939,
    longitude: 85.3352,
    bio: 'Licensed plumber with 8 years of experience fixing leaks and installations across Kathmandu.',
    services: [
      { name: 'Pipe leak repair', price: 800 },
      { name: 'Tap and faucet installation', price: 600 },
      { name: 'Drain unclogging', price: 500 },
    ],
  },
  {
    category: 'plumbing',
    fullName: 'Suman Tamang',
    phone: '+9779810000002',
    email: 'suman.tamang.seed@example.com',
    isOnline: false,
    ratingAvg: 3.9,
    jobsCompletedCount: 8,
    serviceAreaLabel: 'Patan, Lalitpur',
    latitude: 27.6588,
    longitude: 85.3247,
    bio: 'Reliable plumbing help for small repairs and installations.',
    services: [{ name: 'Pipe leak repair', price: 700 }],
  },
  {
    category: 'electrical',
    fullName: 'Anita Gurung',
    phone: '+9779810000003',
    email: 'anita.gurung.seed@example.com',
    isOnline: true,
    ratingAvg: 4.6,
    jobsCompletedCount: 30,
    serviceAreaLabel: 'Baneshwor, Kathmandu',
    latitude: 27.6945,
    longitude: 85.3361,
    bio: 'Certified electrician specializing in home wiring and safety inspections.',
    services: [
      { name: 'Wiring inspection', price: 1200 },
      { name: 'Switch and socket repair', price: 400 },
    ],
  },
  {
    category: 'electrical',
    fullName: 'Rajesh Khadka',
    phone: '+9779810000004',
    email: 'rajesh.khadka.seed@example.com',
    isOnline: false,
    ratingAvg: 4.1,
    jobsCompletedCount: 15,
    serviceAreaLabel: 'Bhaktapur',
    latitude: 27.671,
    longitude: 85.4298,
    bio: 'Electrical repairs and installations, same-day service in Bhaktapur.',
    services: [
      { name: 'Fan and light installation', price: 900 },
      { name: 'Wiring inspection', price: 1100 },
    ],
  },
  {
    category: 'cleaning',
    fullName: 'Sita Magar',
    phone: '+9779810000005',
    email: 'sita.magar.seed@example.com',
    isOnline: true,
    ratingAvg: 4.9,
    jobsCompletedCount: 65,
    serviceAreaLabel: 'Jawalakhel, Lalitpur',
    latitude: 27.6701,
    longitude: 85.3159,
    bio: 'Detail-oriented home cleaning with eco-friendly products.',
    services: [
      { name: 'Deep home cleaning', price: 1500 },
      { name: 'Bathroom cleaning', price: 600 },
      { name: 'Kitchen cleaning', price: 700 },
    ],
  },
  {
    category: 'cleaning',
    fullName: 'Kamala Rai',
    phone: '+9779810000006',
    email: 'kamala.rai.seed@example.com',
    isOnline: false,
    ratingAvg: 3.5,
    jobsCompletedCount: 5,
    serviceAreaLabel: 'Kirtipur',
    latitude: 27.6767,
    longitude: 85.2833,
    bio: 'Affordable cleaning services for apartments and small homes.',
    services: [{ name: 'Bathroom cleaning', price: 550 }],
  },
  {
    category: 'carpentry',
    fullName: 'Dipesh Lama',
    phone: '+9779810000007',
    email: 'dipesh.lama.seed@example.com',
    isOnline: true,
    ratingAvg: 4.3,
    jobsCompletedCount: 20,
    serviceAreaLabel: 'Boudha, Kathmandu',
    latitude: 27.7215,
    longitude: 85.3616,
    bio: 'Custom furniture and repair work, from shelving to door fixes.',
    services: [
      { name: 'Furniture assembly', price: 900 },
      { name: 'Door and window repair', price: 700 },
    ],
  },
];

async function findUserByPhone(phone) {
  const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  return rows[0] || null;
}

// Prefers the real "Saroj Aryal" account (matched by email, then by name)
// if one already exists from actual signup, so seeded bookings attach to
// the account the user is actually testing with. Only falls back to
// creating a fresh seed-only account if no such account exists yet.
async function findOrCreateCustomer() {
  let { rows } = await pool.query(
    "SELECT * FROM users WHERE email = $1 AND role = 'customer' LIMIT 1",
    [REAL_CUSTOMER_EMAIL]
  );
  if (!rows[0]) {
    ({ rows } = await pool.query(
      "SELECT * FROM users WHERE full_name = 'Saroj Aryal' AND role = 'customer' LIMIT 1"
    ));
  }
  if (rows[0]) return rows[0];

  console.log('No existing "Saroj Aryal" customer found - creating a seed-only customer account.');
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  return authModel.createUser({
    fullName: 'Saroj Aryal',
    phone: SEED_CUSTOMER_PHONE,
    email: null, // never attach a fabricated row to the user's real email
    passwordHash,
    role: 'customer',
  });
}

async function findOrCreateWorkerUser({ fullName, phone, email }) {
  const existing = await findUserByPhone(phone);
  if (existing) return existing;
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  return authModel.createUser({ fullName, phone, email, passwordHash, role: 'worker' });
}

// latitude/longitude are seeded regardless of isOnline, matching what a real
// "go online" toggle would eventually save - lets a tester flip a seeded
// worker online from the UI and immediately be matchable, no separate
// location step needed.
async function upsertWorkerProfile(
  userId,
  { isOnline, ratingAvg, jobsCompletedCount, serviceAreaLabel, latitude, longitude, bio }
) {
  await pool.query(
    `UPDATE worker_profiles
     SET is_online = $2, verification_status = 'approved', rating_avg = $3,
         jobs_completed_count = $4, service_area_label = $5,
         latitude = $6, longitude = $7, bio = $8, updated_at = now()
     WHERE user_id = $1`,
    [userId, isOnline, ratingAvg, jobsCompletedCount, serviceAreaLabel, latitude, longitude, bio]
  );
}

async function upsertWorkerService(workerId, serviceId, price) {
  await pool.query(
    `INSERT INTO worker_services (worker_id, service_id, price, is_active)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (worker_id, service_id) DO UPDATE SET price = EXCLUDED.price, is_active = true`,
    [workerId, serviceId, price]
  );
}

async function ensureVerificationDocument(workerId, docType) {
  const { rows } = await pool.query(
    'SELECT id FROM verification_documents WHERE worker_id = $1 AND doc_type = $2 LIMIT 1',
    [workerId, docType]
  );
  if (rows[0]) return;
  await pool.query(
    `INSERT INTO verification_documents (worker_id, doc_type, file_url, status)
     VALUES ($1, $2, $3, 'approved')`,
    [workerId, docType, PLACEHOLDER_DOC_URL]
  );
}

async function findExistingBooking(customerId, workerId, status) {
  const { rows } = await pool.query(
    'SELECT id FROM bookings WHERE customer_id = $1 AND worker_id = $2 AND status = $3 LIMIT 1',
    [customerId, workerId, status]
  );
  return rows[0]?.id ?? null;
}

async function seedCompletedBookingWithReview({ customerId, workerId, serviceId, price, addressLabel, review }) {
  let bookingId = await findExistingBooking(customerId, workerId, 'completed');
  if (!bookingId) {
    const { rows } = await pool.query(
      `INSERT INTO bookings (type, status, customer_id, worker_id, service_id, price, address_label, completed_at, created_at)
       VALUES ('manual', 'completed', $1, $2, $3, $4, $5, now() - interval '2 days', now() - interval '3 days')
       RETURNING id`,
      [customerId, workerId, serviceId, price, addressLabel]
    );
    bookingId = rows[0].id;
    console.log(`Seeded completed booking #${bookingId}`);
  }

  const { rows: existingReview } = await pool.query('SELECT id FROM reviews WHERE booking_id = $1', [bookingId]);
  if (!existingReview[0]) {
    await pool.query('INSERT INTO reviews (booking_id, rating, comment) VALUES ($1, $2, $3)', [
      bookingId,
      review.rating,
      review.comment,
    ]);
    console.log(`Seeded review for booking #${bookingId}`);
  }
}

async function seedCancelledBooking({ customerId, workerId, serviceId, price, addressLabel, cancelReason }) {
  const existing = await findExistingBooking(customerId, workerId, 'cancelled');
  if (existing) return;
  const { rows } = await pool.query(
    `INSERT INTO bookings (type, status, customer_id, worker_id, service_id, price, address_label, cancelled_by, cancel_reason, created_at)
     VALUES ('manual', 'cancelled', $1, $2, $3, $4, $5, $1, $6, now() - interval '1 day')
     RETURNING id`,
    [customerId, workerId, serviceId, price, addressLabel, cancelReason]
  );
  console.log(`Seeded cancelled booking #${rows[0].id}`);
}

async function main() {
  console.log('Seeding demo data...');

  const { rows: serviceRows } = await pool.query('SELECT id, category, name FROM services');
  const serviceId = (category, name) => {
    const row = serviceRows.find((r) => r.category === category && r.name === name);
    if (!row) throw new Error(`Seed service not found in catalog: ${category} / ${name}`);
    return row.id;
  };

  const customer = await findOrCreateCustomer();
  console.log(`Customer: ${customer.full_name ?? customer.fullName} (#${customer.id})`);

  const workers = [];
  for (const w of WORKERS) {
    const user = await findOrCreateWorkerUser(w);
    await upsertWorkerProfile(user.id, w);
    for (const svc of w.services) {
      await upsertWorkerService(user.id, serviceId(w.category, svc.name), svc.price);
    }
    workers.push({ ...w, id: user.id });
    console.log(`Worker: ${w.fullName} (#${user.id}, ${w.category}, ${w.isOnline ? 'online' : 'offline'})`);
  }

  await ensureVerificationDocument(workers[0].id, 'citizenship');
  await ensureVerificationDocument(workers[4].id, 'citizenship');

  const plumber = workers[0];
  await seedCompletedBookingWithReview({
    customerId: customer.id,
    workerId: plumber.id,
    serviceId: serviceId('plumbing', 'Pipe leak repair'),
    price: 800,
    addressLabel: 'Baneshwor-10, Kathmandu',
    review: { rating: 5, comment: 'Fixed the leak quickly and cleaned up after. Would book again.' },
  });

  const electrician = workers[2];
  await seedCancelledBooking({
    customerId: customer.id,
    workerId: electrician.id,
    serviceId: serviceId('electrical', 'Wiring inspection'),
    price: 1200,
    addressLabel: 'Baneshwor-10, Kathmandu',
    cancelReason: 'Found another worker who could come sooner.',
  });

  console.log('Seeding complete.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

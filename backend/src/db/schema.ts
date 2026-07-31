import bcrypt from 'bcryptjs';
import { db } from './connection.js';

export const DEMO_USERS = [
  { username: 'agent', password: 'agent123', role: 'AGENT' as const },
  { username: 'analyst', password: 'analyst123', role: 'ANALYST' as const },
  { username: 'manager', password: 'manager123', role: 'MANAGER' as const },
];

export function createSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('AGENT', 'ANALYST', 'MANAGER')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS financing_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT NOT NULL UNIQUE,
      applicant_name TEXT NOT NULL,
      applicant_identifier TEXT NOT NULL,
      amount REAL NOT NULL,
      duration_months INTEGER NOT NULL,
      purpose TEXT NOT NULL,
      monthly_income REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
      created_by INTEGER NOT NULL,
      decision_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);
}

export function seedUsers(): void {
  const insert = db.prepare(`
    INSERT INTO users (username, password_hash, role)
    VALUES (@username, @password_hash, @role)
    ON CONFLICT(username) DO UPDATE SET
      password_hash = excluded.password_hash,
      role = excluded.role
  `);

  for (const user of DEMO_USERS) {
    insert.run({
      username: user.username,
      password_hash: bcrypt.hashSync(user.password, 10),
      role: user.role,
    });
  }
}

export function clearFinancingRequests(): void {
  db.exec('DELETE FROM financing_requests');
}

export function seedSampleRequests(): void {
  const agent = db
    .prepare(`SELECT id FROM users WHERE username = 'agent'`)
    .get() as { id: number } | undefined;

  if (!agent) {
    throw new Error('Demo agent user not found');
  }

  const insert = db.prepare(`
    INSERT INTO financing_requests (
      reference, applicant_name, applicant_identifier, amount,
      duration_months, purpose, monthly_income, status, created_by
    ) VALUES (
      @reference, @applicant_name, @applicant_identifier, @amount,
      @duration_months, @purpose, @monthly_income, @status, @created_by
    )
  `);

  const samples = [
    {
      reference: 'FDF-SEED-001',
      applicant_name: 'Karim Benali',
      applicant_identifier: 'CIN-SEED-001',
      amount: 150000,
      duration_months: 36,
      purpose: 'Home renovation',
      monthly_income: 18000,
      status: 'DRAFT',
      created_by: agent.id,
    },
    {
      reference: 'FDF-SEED-002',
      applicant_name: 'Sara El Amrani',
      applicant_identifier: 'CIN-SEED-002',
      amount: 80000,
      duration_months: 24,
      purpose: 'Vehicle financing',
      monthly_income: 12000,
      status: 'SUBMITTED',
      created_by: agent.id,
    },
    {
      reference: 'FDF-SEED-003',
      applicant_name: 'Youssef Tazi',
      applicant_identifier: 'CIN-SEED-003',
      amount: 200000,
      duration_months: 48,
      purpose: 'Business equipment',
      monthly_income: 25000,
      status: 'UNDER_REVIEW',
      created_by: agent.id,
    },
  ];

  for (const sample of samples) {
    insert.run(sample);
  }
}

export function resetDemoData(): void {
  createSchema();
  clearFinancingRequests();
  seedUsers();
  seedSampleRequests();
}

export function initializeDatabase(): void {
  createSchema();
  seedUsers();

  const count = db
    .prepare('SELECT COUNT(*) as count FROM financing_requests')
    .get() as { count: number };

  if (count.count === 0) {
    seedSampleRequests();
  }
}

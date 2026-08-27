import type { Patient } from '../types';
import { generateId, getDb } from './database';

/** Patient repository — CRUD over the `patients` table. */

interface PatientRow {
  id: string;
  name: string;
  mrn: string | null;
  dob: string | null;
  created_at: number;
}

/** Input shape for creating/updating a patient. */
export interface PatientInput {
  /** Provide an id to update an existing patient; otherwise a new one is generated. */
  id?: string;
  name: string;
  mrn?: string;
  dob?: string;
}

function rowToPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    name: row.name,
    mrn: row.mrn ?? undefined,
    dob: row.dob ?? undefined,
    createdAt: row.created_at,
  };
}

/**
 * Inserts a new patient or updates the demographic fields of an existing one
 * (matched by `id`). Accepts a plain name string for convenience.
 */
export function upsertPatient(nameOrInput: string | PatientInput): Patient {
  const input: PatientInput = typeof nameOrInput === 'string' ? { name: nameOrInput } : nameOrInput;
  const id = input.id ?? generateId('pt');
  const createdAt = Date.now();
  getDb().runSync(
    `INSERT INTO patients (id, name, mrn, dob, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       mrn  = excluded.mrn,
       dob  = excluded.dob`,
    [id, input.name, input.mrn ?? null, input.dob ?? null, createdAt],
  );
  const saved = getPatient(id);
  if (!saved) {
    throw new Error(`Failed to persist patient "${input.name}"`);
  }
  return saved;
}

/**
 * Finds a patient by an exact (case-insensitive, trimmed) name match, or null.
 * Used by patient intake so repeated submissions of the same name reuse the
 * existing record instead of creating duplicate rows (idempotent upsert).
 */
export function findPatientByName(name: string): Patient | null {
  const search = (name ?? '').trim().toLowerCase();
  if (!search) return null;
  const rows = getDb().getAllSync<PatientRow>(
    'SELECT id, name, mrn, dob, created_at FROM patients',
  );
  const match = rows.find((row) => row.name.trim().toLowerCase() === search);
  return match ? rowToPatient(match) : null;
}

/** Loads a single patient by id, or null. */
export function getPatient(id: string): Patient | null {
  const row = getDb().getFirstSync<PatientRow>(
    'SELECT id, name, mrn, dob, created_at FROM patients WHERE id = ?',
    [id],
  );
  return row ? rowToPatient(row) : null;
}

/** Lists all patients, most recently created first. */
export function listPatients(): Patient[] {
  const rows = getDb().getAllSync<PatientRow>(
    'SELECT id, name, mrn, dob, created_at FROM patients ORDER BY created_at DESC',
  );
  return rows.map(rowToPatient);
}

export default getPatient;
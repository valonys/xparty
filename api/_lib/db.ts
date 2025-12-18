import { createHash } from 'node:crypto';
import { getFirestore } from './firebaseAdmin';
import type { ApiUser } from './auth';

export function idToDocId(id: string) {
  return createHash('sha256').update(id).digest('hex');
}

export type GuestDoc = {
  id: string; // google sub
  name: string;
  status: 'confirmed' | 'pending' | 'declined';
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  amountPaid: number;
  totalDue: number;
  createdAt: number;
  updatedAt: number;
};

export type ActivityDoc = {
  type: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  targetId?: string;
  targetName?: string;
  message: string;
  timestamp: number;
  meta?: Record<string, any>;
};

export async function upsertGuestForUser(user: ApiUser) {
  const db = getFirestore();
  const now = Date.now();
  const docId = idToDocId(user.id);
  const ref = db.collection('guests').doc(docId);
  const snap = await ref.get();
  if (!snap.exists) {
    const created: GuestDoc = {
      id: user.id,
      name: user.name,
      status: 'pending',
      paymentStatus: 'unpaid',
      amountPaid: 0,
      totalDue: 50000,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(created);
    return created;
  }
  await ref.set({ name: user.name, updatedAt: now }, { merge: true });
  return snap.data() as GuestDoc;
}

export async function addActivity(user: ApiUser, activity: Omit<ActivityDoc, 'actorId' | 'actorName' | 'actorEmail' | 'timestamp'> & { timestamp?: number }) {
  const db = getFirestore();
  const doc: ActivityDoc = {
    actorId: user.id,
    actorName: user.name,
    actorEmail: user.email,
    timestamp: activity.timestamp ?? Date.now(),
    type: activity.type,
    message: activity.message,
    targetId: activity.targetId,
    targetName: activity.targetName,
    meta: activity.meta,
  };
  await db.collection('activities').add(doc);
  return doc;
}



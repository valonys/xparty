export enum UserRole {
  ADMIN = 'ADMIN',
  ADMIN_VIEWER = 'ADMIN_VIEWER',
  GUEST = 'GUEST'
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface GuestData {
  id: string;
  name: string;
  status: 'confirmed' | 'pending' | 'declined';
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  amountPaid: number;
  totalDue: number;
  paymentMethod?: 'multicaixa_express' | 'cash';
  arrivalDate?: string;
}

export interface Trace {
  id: string;
  userId: string;
  userName: string;
  content: string; // The memory/message
  imageUrl?: string;
  timestamp: number;
  aiEnhanced?: boolean;
}

export interface PaymentProof {
  id: string;
  guestId: string;
  guestName: string;
  uploadedByUserId: string;
  uploadedByUserName: string;
  timestamp: number;
  fileName: string;
  mimeType: string;
  dataUrl: string; // base64 data URL for image/pdf
  amount?: number; // optional amount claimed for this proof
}

export interface DbUser {
  id: string;
  name: string;
  role: UserRole;
  createdAt: number;
  lastActiveAt: number;
}

export type ActivityType =
  | 'LOGIN'
  | 'RSVP_UPDATE'
  | 'PAYMENT_UPDATE'
  | 'PAYMENT_NO_PAY'
  | 'PAYMENT_PROOF_UPLOAD'
  | 'TRACE_POST';

export interface Activity {
  id: string;
  type: ActivityType;
  actorUserId: string;
  actorUserName: string;
  timestamp: number;
  // Optional "target" (guest being updated)
  targetGuestId?: string;
  targetGuestName?: string;
  // Free-form payload for UI display/debugging
  message: string;
  meta?: Record<string, any>;
}

export interface MenuItem {
  id: string;
  category: 'food' | 'drink' | 'dessert';
  name: string;
  description: string;
}

export interface PartyEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
}

// Vite type augmentation for `import.meta.env`.
interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
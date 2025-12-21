export type ApiUser = {
  id: string;
  name: string;
  role: 'ADMIN' | 'GUEST';
};

export type Guest = {
  id: string;
  name: string;
  status: 'confirmed' | 'pending' | 'declined';
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  amountPaid: number;
  totalDue: number;
  createdAt?: number;
  updatedAt?: number;
};

export type Activity = {
  id: string;
  type: string;
  actorId: string;
  actorName: string;
  targetId?: string;
  targetName?: string;
  message: string;
  timestamp: number;
  meta?: Record<string, any>;
};

export type Proof = {
  id: string;
  ownerId: string;
  ownerName: string;
  blobUrl: string;
  fileName: string;
  mimeType: string;
  amount?: number | null;
  createdAt: number;
};

export type Trace = {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
  image?: {
    fileName: string;
    mimeType: string;
    downloadUrl?: string;
  } | null;
};

export type Kpis = {
  totalGuests: number;
  confirmedCount: number;
  declinedCount: number;
  pendingCount: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  totalDue: number;
  totalPaid: number;
};

const TOKEN_KEY = 'nivelx_session_token';

export function getSessionToken() {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

export function setSessionToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getSessionToken();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function authLogin(name: string) {
  const data = await apiFetch<{ token: string; user: ApiUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  setSessionToken(data.token);
  return data.user;
}

export async function getMe() {
  const data = await apiFetch<{ user: ApiUser }>('/api/me');
  return data.user;
}

export async function getGuests() {
  return apiFetch<{ guests?: Guest[]; guest?: Guest | null }>('/api/guests');
}

export async function patchMyGuest(patch: Partial<Pick<Guest, 'status' | 'paymentStatus' | 'amountPaid'>>) {
  return apiFetch<{ guest: Guest }>('/api/guests', { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function getActivities() {
  return apiFetch<{ activities: Activity[] }>('/api/activities');
}

export async function getProofs() {
  return apiFetch<{ proofs: Proof[] }>('/api/proofs');
}

export function getProofDownloadUrlFromProof(proof: Proof) {
  // Vercel Blob URL (public) can be used directly.
  return proof.blobUrl;
}

export async function getKpis() {
  return apiFetch<{ kpis: Kpis }>('/api/kpis');
}

export async function patchGuestAsAdmin(targetId: string, patch: Partial<Pick<Guest, 'status' | 'paymentStatus' | 'amountPaid'>>) {
  return apiFetch<{ guest: Guest }>('/api/guests', { method: 'PATCH', body: JSON.stringify({ ...patch, targetId }) });
}

export async function createProofUploadUrl(args: { fileName: string; mimeType: string; amount?: number }) {
  return apiFetch<{ proof: Proof }>('/api/proofs/upload', {
    method: 'POST',
    body: JSON.stringify(args),
  });
}

export async function uploadProof(args: { file: File; amount?: number }) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(args.file);
  });

  return apiFetch<{ proof: Proof }>('/api/proofs/upload', {
    method: 'POST',
    body: JSON.stringify({
      fileName: args.file.name,
      mimeType: args.file.type || 'application/octet-stream',
      amount: args.amount,
      dataUrl,
    }),
  });
}

export async function getTraces() {
  return apiFetch<{ traces: Trace[] }>('/api/traces');
}

export async function createTrace(args: { content: string; imageFile?: File }) {
  let imageDataUrl: string | undefined;
  if (args.imageFile) {
    imageDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(args.imageFile as File);
    });
  }

  return apiFetch<{ trace: Trace }>('/api/traces', {
    method: 'POST',
    body: JSON.stringify({
      content: args.content,
      imageDataUrl,
      imageFileName: args.imageFile?.name,
      imageMimeType: args.imageFile?.type,
    }),
  });
}



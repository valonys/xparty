import { Activity, DbUser, GuestData, PaymentProof, Trace, User, UserRole } from '../types';

// No seed/demo data for production use: everything is created by real users.
const INITIAL_GUESTS: GuestData[] = [];
const INITIAL_TRACES: Trace[] = [];

const INITIAL_PAYMENT_PROOFS: PaymentProof[] = [];
const INITIAL_USERS: DbUser[] = [
  { id: 'ataliba', name: 'Ataliba', role: UserRole.ADMIN, createdAt: Date.now(), lastActiveAt: Date.now() },
];
const INITIAL_ACTIVITIES: Activity[] = [];

// Service Class
class MockBackendService {
  private getStorage<T>(key: string, initial: T): T {
    const stored = localStorage.getItem(key);
    if (!stored) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(stored);
  }

  private setStorage(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
    // Notify UI (same tab) that DB changed. Cross-tab sync comes from the `storage` event.
    window.dispatchEvent(new CustomEvent('nivelx_db_updated', { detail: { key } }));
  }

  private createId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  private addActivity(activity: Omit<Activity, 'id' | 'timestamp'> & { id?: string; timestamp?: number }) {
    const normalized: Activity = {
      ...activity,
      id: activity.id ?? this.createId('act'),
      timestamp: activity.timestamp ?? Date.now(),
    };
    const current = this.getActivities();
    const updated = [normalized, ...current];
    this.setStorage('nivelx_activities', updated);
    return updated;
  }

  private logTrace(actor: User, content: string) {
    const trace: Trace = {
      id: this.createId('log'),
      userId: actor.id,
      userName: actor.name,
      content,
      timestamp: Date.now(),
    };
    this.addTrace(trace);
  }

  private ensureGuestRecord(id: string, name: string) {
    const guests = this.getGuests();
    const existing = guests.find(g => g.id === id);
    if (existing) return existing;

    const newGuest: GuestData = {
      id,
      name,
      status: 'pending',
      paymentStatus: 'unpaid',
      amountPaid: 0,
      totalDue: 50000,
      paymentMethod: 'multicaixa_express',
    };
    const updatedGuests = [newGuest, ...guests];
    this.setStorage('nivelx_guests', updatedGuests);
    return newGuest;
  }

  getUsers(): DbUser[] {
    return this.getStorage('nivelx_users', INITIAL_USERS);
  }

  upsertUser(user: Pick<DbUser, 'id' | 'name' | 'role'>) {
    const current = this.getUsers();
    const now = Date.now();
    const existing = current.find(u => u.id === user.id);
    const next: DbUser = existing
      ? { ...existing, name: user.name, role: user.role, lastActiveAt: now }
      : { ...user, createdAt: now, lastActiveAt: now };
    const updated = [next, ...current.filter(u => u.id !== user.id)];
    this.setStorage('nivelx_users', updated);
    return next;
  }

  getActivities(): Activity[] {
    return this.getStorage('nivelx_activities', INITIAL_ACTIVITIES);
  }

  getActivitiesForUser(userId: string): Activity[] {
    return this.getActivities().filter(a => a.actorUserId === userId || a.targetGuestId === userId);
  }

  login(userId: string): User | null {
    // Simulating login. 
    // 'admin' gives full access.
    
    const normalized = userId.trim().toLowerCase();
    if (normalized === 'ataliba') {
      const user = { id: 'ataliba', name: 'Ataliba', role: UserRole.ADMIN } as User;
      this.ensureGuestRecord(user.id, user.name);
      this.upsertUser({ id: user.id, name: user.name, role: user.role });
      this.addActivity({ type: 'LOGIN', actorUserId: user.id, actorUserName: user.name, message: `${user.name} iniciou sessão.` });
      return user;
    }

    // Check if ID matches a guest name
    const guests = this.getGuests();
    const safeName = userId.trim();
    const guest = guests.find(g => g.id === userId || g.name.toLowerCase() === safeName.toLowerCase());

    if (guest) {
      const user = { id: guest.id, name: guest.name, role: UserRole.GUEST } as User;
      this.upsertUser({ id: user.id, name: user.name, role: user.role });
      this.addActivity({ type: 'LOGIN', actorUserId: user.id, actorUserName: user.name, message: `${user.name} iniciou sessão.` });
      return user;
    }

    // Default fallthrough for new users (Guests): create a guest entry so they appear in lists.
    if (!safeName) return null;
    const newGuest: GuestData = {
      id: this.createId('guest'),
      name: safeName,
      status: 'pending',
      paymentStatus: 'unpaid',
      amountPaid: 0,
      totalDue: 50000,
      paymentMethod: 'multicaixa_express',
    };
    const updatedGuests = [newGuest, ...guests];
    this.setStorage('nivelx_guests', updatedGuests);
    const user = { id: newGuest.id, name: newGuest.name, role: UserRole.GUEST } as User;
    this.upsertUser({ id: user.id, name: user.name, role: user.role });
    this.addActivity({ type: 'LOGIN', actorUserId: user.id, actorUserName: user.name, message: `${user.name} iniciou sessão.` });
    return user;
  }

  getGuests(): GuestData[] {
    return this.getStorage('nivelx_guests', INITIAL_GUESTS);
  }

  getPaymentProofs(): PaymentProof[] {
    return this.getStorage('nivelx_payment_proofs', INITIAL_PAYMENT_PROOFS);
  }

  getPaymentProofsForGuest(guestId: string): PaymentProof[] {
    return this.getPaymentProofs().filter(p => p.guestId === guestId);
  }

  addPaymentProof(proof: Omit<PaymentProof, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): PaymentProof[] {
    const normalized: PaymentProof = {
      ...proof,
      id: proof.id ?? this.createId('proof'),
      timestamp: proof.timestamp ?? Date.now(),
    };
    const current = this.getPaymentProofs();
    const updated = [normalized, ...current];
    this.setStorage('nivelx_payment_proofs', updated);
    this.addActivity({
      type: 'PAYMENT_PROOF_UPLOAD',
      actorUserId: normalized.uploadedByUserId,
      actorUserName: normalized.uploadedByUserName,
      targetGuestId: normalized.guestId,
      targetGuestName: normalized.guestName,
      message: `${normalized.uploadedByUserName} carregou um comprovativo (${normalized.fileName}) para ${normalized.guestName}.`,
      meta: { proofId: normalized.id, amount: normalized.amount, mimeType: normalized.mimeType },
      timestamp: normalized.timestamp,
    });
    return updated;
  }

  updateGuestPayment(id: string, amount: number, actor?: User) {
    const guests = this.getGuests();
    let changedGuest: GuestData | null = null;

    const updated = guests.map(g => {
      if (g.id !== id) return g;
      const newTotal = Math.max(0, g.amountPaid + amount);
      const paymentStatus: GuestData['paymentStatus'] =
        newTotal >= g.totalDue ? 'paid' : newTotal > 0 ? 'partial' : 'unpaid';
      changedGuest = { ...g, amountPaid: newTotal, paymentStatus };
      return changedGuest;
    });

    this.setStorage('nivelx_guests', updated);

    if (actor && changedGuest) {
      this.logTrace(
        actor,
        `Registo financeiro: ${actor.name} registou um pagamento de ${amount.toLocaleString()} AOA para ${changedGuest.name}. Total pago: ${changedGuest.amountPaid.toLocaleString()} AOA. Estado: ${changedGuest.paymentStatus}.`
      );
      this.addActivity({
        type: 'PAYMENT_UPDATE',
        actorUserId: actor.id,
        actorUserName: actor.name,
        targetGuestId: changedGuest.id,
        targetGuestName: changedGuest.name,
        message: `${actor.name} registou pagamento de ${amount.toLocaleString()} AOA para ${changedGuest.name}.`,
        meta: { amount, totalPaid: changedGuest.amountPaid, paymentStatus: changedGuest.paymentStatus },
      });
    }

    return updated;
  }

  setGuestPaymentNoPay(id: string, actor: User) {
    const guests = this.getGuests();
    let changedGuest: GuestData | null = null;

    const updated = guests.map(g => {
      if (g.id !== id) return g;
      changedGuest = { ...g, paymentStatus: 'unpaid' };
      return changedGuest;
    });

    this.setStorage('nivelx_guests', updated);
    if (changedGuest) {
      this.logTrace(actor, `Registo financeiro: ${actor.name} marcou "${changedGuest.name}" como não vai pagar (por agora).`);
      this.addActivity({
        type: 'PAYMENT_NO_PAY',
        actorUserId: actor.id,
        actorUserName: actor.name,
        targetGuestId: changedGuest.id,
        targetGuestName: changedGuest.name,
        message: `${actor.name} marcou ${changedGuest.name} como não paga (por agora).`,
      });
    }
    return updated;
  }

  updateGuestStatus(id: string, status: GuestData['status'], actor: User) {
    const guests = this.getGuests();
    let previous: GuestData | null = null;
    let changedGuest: GuestData | null = null;

    const updated = guests.map(g => {
      if (g.id !== id) return g;
      previous = g;
      changedGuest = { ...g, status };
      return changedGuest;
    });

    this.setStorage('nivelx_guests', updated);

    if (previous && changedGuest) {
      this.logTrace(
        actor,
        `Presença: ${actor.name} alterou o estado de "${changedGuest.name}" de ${previous.status} para ${changedGuest.status}.`
      );
      this.addActivity({
        type: 'RSVP_UPDATE',
        actorUserId: actor.id,
        actorUserName: actor.name,
        targetGuestId: changedGuest.id,
        targetGuestName: changedGuest.name,
        message: `${actor.name} alterou o estado de ${changedGuest.name}: ${previous.status} → ${changedGuest.status}.`,
        meta: { from: previous.status, to: changedGuest.status },
      });
    }
    return updated;
  }

  getTraces(): Trace[] {
    return this.getStorage('nivelx_traces', INITIAL_TRACES);
  }

  addTrace(trace: Trace): Trace[] {
    const current = this.getTraces();
    const updated = [trace, ...current];
    this.setStorage('nivelx_traces', updated);
    return updated;
  }
}

export const mockBackend = new MockBackendService();
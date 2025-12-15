import { GuestData, PaymentProof, Trace, User, UserRole } from '../types';

// Initial Mock Data
const INITIAL_GUESTS: GuestData[] = [
  { id: '1', name: 'João Manuel', status: 'confirmed', paymentStatus: 'paid', amountPaid: 50000, totalDue: 50000, paymentMethod: 'multicaixa_express' },
  { id: '2', name: 'Antonio Silva', status: 'pending', paymentStatus: 'partial', amountPaid: 25000, totalDue: 50000, paymentMethod: 'multicaixa_express' },
  { id: '3', name: 'Carlos Pedro', status: 'confirmed', paymentStatus: 'paid', amountPaid: 50000, totalDue: 50000, paymentMethod: 'multicaixa_express' },
  { id: '4', name: 'Miguel Costa', status: 'declined', paymentStatus: 'unpaid', amountPaid: 0, totalDue: 50000 },
  { id: '5', name: 'Fernando Jose', status: 'confirmed', paymentStatus: 'unpaid', amountPaid: 0, totalDue: 50000 },
];

const INITIAL_TRACES: Trace[] = [
  {
    id: 't1',
    userId: '1',
    userName: 'João Manuel',
    content: 'Lembram-se daquela vez em 1999 quando a luz foi abaixo por 3 dias? O melhor churrasco de sempre.',
    timestamp: Date.now() - 10000000,
    imageUrl: 'https://picsum.photos/400/300'
  }
];

const INITIAL_PAYMENT_PROOFS: PaymentProof[] = [];

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
  }

  private createId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

  login(userId: string): User | null {
    // Simulating login. 
    // 'admin' gives full access.
    
    const normalized = userId.trim().toLowerCase();
    if (normalized === 'admin' || normalized === 'ataliba') {
      return { id: 'ataliba', name: 'Ataliba', role: UserRole.ADMIN };
    }
    if (normalized === 'jado') {
      return { id: 'jado', name: 'Jado', role: UserRole.ADMIN_VIEWER };
    }

    // Check if ID matches a guest name
    const guests = this.getGuests();
    const guest = guests.find(g => g.name.toLowerCase().includes(userId.toLowerCase()) || g.id === userId);

    if (guest) {
      return { id: guest.id, name: guest.name, role: UserRole.GUEST };
    }

    // Default fallthrough for new users (Guests): create a guest entry so they appear in lists.
    const safeName = userId.trim();
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
    return { id: newGuest.id, name: newGuest.name, role: UserRole.GUEST };
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
import React, { useState, useEffect } from 'react';
import { User, GuestData, UserRole } from '../types';
import { mockBackend } from '../services/mockBackend';
import { Button } from './Button';
import { Search, CreditCard, Check, X, ShieldAlert } from 'lucide-react';

export const GuestList: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const [guests, setGuests] = useState<GuestData[]>([]);
  const [filter, setFilter] = useState('');
  const isAdminFull = currentUser.role === UserRole.ADMIN;
  const isAdminAny = isAdminFull || currentUser.role === UserRole.ADMIN_VIEWER;

  useEffect(() => {
    setGuests(mockBackend.getGuests());
  }, []);

  const handlePayment = (id: string) => {
    // Simulate updating payment via Multicaixa Express logic (Mock)
    const updated = mockBackend.updateGuestPayment(id, 25000, currentUser); // Add partial payment of 25k
    setGuests(updated);
  };

  const handleNoPay = (id: string) => {
    const updated = mockBackend.setGuestPaymentNoPay(id, currentUser);
    setGuests(updated);
  };

  const handleStatus = (id: string, status: GuestData['status']) => {
    const updated = mockBackend.updateGuestStatus(id, status, currentUser);
    setGuests(updated);
  };

  const filteredGuests = guests.filter(g => g.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-serif font-bold text-white">Lista de X-Cleroarianos</h2>
           <p className="text-gray-400 text-sm">
             {isAdminAny ? "Gerir presenças e pagamentos Multicaixa." : "Vê quem vem à festa."}
           </p>
        </div>
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
                type="text" 
                placeholder="Encontrar um X-Cleroariano..." 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 text-white pl-10 pr-4 py-2 rounded-lg focus:ring-1 focus:ring-red-600 outline-none w-full md:w-64"
            />
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/40 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">Nome</th>
                <th className="p-4">Estado</th>
                {isAdminAny && <th className="p-4">Pagamento</th>}
                {isAdminAny && <th className="p-4 text-right">Saldo em Dívida</th>}
                <th className="p-4">{isAdminAny ? 'Acção' : 'Minha Acção'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredGuests.map((guest) => (
                <tr key={guest.id} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="p-4 font-medium text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-gray-500">
                            {guest.name.substring(0,2).toUpperCase()}
                        </div>
                        {guest.name}
                      </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={guest.status} />
                  </td>
                  
                  {isAdminAny && (
                    <>
                        <td className="p-4">
                            <PaymentBadge status={guest.paymentStatus} />
                        </td>
                        <td className="p-4 text-right font-mono text-gray-300">
                            {(guest.totalDue - guest.amountPaid).toLocaleString()} AOA
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-2 items-center">
                            <Button
                              variant="secondary"
                              className="text-xs py-1 px-3 h-8"
                              onClick={() => handleStatus(guest.id, 'confirmed')}
                              disabled={!isAdminFull}
                              title="Confirmar presença"
                            >
                              <Check size={12} className="mr-1"/> Confirmar
                            </Button>
                            <Button
                              variant="secondary"
                              className="text-xs py-1 px-3 h-8"
                              onClick={() => handleStatus(guest.id, 'declined')}
                              disabled={!isAdminFull}
                              title="Recusar presença"
                            >
                              <X size={12} className="mr-1"/> Recusar
                            </Button>
                            <Button
                              variant="secondary"
                              className="text-xs py-1 px-3 h-8"
                              onClick={() => handleStatus(guest.id, 'pending')}
                              disabled={!isAdminFull}
                              title="Marcar como pendente"
                            >
                              Pendente
                            </Button>
                            {guest.paymentStatus !== 'paid' ? (
                              <>
                                <Button
                                  variant="secondary"
                                  className="text-xs py-1 px-3 h-8"
                                  onClick={() => handlePayment(guest.id)}
                                  disabled={!isAdminFull}
                                  title="Registar pagamento"
                                >
                                  <CreditCard size={12} className="mr-1"/> +25k
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="text-xs py-1 px-3 h-8 text-red-400 hover:text-red-300"
                                  onClick={() => handleNoPay(guest.id)}
                                  disabled={!isAdminFull}
                                  title="Marcar como não vai pagar"
                                >
                                  Não paga
                                </Button>
                              </>
                            ) : (
                              <span className="text-green-500 text-xs flex items-center gap-1"><Check size={14}/> Liquidado</span>
                            )}
                          </div>
                          {!isAdminFull && (
                            <p className="text-[10px] text-gray-600 mt-2">Jado: modo visualização (sem edições).</p>
                          )}
                        </td>
                    </>
                  )}

                  {!isAdminAny && (
                    <td className="p-4">
                      {guest.id === currentUser.id ? (
                        <div className="flex flex-wrap gap-2 items-center">
                          <Button
                            variant="secondary"
                            className="text-xs py-1 px-3 h-8"
                            onClick={() => handleStatus(guest.id, 'confirmed')}
                            title="Confirmar presença"
                          >
                            <Check size={12} className="mr-1"/> Confirmar
                          </Button>
                          <Button
                            variant="secondary"
                            className="text-xs py-1 px-3 h-8"
                            onClick={() => handleStatus(guest.id, 'declined')}
                            title="Recusar presença"
                          >
                            <X size={12} className="mr-1"/> Recusar
                          </Button>
                          <Button
                            variant="secondary"
                            className="text-xs py-1 px-3 h-8"
                            onClick={() => handlePayment(guest.id)}
                            title="Registar que pagaste (simulado)"
                          >
                            <CreditCard size={12} className="mr-1"/> Pagar +25k
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-xs py-1 px-3 h-8 text-red-400 hover:text-red-300"
                            onClick={() => handleNoPay(guest.id)}
                            title="Registar que não vais pagar"
                          >
                            Não pago
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {!isAdminAny && (
          <div className="flex justify-center p-4">
              <p className="text-xs text-gray-600 flex items-center gap-2">
                  <ShieldAlert size={12}/> Apenas o Admin pode visualizar detalhes financeiros.
              </p>
          </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        confirmed: 'bg-green-900/20 text-green-400 border-green-900/30',
        pending: 'bg-yellow-900/20 text-yellow-400 border-yellow-900/30',
        declined: 'bg-red-900/20 text-red-400 border-red-900/30',
    };
    const labels: Record<string, string> = {
        confirmed: 'Confirmado',
        pending: 'Pendente',
        declined: 'Recusado'
    };
    return (
        <span className={`px-2 py-1 rounded text-xs border ${styles[status] || styles.pending} capitalize`}>
            {labels[status] || status}
        </span>
    );
}

const PaymentBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        paid: 'text-green-400',
        partial: 'text-yellow-500',
        unpaid: 'text-red-500',
    };
     const labels: Record<string, string> = {
        paid: 'Pago',
        partial: 'Parcial',
        unpaid: 'Em Falta'
    };
    return (
        <div className="flex flex-col">
            <span className={`text-xs font-bold uppercase ${styles[status]}`}>{labels[status]}</span>
            <span className="text-[10px] text-gray-600">Multicaixa</span>
        </div>
    );
}
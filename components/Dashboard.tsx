import React, { useMemo, useRef, useState } from 'react';
import { PaymentProof, User, UserRole } from '../types';
import { mockBackend } from '../services/mockBackend';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { Wallet, Users, CheckCircle2, Calendar, Upload, FileText } from 'lucide-react';
import { Button } from './Button';

export const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const isAdminFull = user.role === UserRole.ADMIN;
  const isAdminAny = isAdminFull || user.role === UserRole.ADMIN_VIEWER;
  const guests = mockBackend.getGuests();
  const myGuest = guests.find(g => g.id === user.id);

  const [paymentAmount, setPaymentAmount] = useState<number>(25000);
  const [selectedProof, setSelectedProof] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allProofs = useMemo(() => mockBackend.getPaymentProofs(), []);
  const myProofs = useMemo(() => mockBackend.getPaymentProofsForGuest(user.id), [user.id]);

  const stats = useMemo(() => {
    const totalDue = guests.reduce((acc, curr) => acc + curr.totalDue, 0);
    const totalPaid = guests.reduce((acc, curr) => acc + curr.amountPaid, 0);
    const paidCount = guests.filter(g => g.paymentStatus === 'paid').length;
    const pendingCount = guests.filter(g => g.paymentStatus === 'partial').length;
    const unpaidCount = guests.filter(g => g.paymentStatus === 'unpaid').length;
    
    return { totalDue, totalPaid, paidCount, pendingCount, unpaidCount };
  }, [guests]);

  const pieData = [
    { name: 'Pago', value: stats.paidCount, color: '#dc2626' }, // Red-600
    { name: 'Parcial', value: stats.pendingCount, color: '#f59e0b' }, // Amber-500
    { name: 'Pendente', value: stats.unpaidCount, color: '#404040' }, // Neutral-700
  ];

  // Calculate days remaining to Dec 27, 2025
  const daysRemaining = useMemo(() => {
      const targetDate = new Date('2025-12-27T00:00:00');
      const today = new Date();
      const diffTime = targetDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  const handleMyStatus = (status: 'confirmed' | 'declined' | 'pending') => {
    mockBackend.updateGuestStatus(user.id, status, user);
  };

  const handleMyNoPay = () => {
    mockBackend.setGuestPaymentNoPay(user.id, user);
  };

  const handleUploadProof = async () => {
    if (!selectedProof) return;
    if (!myGuest) return;

    setIsUploadingProof(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Falha ao ler ficheiro.'));
        reader.readAsDataURL(selectedProof);
      });

      // Store proof in "light DB"
      mockBackend.addPaymentProof({
        guestId: myGuest.id,
        guestName: myGuest.name,
        uploadedByUserId: user.id,
        uploadedByUserName: user.name,
        fileName: selectedProof.name,
        mimeType: selectedProof.type || 'application/octet-stream',
        dataUrl,
        amount: Number.isFinite(paymentAmount) ? paymentAmount : undefined,
      });

      // Register payment (optional) + trace log
      if (paymentAmount && paymentAmount > 0) {
        mockBackend.updateGuestPayment(myGuest.id, paymentAmount, user);
      } else {
        mockBackend.addTrace({
          id: Date.now().toString(),
          userId: user.id,
          userName: user.name,
          content: `Comprovativo: ${user.name} carregou um comprovativo de pagamento para "${myGuest.name}" (${selectedProof.name}).`,
          timestamp: Date.now(),
        });
      }

      setSelectedProof(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploadingProof(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-serif font-bold text-white mb-2">Bem-vindo, {user.name}</h1>
        <p className="text-gray-400">Aqui está o estado actual do Reencontro Nível X.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Only Admin sees Money */}
        {isAdminAny ? (
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute right-[-10px] top-[-10px] bg-red-900/20 w-24 h-24 rounded-full blur-xl group-hover:bg-red-900/30 transition-all"></div>
            <div className="flex items-center gap-3 mb-2 text-red-500">
                <Wallet size={24} />
                <h3 className="font-bold uppercase tracking-wider text-xs">Total Angariado</h3>
            </div>
            <p className="text-3xl font-bold text-white font-mono">
                {stats.totalPaid.toLocaleString()} <span className="text-base text-gray-500">AOA</span>
            </p>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-4 overflow-hidden">
                <div 
                className="bg-red-600 h-full transition-all duration-1000 ease-out" 
                style={{ width: `${(stats.totalPaid / stats.totalDue) * 100}%` }}
                ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-right">Meta: {stats.totalDue.toLocaleString()} AOA</p>
            </div>
        ) : (
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl relative overflow-hidden">
             <div className="flex items-center gap-3 mb-2 text-red-500">
                <Calendar size={24} />
                <h3 className="font-bold uppercase tracking-wider text-xs">Data do Evento</h3>
            </div>
            <p className="text-xl font-bold text-white">27 de Dezembro</p>
            <p className="text-gray-500 text-sm mt-1">2025, Sábado, 14:00</p>
            </div>
        )}

        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl group hover:border-red-900/30 transition-colors">
           <div className="flex items-center gap-3 mb-2 text-blue-400">
            <Users size={24} />
            <h3 className="font-bold uppercase tracking-wider text-xs">X-Cleroarianos</h3>
          </div>
          <p className="text-3xl font-bold text-white">
            {guests.length} <span className="text-lg font-normal text-gray-500">Kambas</span>
          </p>
          <div className="flex gap-2 mt-4">
             {stats.paidCount > 0 && <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded border border-green-900/50 flex items-center gap-1"><CheckCircle2 size={10}/> {stats.paidCount} Pagos</span>}
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex flex-col justify-center items-center text-center">
            <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-1">Dias Restantes</h3>
            <p className="text-5xl font-serif font-bold text-white bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-600">
                {daysRemaining > 0 ? daysRemaining : 0}
            </p>
            <p className="text-xs text-red-500 mt-2 font-semibold">Prepara-te!</p>
        </div>
      </div>

      {/* Charts Section - Admin Only */}
      {isAdminAny && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl">
            <h3 className="font-bold text-gray-300 mb-6">Estado dos Pagamentos</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    >
                    {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '8px' }}
                        itemStyle={{ color: '#e5e5e5' }}
                    />
                </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
                {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                        <span className="text-sm text-gray-400">{d.name}</span>
                    </div>
                ))}
            </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex flex-col justify-between">
            <div>
                <h3 className="font-bold text-gray-300 mb-2">Próximos Passos (Admin)</h3>
                <ul className="space-y-4 mt-4">
                    {[
                        { text: 'Confirmar menu com o catering', done: true },
                        { text: 'Finalizar playlist', done: false },
                        { text: 'Enviar lembretes Multicaixa', done: false },
                        { text: 'Comprar gelo... muito gelo', done: false },
                    ].map((task, idx) => (
                        <li key={idx} className="flex items-center gap-3 p-3 bg-black/40 rounded-lg border border-neutral-800">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${task.done ? 'border-red-600 bg-red-600' : 'border-gray-600'}`}>
                                {task.done && <CheckCircle2 size={12} className="text-white" />}
                            </div>
                            <span className={task.done ? 'text-gray-500 line-through' : 'text-gray-200'}>{task.text}</span>
                        </li>
                    ))}
                </ul>
            </div>
            </div>
        </div>
      )}

      {!isAdminAny && (
        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl">
          <div className="text-center">
            <h2 className="text-2xl font-serif text-white mb-4">Sejam Bem-Vindos as 20Torres XNivel Kleromanto.</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Tropas a contagem regressiva começou. Verifiquem o programa, confirma a tua presença com mais duas gajas, deia um palpite sobre o menu e prepara-te para reviver os mais de 35 anos de convivencia e histórias no dia 27 de Dezembro, e mais, com a saudosa homenagem ao kota Impitígo aKa Man-Barras.
            </p>
          </div>

          {/* Guest self-service: RSVP + payment proof */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-black/30 border border-neutral-800 rounded-xl p-6">
              <h3 className="font-bold text-white mb-3">Minha Presença</h3>
              <p className="text-sm text-gray-400 mb-4">Confirma ou recusa a tua presença. Isto fica registado nos Traços com timestamp.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => handleMyStatus('confirmed')}>Confirmar</Button>
                <Button variant="secondary" onClick={() => handleMyStatus('declined')}>Recusar</Button>
                <Button variant="ghost" onClick={() => handleMyStatus('pending')}>Pendente</Button>
              </div>
            </div>

            <div className="bg-black/30 border border-neutral-800 rounded-xl p-6">
              <h3 className="font-bold text-white mb-3">Comprovativo de Pagamento</h3>
              <p className="text-sm text-gray-400 mb-4">Carrega uma imagem ou PDF do comprovativo. Isto alimenta o estado geral de caixa.</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">Valor (AOA)</label>
                  <input
                    type="number"
                    min={0}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => setSelectedProof(e.target.files?.[0] ?? null)}
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={() => fileInputRef.current?.click()}>
                      <Upload size={18} /> Selecionar ficheiro
                    </Button>
                    <Button className="flex-1" onClick={handleUploadProof} disabled={!selectedProof || isUploadingProof} isLoading={isUploadingProof}>
                      <FileText size={18} /> Enviar
                    </Button>
                  </div>
                  {selectedProof && (
                    <p className="text-xs text-gray-500 mt-2 truncate">Selecionado: {selectedProof.name}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button variant="ghost" className="text-red-400 hover:text-red-300" onClick={handleMyNoPay}>
                      Marcar como não pago (por agora)
                    </Button>
                  </div>
                </div>
              </div>

              {myProofs.length > 0 && (
                <p className="text-xs text-gray-500 mt-4">
                  Já tens {myProofs.length} comprovativo(s) carregado(s).
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {isAdminAny && (
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="font-bold text-white">Comprovativos de Pagamento (últimos)</h3>
            <span className="text-xs text-gray-500">{allProofs.length} total</span>
          </div>

          {allProofs.length === 0 ? (
            <p className="text-sm text-gray-500">Ainda não foram carregados comprovativos.</p>
          ) : (
            <div className="space-y-3">
              {allProofs.slice(0, 5).map((p: PaymentProof) => (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-black/30 border border-neutral-800 rounded-lg p-4">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-200 truncate">
                      <span className="font-semibold">{p.guestName}</span> — {p.fileName}
                      {typeof p.amount === 'number' ? ` (${p.amount.toLocaleString()} AOA)` : ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(p.timestamp).toLocaleString('pt-PT')} · enviado por {p.uploadedByUserName}
                    </p>
                  </div>
                  <a
                    className="text-xs text-red-400 hover:text-red-300 underline"
                    href={p.dataUrl}
                    download={p.fileName}
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}

          {!isAdminFull && (
            <p className="text-[10px] text-gray-600 mt-3">Jado: modo visualização (sem edições).</p>
          )}
        </div>
      )}
    </div>
  );
};
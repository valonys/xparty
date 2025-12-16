import React, { useState } from 'react';
import { suggestCocktail } from '../services/geminiService';
import { Button } from './Button';
import { Wine, Utensils, Clock, Music } from 'lucide-react';

const SCHEDULE = [
    { time: '14:00', title: 'Chegada & Welcome Drinks', desc: 'Convívio na piscina' },
    { time: '16:00', title: 'Torneio Nível X', desc: 'Sueca, Dominó, FIFA' },
    { time: '19:00', title: 'Jantar', desc: 'Abertura do Buffet' },
    { time: '21:00', title: 'Discursos & Traços', desc: 'Tributo 25 Anos' },
    { time: '23:00', title: 'Afterparty', desc: 'DJ Set' },
];

const MENU = [
    { name: 'Gamba Grelhada', type: 'food', desc: 'Molho de manteiga e alho' },
    { name: 'Mufete', type: 'food', desc: 'O clássico de Domingo' },
    { name: 'Caldeirada de Cabrito', type: 'food', desc: 'Cozinhado lentamente' },
    { name: 'Cuca & Nocal', type: 'drink', desc: 'Bem gelada' },
    { name: 'Whisky Reserva', type: 'drink', desc: '18 anos' },
];

export const Program: React.FC = () => {
  const [aiCocktail, setAiCocktail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSuggestCocktail = async () => {
    setIsLoading(true);
    try {
      const suggestion = await suggestCocktail(['Vodka', 'Maracujá', 'Gengibre', 'Açúcar Mascavado']);
      const normalized = (suggestion ?? '').trim();
      setAiCocktail(
        normalized ||
          'Não foi possível gerar o cocktail agora. Tenta de novo mais tarde ou confirma a configuração da IA.'
      );
    } catch {
      setAiCocktail('Não foi possível gerar o cocktail agora. Tenta de novo mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Schedule */}
        <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
                <Clock className="text-red-600" /> Itinerário
            </h2>
            <div className="relative border-l-2 border-neutral-800 ml-4 space-y-8 py-2">
                {SCHEDULE.map((item, i) => (
                    <div key={i} className="relative pl-8">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-neutral-900 border-2 border-red-600"></div>
                        <span className="text-red-500 font-mono text-sm">{item.time}</span>
                        <h3 className="text-lg font-bold text-white">{item.title}</h3>
                        <p className="text-gray-400 text-sm">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>

        {/* Menu */}
        <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
                <Utensils className="text-red-600" /> Menu e Bar
            </h2>
            
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <div className="space-y-4">
                    {MENU.map((item, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-neutral-800 last:border-0 pb-3 last:pb-0">
                            <div>
                                <h4 className="font-semibold text-gray-200">{item.name}</h4>
                                <p className="text-xs text-gray-500">{item.desc}</p>
                            </div>
                            {item.type === 'drink' ? <Wine size={16} className="text-purple-400" /> : <Utensils size={16} className="text-orange-400" />}
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t border-dashed border-neutral-700">
                    <h3 className="font-bold text-white mb-2 flex items-center gap-2"><Music size={16} className="animate-bounce" /> Planeador de Festas IA</h3>
                    <p className="text-xs text-gray-400 mb-4">Pede à IA para inventar um cocktail de assinatura para o grupo.</p>
                    
                    {!aiCocktail ? (
                        <Button onClick={handleSuggestCocktail} isLoading={isLoading} className="w-full">
                            Gerar Cocktail "Nível X"
                        </Button>
                    ) : (
                        <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-lg animate-fade-in">
                            <p className="text-sm font-serif italic text-red-200">{aiCocktail}</p>
                            <button onClick={() => setAiCocktail('')} className="text-xs text-red-500 mt-2 underline">Tentar outro</button>
                        </div>
                    )}
                </div>
            </div>
        </div>

    </div>
  );
};
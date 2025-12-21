import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { createTrace, getTraces, Trace } from '../services/api';
import { generateTraceEnhancement, analyzePartyPhoto } from '../services/geminiService';
import { Button } from './Button';
import { Send, Image as ImageIcon, Sparkles, Clock, Camera } from 'lucide-react';

export const Memories: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [newTraceContent, setNewTraceContent] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const res = await getTraces();
      setTraces(res.traces);
    })();
  }, []);

  const handleEnhance = async () => {
    if (!newTraceContent) return;
    setIsEnhancing(true);
    const enhanced = await generateTraceEnhancement(newTraceContent);
    setNewTraceContent(enhanced);
    setIsEnhancing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setSelectedImagePreview(base64);
        
        // Auto-generate caption for image
        setIsEnhancing(true);
        // Extract base64 data without prefix for Gemini
        const base64Data = base64.split(',')[1];
        const caption = await analyzePartyPhoto(base64Data);
        if (caption) {
            setNewTraceContent(prev => prev ? prev + "\n" + caption : caption);
        }
        setIsEnhancing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = () => {
    if (!newTraceContent && !selectedImageFile) return;

    setIsPosting(true);
    (async () => {
      try {
        await createTrace({ content: newTraceContent, imageFile: selectedImageFile ?? undefined });
        const refreshed = await getTraces();
        setTraces(refreshed.traces);
        setNewTraceContent('');
        setSelectedImageFile(null);
        setSelectedImagePreview(null);
      } finally {
        setIsPosting(false);
      }
    })();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Feed Column */}
      <div className="lg:col-span-2 space-y-6">
         <h2 className="text-2xl font-serif font-bold text-white mb-6">Traços e Memórias</h2>
         
         {traces.map((trace) => (
           <div key={trace.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 relative animate-fade-in-up">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-red-500">
                        {trace.userName.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-200">{trace.userName}</h4>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={10}/> {new Date(trace.createdAt).toLocaleString('pt-PT')}
                        </span>
                    </div>
                </div>
              </div>

              {trace.image?.downloadUrl && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-neutral-800">
                      <img src={trace.image.downloadUrl} alt="Memory" className="w-full h-auto object-cover max-h-96" />
                  </div>
              )}

              <p className="text-gray-300 leading-relaxed italic">"{trace.content}"</p>
              
              <div className="mt-4 pt-4 border-t border-neutral-800 flex gap-4 text-gray-500 text-sm">
                 <button className="hover:text-red-500 transition-colors">Gostar</button>
                 <button className="hover:text-white transition-colors">Comentar</button>
              </div>
           </div>
         ))}
      </div>

      {/* Input Column */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
          <h3 className="font-bold text-lg mb-4 text-white">Deixar um Traço</h3>
          
          <div className="space-y-4">
             <textarea
               className="w-full bg-black/40 border border-neutral-700 rounded-lg p-3 text-white placeholder-gray-600 focus:ring-1 focus:ring-red-600 outline-none resize-none h-32"
               placeholder="Partilha uma memória ou carrega uma foto..."
               value={newTraceContent}
               onChange={(e) => setNewTraceContent(e.target.value)}
             />
             
             {selectedImagePreview && (
                 <div className="relative rounded-lg overflow-hidden border border-neutral-700">
                     <img src={selectedImagePreview ?? ''} alt="Preview" className="w-full h-32 object-cover opacity-50" />
                     <button 
                        onClick={() => { setSelectedImageFile(null); setSelectedImagePreview(null); }}
                        className="absolute top-1 right-1 bg-black/80 p-1 rounded-full text-white hover:text-red-500"
                     >
                         <div className="h-4 w-4 flex items-center justify-center font-bold">×</div>
                     </button>
                 </div>
             )}

             <div className="flex gap-2">
               <input 
                 type="file" 
                 accept="image/*" 
                 className="hidden" 
                 ref={fileInputRef}
                 onChange={handleImageUpload}
               />
               <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex-1">
                 <Camera size={18} />
               </Button>
               <Button 
                variant="secondary" 
                onClick={handleEnhance} 
                disabled={!newTraceContent || isEnhancing}
                className="flex-1 text-purple-400 hover:text-purple-300 border-purple-900/30 bg-purple-900/10"
                title="IA Mágica"
               >
                 <Sparkles size={18} className={isEnhancing ? 'animate-pulse' : ''} />
               </Button>
             </div>

             <Button 
                className="w-full py-3" 
                onClick={handlePost} 
                disabled={isPosting || (!newTraceContent && !selectedImageFile)}
                isLoading={isPosting}
             >
               <Send size={18} /> Publicar Traço
             </Button>
             
             <p className="text-[10px] text-center text-gray-600 mt-2">
                 IA powered by Gemini Flash
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
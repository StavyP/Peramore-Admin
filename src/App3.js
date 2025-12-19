import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Camera, MessageSquare, Archive, History, Phone, Mail, AlertTriangle, X, Clock, Edit3, ShoppingBag, Sparkles, Scissors } from 'lucide-react';

const AdminPanel = () => {
  // --- CONFIGURATION ---
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxPWN77ieddPea41u8XUdqmghNExHLAwH9tYzprlXCSnCj2KLCJOQw_ayzhPmnl9E_O/exec";

  // --- ÉTATS PRINCIPAUX ---
  const [activeTab, setActiveTab] = useState('messages');
  const [items, setItems] = useState(() => JSON.parse(localStorage.getItem('peramore_items')) || []);
  const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem('peramore_msgs')) || []);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // États Formulaire
  const [isEditing, setIsEditing] = useState(null); 
  const [newItem, setNewItem] = useState({ nom: '', prix: '', dimension: '', lien_image: '', categorie: '', type: 'collection' });

  // États Modal de Suppression Unifiée (Messages + Produits)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); 
  const [secondsLeft, setSecondsLeft] = useState(3);
  
  // État Modal Image
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // --- RÉCUPÉRATION DES DONNÉES ---
  const fetchData = useCallback(async () => {
    try {
      const [pRes, mRes] = await Promise.all([
        fetch(`${SCRIPT_URL}?action=get_products`).then(r => r.json()),
        fetch(`${SCRIPT_URL}?action=get_messages`).then(r => r.json())
      ]);
      localStorage.setItem('peramore_items', JSON.stringify(pRes));
      localStorage.setItem('peramore_msgs', JSON.stringify(mRes));
      setItems(pRes);
      setMessages(mRes);
      setUnreadCount(mRes.filter(m => m.statut === 'nouveau').length);
    } catch (e) { console.error("Erreur sync", e); }
  }, [SCRIPT_URL]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // --- LOGIQUE DU VERROU ---
  useEffect(() => {
    let interval;
    if (showDeleteModal && secondsLeft > 0) {
      interval = setInterval(() => setSecondsLeft((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showDeleteModal, secondsLeft]);

  // --- ACTIONS PRODUITS ---
  const handleProductSubmit = async () => {
    const action = isEditing ? 'update_product' : 'add_item';
    const finalType = (activeTab === 'collection' || activeTab === 'galerie') ? activeTab : newItem.type;
    const payload = { ...newItem, type: finalType };

    if(isEditing) {
      setItems(items.map(i => i.nom === isEditing.nom ? payload : i));
    } else {
      setItems([...items, payload]);
    }

    await fetch(SCRIPT_URL, { 
      method: 'POST', 
      mode: 'no-cors', 
      body: JSON.stringify({ action, ...payload, oldNom: isEditing?.nom }) 
    });
    
    setIsEditing(null);
    setNewItem({ nom: '', prix: '', dimension: '', lien_image: '', categorie: '', type: finalType });
    fetchData();
  };

  const startEdit = (item) => {
    setIsEditing(item);
    setNewItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
    if (secondsLeft > 0) return;
    const target = deleteTarget;
    setShowDeleteModal(false);

    if (target.type_obj === 'message') {
      setMessages(messages.filter(m => !(m.nom === target.nom && m.message === target.message)));
      await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'update_message', clientNom: target.nom, msgContent: target.message, status: 'delete' })});
    } else {
      setItems(items.filter(i => i.nom !== target.nom));
      await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'delete_product', nom: target.nom })});
    }
    fetchData();
  };

  // --- ACTIONS MESSAGES ---
  const archiveMessage = async (msg, targetStatus) => {
    setMessages(messages.map(m => (m.nom === msg.nom && m.message === msg.message) ? { ...m, statut: targetStatus } : m));
    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'update_message', clientNom: msg.nom, msgContent: msg.message, status: targetStatus })});
  };

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return;
    setMessages(messages.map(m => m.statut === 'nouveau' ? { ...m, statut: 'lu' } : m));
    setUnreadCount(0);
    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'mark_all_read' }) });
  }, [unreadCount, messages, SCRIPT_URL]);

  useEffect(() => {
    if (activeTab === 'messages') markAllAsRead();
  }, [activeTab, markAllAsRead]);

  const existingCategories = [...new Set(items.map(i => i.categorie))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-stone-50 p-4 md:p-8 font-['Poppins']">
      
      {/* Animations de fond */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-5">
        <Scissors className="absolute top-20 left-10 w-16 h-16 text-slate-600 animate-pulse" style={{ animationDelay: '0s' }} />
        <Sparkles className="absolute top-40 right-20 w-12 h-12 text-amber-500 animate-pulse" style={{ animationDelay: '1s' }} />
        <Scissors className="absolute bottom-32 right-40 w-20 h-20 text-slate-600 animate-pulse" style={{ animationDelay: '2s' }} />
        <Sparkles className="absolute bottom-20 left-32 w-10 h-10 text-amber-500 animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* MODAL DE SUPPRESSION */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center border-4 border-red-100">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <AlertTriangle size={40} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-slate-800">Supprimer définitivement ?</h3>
            <p className="text-slate-500 mb-6 font-semibold text-sm">{deleteTarget?.nom}</p>
            
            <div className="w-full h-2 bg-slate-100 rounded-full mb-8 overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-1000 ease-linear rounded-full" 
                style={{ width: `${((3 - secondsLeft) / 3) * 100}%` }}
              />
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)} 
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 rounded-2xl font-bold text-slate-700 transition-all transform hover:scale-105 shadow-md"
              >
                Annuler
              </button>
              <button 
                onClick={confirmDelete} 
                disabled={secondsLeft > 0} 
                className={`flex-1 py-4 rounded-2xl font-bold text-white transition-all shadow-lg ${
                  secondsLeft > 0 
                    ? 'bg-slate-300 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transform hover:scale-105'
                }`}
              >
                {secondsLeft > 0 ? (
                  <span className="flex items-center justify-center gap-2">
                    <Clock size={18} /> {secondsLeft}s
                  </span>
                ) : (
                  'Confirmer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMAGE EN GRAND */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-6xl max-h-[90vh] w-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-4 -right-4 bg-white text-slate-700 p-3 rounded-full shadow-2xl hover:bg-slate-100 transition-all z-10 hover:rotate-90 transform duration-300"
            >
              <X size={24} />
            </button>
            <img
              src={selectedImage.url}
              alt={selectedImage.nom}
              className="w-full h-full object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent p-6 rounded-b-2xl">
              <h3 className="text-white font-bold text-xl mb-1">{selectedImage.nom}</h3>
              {selectedImage.categorie && (
                <p className="text-slate-300 text-sm">{selectedImage.categorie}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto relative">
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row justify-between items-center mb-12 bg-white/90 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-slate-200 gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Sparkles className="w-10 h-10 text-amber-500" />
              <div className="absolute inset-0 animate-ping opacity-20">
                <Sparkles className="w-10 h-10 text-amber-500" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 italic">Peramore</h1>
              <p className="text-sm text-slate-500 font-medium">Panneau d'administration</p>
            </div>
          </div>
          
          <nav className="flex bg-gradient-to-r from-slate-100 to-slate-50 p-2 rounded-2xl shadow-inner gap-1">
            {[
              { id: 'messages', icon: <MessageSquare size={20} />, label: 'Messages' },
              { id: 'archives', icon: <Archive size={20} />, label: 'Archives' },
              { id: 'collection', icon: <ShoppingBag size={20} />, label: 'Boutique' },
              { id: 'galerie', icon: <Camera size={20} />, label: 'Galerie' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setIsEditing(null); }}
                className={`px-6 py-3 rounded-xl flex items-center gap-3 transition-all whitespace-nowrap font-semibold ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg transform scale-105'
                    : 'text-slate-600 hover:bg-white hover:shadow-md'
                }`}
              >
                {tab.icon}
                <span className="hidden md:inline">{tab.label}</span>
                {tab.id === 'messages' && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </header>

        {(activeTab === 'collection' || activeTab === 'galerie') ? (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* FORMULAIRE */}
            <div className="lg:col-span-1">
              <div className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border-2 border-slate-100 space-y-5 sticky top-8">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <Edit3 className="w-6 h-6 text-amber-600" />
                    ) : (
                      <Sparkles className="w-6 h-6 text-slate-700" />
                    )}
                    <h3 className="font-bold text-lg text-slate-800">
                      {isEditing ? 'Modifier' : 'Nouveau'} {activeTab === 'collection' ? 'produit' : 'média'}
                    </h3>
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => {
                        setIsEditing(null);
                        setNewItem({ nom: '', prix: '', dimension: '', lien_image: '', categorie: '', type: activeTab });
                      }}
                      className="text-red-500 bg-red-50 p-2 rounded-full hover:bg-red-100 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <input
                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-slate-100 focus:border-amber-500 focus:bg-white transition-all font-medium"
                    placeholder="Nom de l'article"
                    value={newItem.nom}
                    onChange={e => setNewItem({ ...newItem, nom: e.target.value })}
                  />

                  {activeTab === 'collection' && (
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        className="p-4 bg-slate-50 rounded-2xl outline-none border-2 border-slate-100 focus:border-amber-500 focus:bg-white transition-all font-bold text-amber-600"
                        placeholder="Prix €"
                        value={newItem.prix}
                        onChange={e => setNewItem({ ...newItem, prix: e.target.value })}
                      />
                      <input
                        className="p-4 bg-slate-50 rounded-2xl outline-none border-2 border-slate-100 focus:border-amber-500 focus:bg-white transition-all font-medium"
                        placeholder="Dimensions"
                        value={newItem.dimension}
                        onChange={e => setNewItem({ ...newItem, dimension: e.target.value })}
                      />
                    </div>
                  )}

                  <input
                    list="cats"
                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-slate-100 focus:border-amber-500 focus:bg-white transition-all font-medium"
                    placeholder="Catégorie"
                    value={newItem.categorie}
                    onChange={e => setNewItem({ ...newItem, categorie: e.target.value })}
                  />
                  <datalist id="cats">
                    {existingCategories.map((c, i) => (
                      <option key={i} value={c} />
                    ))}
                  </datalist>

                  <input
                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-slate-100 focus:border-amber-500 focus:bg-white transition-all text-sm font-mono"
                    placeholder="URL de l'image"
                    value={newItem.lien_image}
                    onChange={e => setNewItem({ ...newItem, lien_image: e.target.value })}
                  />
                </div>

                <button
                  onClick={handleProductSubmit}
                  className={`w-full py-5 rounded-2xl font-bold uppercase text-sm tracking-wider shadow-lg transition-all transform hover:scale-105 ${
                    isEditing
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700'
                      : 'bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:from-slate-800 hover:to-slate-900'
                  }`}
                >
                  {isEditing ? '✓ Sauvegarder' : '+ Publier'}
                </button>
              </div>
            </div>

            {/* LISTE DES PRODUITS */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {items.filter(i => i.type === activeTab).map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-3xl border-2 border-slate-100 flex gap-4 items-start group hover:shadow-2xl hover:border-amber-200 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={item.lien_image}
                      className="w-28 h-28 object-cover rounded-2xl bg-slate-100 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                      alt={item.nom}
                      onClick={() => {
                        setSelectedImage({ url: item.lien_image, nom: item.nom, categorie: item.categorie });
                        setShowImageModal(true);
                      }}
                    />
                    {activeTab === 'collection' && item.prix && (
                      <div className="absolute -top-2 -right-2 bg-gradient-to-br from-amber-400 to-amber-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                        {item.prix}€
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-base text-slate-800 truncate mb-1">{item.nom}</h4>
                    <p className="text-xs text-slate-500 font-semibold mb-2 truncate">
                      {item.categorie || 'Sans catégorie'}
                    </p>
                    {activeTab === 'collection' && item.dimension && (
                      <p className="text-xs text-slate-400 mb-3">{item.dimension}</p>
                    )}

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-all shadow-sm hover:shadow-md"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteTarget({ ...item, type_obj: 'product' });
                          setSecondsLeft(3);
                          setShowDeleteModal(true);
                        }}
                        className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all shadow-sm hover:shadow-md"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {items.filter(i => i.type === activeTab).length === 0 && (
                <div className="col-span-2 text-center py-20">
                  <Scissors className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">Aucun élément pour le moment</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MESSAGES & ARCHIVES */
          <div className="max-w-3xl mx-auto space-y-5">
            {(activeTab === 'messages'
              ? messages.filter(m => m.statut !== 'archive')
              : messages.filter(m => m.statut === 'archive')
            ).map((m, i) => (
              <div
                key={i}
                className={`p-6 rounded-3xl bg-white shadow-lg border-l-8 transition-all hover:shadow-2xl ${
                  m.statut === 'nouveau'
                    ? 'border-amber-500 shadow-amber-100'
                    : 'border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-lg text-slate-800">{m.nom}</h4>
                      {m.statut === 'nouveau' && (
                        <span className="bg-amber-500 text-white text-xs px-3 py-1 rounded-full font-bold animate-pulse">
                          Nouveau
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {new Date(m.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setDeleteTarget({ ...m, type_obj: 'message' });
                        setSecondsLeft(3);
                        setShowDeleteModal(true);
                      }}
                      className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all rounded-xl"
                    >
                      <Trash2 size={20} />
                    </button>
                    <button
                      onClick={() => archiveMessage(m, activeTab === 'messages' ? 'archive' : 'lu')}
                      className="p-3 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all rounded-xl"
                    >
                      {activeTab === 'messages' ? <Archive size={20} /> : <History size={20} />}
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-6 rounded-2xl border border-slate-100 mb-4">
                  <p className="text-slate-700 italic leading-relaxed">"{m.message}"</p>
                </div>

                <div className="space-y-3">
                  {/* Email */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <Mail size={18} className="text-amber-600" />
                      <span className="text-sm font-medium text-slate-700">{m.email}</span>
                    </div>
                    <a
                      href={`mailto:${m.email}`}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-semibold text-sm hover:from-amber-600 hover:to-amber-700 transition-all transform hover:scale-105 shadow-md"
                    >
                      Répondre
                    </a>
                  </div>

                  {/* Téléphone */}
                  {m.phone && (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                      <Phone size={18} className="text-blue-600" />
                      <span className="text-sm font-medium text-slate-700">{m.phone}</span>
                    </div>
                  )}

                  {/* Préférence de contact */}
                  {m.preferenceContact && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 pl-3">
                      <span className="font-semibold">Préférence de réponse:</span>
                      <span className="bg-slate-100 px-3 py-1 rounded-full font-medium">
                        {m.preferenceContact === 'email' ? '📧 Email' : '📱 SMS/Message'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {(activeTab === 'messages'
              ? messages.filter(m => m.statut !== 'archive')
              : messages.filter(m => m.statut === 'archive')
            ).length === 0 && (
              <div className="text-center py-20">
                <MessageSquare className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">
                  {activeTab === 'messages' ? 'Aucun message' : 'Aucune archive'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
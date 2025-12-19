// https://script.google.com/macros/s/AKfycbwX5Xvh0J3tPdB_VEoBjmRDNH_Y0OLeAfRbGylHZB1soKVRApUzJO_VMJ-X9CFcUHXE/exec
import React, { useState } from 'react';

const App = () => {
  const [formData, setFormData] = useState({ nom: '', message: '' });
  const [status, setStatus] = useState('');

  // REMPLACE PAR TON URL GOOGLE APPS SCRIPT
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwX5Xvh0J3tPdB_VEoBjmRDNH_Y0OLeAfRbGylHZB1soKVRApUzJO_VMJ-X9CFcUHXE/exec';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Envoi en cours...');

    try {
      // On utilise 'no-cors' car Google Script fait des redirections complexes
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Important pour Google Apps Script
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      setStatus('Données envoyées avec succès !');
      setFormData({ nom: '', message: '' });
    } catch (error) {
      setStatus("Erreur lors de l'envoi.");
      console.error(error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Envoyer vers Google Sheets</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        <input
          type="text"
          placeholder="Votre nom"
          value={formData.nom}
          onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
          required
        />
        <textarea
          placeholder="Votre message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          required
        />
        <button type="submit">Envoyer</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
};

export default App;
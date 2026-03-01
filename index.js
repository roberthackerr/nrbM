// index.js
const express = require('express');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration Gmail OAuth2
const oauth2Client = new google.auth.OAuth2(
 "877979758824-p9tsgqk3u0lccq3cpvhse7dk1u2b4iab.apps.googleusercontent.com",
  "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",
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

// Fonction pour créer le transporteur
async function createTransporter() {
  try {
    const accessToken = await oauth2Client.getAccessToken();
    
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: "tojolinos@gmail.com",
        clientId: "877979758824-p9tsgqk3u0lccq3cpvhse7dk1u2b4iab.apps.googleusercontent.com",
        clientSecret: "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",
        refreshToken: "1//04FSYcRVAkCOICgYIARAAGAQSNwF-L9IrYO0Dqzt7Tkx3K1xMJu-WoMFDV0i6GhWNBvT-HPl2ygtf3Tta_XeHdZN4xQXv3NiSff0",
        accessToken: accessToken.token
      }
    });
  } catch (error) {
    console.error('Erreur création transporteur:', error);
    throw error;
  }
}

// Route de test
app.get('/', (req, res) => {
  res.json({ 
    message: 'Service d\'emails opérationnel',
    status: 'OK',
    time: new Date().toISOString()
  });
});

// Route pour vérifier la connexion Gmail
app.get('/verify', async (req, res) => {
  try {
    const transporter = await createTransporter();
    await transporter.verify();
    res.json({ 
      success: true, 
      message: 'Connexion Gmail établie',
      user: process.env.GMAIL_USER
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Route pour envoyer un email simple
app.post('/send', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ 
        error: 'Champs requis: to, subject, et (html ou text)' 
      });
    }

    const transporter = await createTransporter();
    
    const mailOptions = {
      from: `"NrbTalents" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Version texte simple
    };

    const result = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Erreur envoi:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Route pour email de bienvenue
app.post('/welcome', async (req, res) => {
  try {
    const { to, userName, activationLink } = req.body;
    
    const html = `
      <h1>Bienvenue ${userName} !</h1>
      <p>Merci de rejoindre NrbTalents.</p>
      ${activationLink ? `<p>Activez votre compte : <a href="${activationLink}">${activationLink}</a></p>` : ''}
      <p>À bientôt !</p>
      <p>L'équipe NrbTalents</p>
    `;

    const transporter = await createTransporter();
    
    const result = await transporter.sendMail({
      from: `"NrbTalents" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Bienvenue ${userName} sur NrbTalents !`,
      html
    });

    res.json({
      success: true,
      messageId: result.messageId,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour réinitialisation mot de passe
app.post('/reset-password', async (req, res) => {
  try {
    const { to, resetLink } = req.body;
    
    const html = `
      <h1>Réinitialisation de mot de passe</h1>
      <p>Cliquez sur ce lien pour réinitialiser votre mot de passe :</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Ce lien expire dans 24 heures.</p>
      <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
    `;

    const transporter = await createTransporter();
    
    const result = await transporter.sendMail({
      from: `"NrbTalents" <${process.env.GMAIL_USER}>`,
      to,
      subject: 'Réinitialisation de votre mot de passe',
      html
    });

    res.json({ success: true, messageId: result.messageId });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Démarrage du serveur
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📧 GMAIL_USER: ${process.env.GMAIL_USER}`);
  });
}

// Export pour Vercel
module.exports = app;
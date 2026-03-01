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
  process.env.GMAIL_CLIENT_ID || "877979758824-p9tsgqk3u0lccq3cpvhse7dk1u2b4iab.apps.googleusercontent.com",
  process.env.GMAIL_CLIENT_SECRET || "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",
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

// Dictionnaire des sujets par langue
const subjectTranslations = {
  'welcome': {
    'fr': 'Bienvenue sur NrbTalents !',
    'en': 'Welcome to NrbTalents!',
    'es': '¡Bienvenido a NrbTalents!',
    'mg': "Tongasoa eto NrbTalents !"
  },
  'password-reset': {
    'fr': 'Réinitialisation de votre mot de passe',
    'en': 'Reset your password',
    'es': 'Restablecer tu contraseña',
    'mg': "Hanova ny tenimiafinao"
  },
  'email-verification': {
    'fr': 'Vérifiez votre email - NrbTalents',
    'en': 'Verify your email - NrbTalents',
    'es': 'Verifica tu email - NrbTalents',
    'mg': "Hamarinina ny mailakao - NrbTalents"
  }
};

/**
 * Obtenir le sujet traduit
 */
function getTranslatedSubject(templateName, lang = 'fr') {
  const translations = subjectTranslations[templateName];
  if (!translations) return templateName;
  return translations[lang] || translations['fr'] || templateName;
}

/**
 * Créer le contenu HTML pour l'email de vérification (multilingue)
 */
function getVerificationEmailHtml(lang, verificationUrl) {
  const content = {
    'fr': {
      title: "Vérifiez votre email",
      subtitle: "Presque terminé!",
      message: "Veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :",
      button: "Vérifier mon email",
      linkText: "Ou copiez et collez ce lien dans votre navigateur :",
      expire: "Ce lien expirera dans 24 heures.",
      ignore: "Si vous n'avez pas créé de compte, vous pouvez ignorer cet email."
    },
    'en': {
      title: "Verify your email",
      subtitle: "Almost there!",
      message: "Please verify your email address by clicking the button below:",
      button: "Verify Email",
      linkText: "Or copy and paste this link in your browser:",
      expire: "This link will expire in 24 hours.",
      ignore: "If you didn't create an account, you can ignore this email."
    },
    'es': {
      title: "Verifica tu email",
      subtitle: "¡Casi listo!",
      message: "Por favor verifica tu email haciendo clic en el botón:",
      button: "Verificar Email",
      linkText: "O copia y pega este enlace en tu navegador:",
      expire: "Este enlace expirará en 24 horas.",
      ignore: "Si no creaste una cuenta, puedes ignorar este email."
    },
    'mg': {
      title: "Hamarinina ny mailakao",
      subtitle: "Efa saika vita!",
      message: "Hamarinino ny adiresy mailakao amin'ny fipihana ity bokotra ity:",
      button: "Hamarinina ny mailaka",
      linkText: "Na dikao ity rohy ity ary apetaho amin'ny navigateur anao:",
      expire: "Hifoka ao anatin'ny 24 ora ity rohy ity.",
      ignore: "Raha tsy namorona kaonty ianao dia tsy miraharaha ity mailaka ity."
    }
  };

  const c = content[lang] || content['fr'];

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; color: white; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">${c.title}</h1>
      </div>
      <div style="padding: 40px;">
        <h2 style="color: #333;">${c.subtitle}</h2>
        <p style="color: #666; line-height: 1.6;">${c.message}</p>
        <div style="text-align: center; margin: 40px 0;">
          <a href="${verificationUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            ${c.button}
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">${c.linkText}</p>
        <code style="background: #f5f5f5; padding: 5px 10px; border-radius: 3px; font-size: 12px; display: block; word-break: break-all;">
          ${verificationUrl}
        </code>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #666; font-size: 12px;">
            ${c.expire}<br>
            ${c.ignore}
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Créer la version texte de l'email de vérification (multilingue)
 */
function getVerificationEmailText(lang, url) {
  const content = {
    'fr': `Vérifiez votre email\n\nPresque terminé!\n\nVeuillez vérifier votre adresse email en visitant ce lien :\n${url}\n\nCe lien expirera dans 24 heures.\nSi vous n'avez pas créé de compte, ignorez cet email.`,
    'en': `Verify your email\n\nAlmost there!\n\nPlease verify your email by visiting:\n${url}\n\nThis link expires in 24 hours.\nIf you didn't create an account, ignore this email.`,
    'es': `Verifica tu email\n\n¡Casi listo!\n\nPor favor verifica tu email visitando:\n${url}\n\nEste enlace expira en 24 horas.\nSi no creaste una cuenta, ignora este email.`,
    'mg': `Hamarinina ny mailakao\n\nEfa saika vita!\n\nHamarinino ny mailakao amin'ny fitsidihana ity rohy ity:\n${url}\n\nHifoka ao anatin'ny 24 ora ity rohy ity.\nRaha tsy namorona kaonty ianao dia tsy miraharaha ity mailaka ity.`
  };
  return content[lang] || content['fr'];
}

// Fonction pour créer le transporteur
async function createTransporter() {
  try {
    const accessToken = await oauth2Client.getAccessToken();
    
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER || "tojolinos@gmail.com",
        clientId: process.env.GMAIL_CLIENT_ID || "877979758824-p9tsgqk3u0lccq3cpvhse7dk1u2b4iab.apps.googleusercontent.com",
        clientSecret: process.env.GMAIL_CLIENT_SECRET || "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",
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token
      }
    });
  } catch (error) {
    console.error('❌ Erreur création transporteur:', error);
    throw error;
  }
}

// Route de test
app.get('/', (req, res) => {
  res.json({ 
    message: 'Service d\'emails opérationnel',
    status: 'OK',
    time: new Date().toISOString(),
    supportedLanguages: ['fr', 'en', 'es', 'mg']
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
      user: process.env.GMAIL_USER,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Route pour envoyer un email simple
app.post('/send', async (req, res) => {
  try {
    const { to, subject, html, text, lang = 'fr' } = req.body;
    
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ 
        success: false,
        error: 'Champs requis: to, subject, et (html ou text)' 
      });
    }

    const transporter = await createTransporter();
    
    const mailOptions = {
      from: `"NrbTalents" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    };

    const result = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
      lang: lang,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur envoi:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Route pour envoyer un email basé sur un template
app.post('/send-template', async (req, res) => {
  try {
    const { to, templateName, data, lang = 'fr' } = req.body;
    
    if (!to || !templateName) {
      return res.status(400).json({ 
        success: false,
        error: 'Champs requis: to, templateName' 
      });
    }

    // Utiliser le sujet traduit ou celui fourni dans data
    const subject = data._subject || getTranslatedSubject(templateName, lang);
    
    // Générer le HTML selon le template
    let html = '';
    let text = '';

    switch(templateName) {
      case 'welcome':
        html = `
          <h1>Bienvenue ${data.userName || ''} !</h1>
          <p>Merci de rejoindre NrbTalents.</p>
          ${data.activationLink ? `<p>Activez votre compte : <a href="${data.activationLink}">${data.activationLink}</a></p>` : ''}
          <p>À bientôt !</p>
          <p>L'équipe NrbTalents</p>
          <p>© ${data.year || new Date().getFullYear()} NrbTalents</p>
        `;
        text = `Bienvenue ${data.userName || ''} !\nMerci de rejoindre NrbTalents.\n${data.activationLink ? `Activez votre compte : ${data.activationLink}` : ''}\nÀ bientôt !\nL'équipe NrbTalents`;
        break;
        
      case 'password-reset':
        html = `
          <h1>Réinitialisation de mot de passe</h1>
          <p>Cliquez sur ce lien pour réinitialiser votre mot de passe :</p>
          <p><a href="${data.resetLink}">${data.resetLink}</a></p>
          <p>Ce lien expire dans ${data.expiryHours || 1} heure.</p>
          <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
          <p>© ${data.year || new Date().getFullYear()} NrbTalents</p>
        `;
        text = `Réinitialisation de mot de passe\nCliquez sur ce lien : ${data.resetLink}\nCe lien expire dans ${data.expiryHours || 1} heure.\nSi vous n'avez pas demandé cette réinitialisation, ignorez cet email.`;
        break;
        
      case 'email-verification':
        html = getVerificationEmailHtml(lang, data.verificationUrl || data.resetLink);
        text = getVerificationEmailText(lang, data.verificationUrl || data.resetLink);
        break;
        
      default:
        return res.status(400).json({ 
          success: false,
          error: `Template non supporté: ${templateName}` 
        });
    }

    const transporter = await createTransporter();
    
    const mailOptions = {
      from: `"NrbTalents" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text
    };

    const result = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
      templateName,
      lang,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur envoi template:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Route pour email de bienvenue (compatibilité avec ancienne version)
app.post('/welcome', async (req, res) => {
  try {
    const { to, userName, activationLink, lang = 'fr' } = req.body;
    
    const data = {
      userName,
      activationLink,
      year: new Date().getFullYear()
    };

    // Rediriger vers le nouveau endpoint
    const response = await fetch(`http://localhost:${PORT}/send-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        templateName: 'welcome',
        data,
        lang
      })
    });

    const result = await response.json();
    res.json(result);

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour réinitialisation mot de passe (compatibilité avec ancienne version)
app.post('/reset-password', async (req, res) => {
  try {
    const { to, resetLink, lang = 'fr' } = req.body;
    
    const data = {
      resetLink,
      expiryHours: 1,
      year: new Date().getFullYear()
    };

    // Rediriger vers le nouveau endpoint
    const response = await fetch(`http://localhost:${PORT}/send-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        templateName: 'password-reset',
        data,
        lang
      })
    });

    const result = await response.json();
    res.json(result);

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour obtenir les langues supportées
app.get('/languages', (req, res) => {
  res.json({
    supported: ['fr', 'en', 'es', 'mg'],
    default: 'fr'
  });
});

// Démarrage du serveur
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📧 GMAIL_USER: ${process.env.GMAIL_USER || "tojolinos@gmail.com"}`);
    console.log(`🌐 Langues supportées: fr, en, es, mg`);
  });
}

// Export pour Vercel
module.exports = app;
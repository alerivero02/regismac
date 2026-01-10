import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(emailConfig);
    }
  }

  async sendEmail({ to, subject, html, text }) {
    if (!this.transporter) {
      return { success: false, message: 'Servizio email non configurato' };
    }

    try {
      const mailOptions = {
        from: `"RegisMAC" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Errore invio email:', error.message);
      console.error('   Dettagli:', error);
      return { success: false, error: error.message };
    }
  }

  async notifyComercialOrdineRichiesto({ ordine, materiale, tecnico, comercialEmail }) {
    const subject = `Nuovo Ordine Materiale Richiesto - ${materiale.cod_articolo}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
          .label { font-weight: bold; color: #666; }
          .value { color: #333; margin-left: 10px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Nuovo Ordine Materiale Richiesto</h2>
          </div>
          <div class="content">
            <p>Ciao,</p>
            <p>Un nuovo ordine di materiale è stato richiesto dal tecnico <strong>${tecnico.nome} ${tecnico.apellido || ''}</strong>.</p>
            
            <div class="info-box">
              <div><span class="label">Codice Articolo:</span><span class="value">${materiale.cod_articolo}</span></div>
              <div><span class="label">Descrizione:</span><span class="value">${materiale.descrizione}</span></div>
              <div><span class="label">Fornitore:</span><span class="value">${materiale.fornitore}</span></div>
              <div><span class="label">Quantità:</span><span class="value">${ordine.quantita} ${materiale.unita_misura || 'pz'}</span></div>
              <div><span class="label">Data Richiesta:</span><span class="value">${new Date(ordine.data_richiesta).toLocaleDateString('it-IT')}</span></div>
              ${ordine.note ? `<div><span class="label">Note:</span><span class="value">${ordine.note}</span></div>` : ''}
            </div>
            
            <p>Accedi al sistema per gestire l'ordine.</p>
            
            <div class="footer">
              <p>Questo è un messaggio automatico da RegisMAC</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Nuovo Ordine Materiale Richiesto

Un nuovo ordine di materiale è stato richiesto dal tecnico ${tecnico.nome} ${tecnico.apellido || ''}.

Dettagli Ordine:
- Codice Articolo: ${materiale.cod_articolo}
- Descrizione: ${materiale.descrizione}
- Fornitore: ${materiale.fornitore}
- Quantità: ${ordine.quantita} ${materiale.unita_misura || 'pz'}
- Data Richiesta: ${new Date(ordine.data_richiesta).toLocaleDateString('it-IT')}
${ordine.note ? `- Note: ${ordine.note}` : ''}

Accedi al sistema per gestire l'ordine.

Questo è un messaggio automatico da RegisMAC
    `;

    return await this.sendEmail({
      to: comercialEmail,
      subject,
      html,
      text,
    });
  }

  async notifyComercialOrdiniRichiesti({ ordini, tecnico, comercialEmail }) {
    // Agrupar órdenes por fornitore
    const ordiniPerFornitore = {};
    ordini.forEach(ordine => {
      const fornitore = ordine.materiale?.fornitore || 'Sconosciuto';
      if (!ordiniPerFornitore[fornitore]) {
        ordiniPerFornitore[fornitore] = [];
      }
      ordiniPerFornitore[fornitore].push(ordine);
    });

    const totalMateriali = ordini.length;
    const subject = `Nuovo Ordine Materiali Richiesto - ${totalMateriali} materiale${totalMateriali !== 1 ? 'i' : ''}`;
    
    // Construir HTML con todos los materiales
    let materialiHtml = '';
    Object.keys(ordiniPerFornitore).forEach(fornitore => {
      materialiHtml += `<div style="margin: 15px 0; padding: 15px; background: white; border-radius: 5px; border-left: 4px solid #667eea;">`;
      materialiHtml += `<h3 style="margin-top: 0; color: #667eea;">Fornitore: ${fornitore}</h3>`;
      ordiniPerFornitore[fornitore].forEach(ordine => {
        const materiale = ordine.materiale;
        materialiHtml += `
          <div style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 3px;">
            <div><span class="label">Codice Articolo:</span><span class="value">${materiale?.cod_articolo || '-'}</span></div>
            <div><span class="label">Descrizione:</span><span class="value">${materiale?.descrizione || '-'}</span></div>
            <div><span class="label">Quantità:</span><span class="value">${ordine.quantita} ${materiale?.unita_misura || 'pz'}</span></div>
            ${ordine.note ? `<div><span class="label">Note:</span><span class="value">${ordine.note}</span></div>` : ''}
          </div>
        `;
      });
      materialiHtml += `</div>`;
    });

    const dataRichiesta = ordini[0]?.data_richiesta ? new Date(ordini[0].data_richiesta).toLocaleDateString('it-IT') : new Date().toLocaleDateString('it-IT');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
          .label { font-weight: bold; color: #666; }
          .value { color: #333; margin-left: 10px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Nuovo Ordine Materiali Richiesto</h2>
          </div>
          <div class="content">
            <p>Ciao,</p>
            <p>Un nuovo ordine di <strong>${totalMateriali} materiale${totalMateriali !== 1 ? 'i' : ''}</strong> è stato richiesto dal tecnico <strong>${tecnico.nome} ${tecnico.apellido || ''}</strong>.</p>
            
            <div class="info-box">
              <div><span class="label">Data Richiesta:</span><span class="value">${dataRichiesta}</span></div>
            </div>
            
            <h3 style="color: #667eea; margin-top: 20px;">Materiali Richiesti:</h3>
            ${materialiHtml}
            
            <p style="margin-top: 20px;">Accedi al sistema per gestire l'ordine.</p>
            
            <div class="footer">
              <p>Questo è un messaggio automatico da RegisMAC</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Construir texto plano
    let materialiText = '';
    Object.keys(ordiniPerFornitore).forEach(fornitore => {
      materialiText += `\nFornitore: ${fornitore}\n`;
      ordiniPerFornitore[fornitore].forEach(ordine => {
        const materiale = ordine.materiale;
        materialiText += `  - Codice Articolo: ${materiale?.cod_articolo || '-'}\n`;
        materialiText += `    Descrizione: ${materiale?.descrizione || '-'}\n`;
        materialiText += `    Quantità: ${ordine.quantita} ${materiale?.unita_misura || 'pz'}\n`;
        if (ordine.note) {
          materialiText += `    Note: ${ordine.note}\n`;
        }
        materialiText += '\n';
      });
    });

    const text = `
Nuovo Ordine Materiali Richiesto

Un nuovo ordine di ${totalMateriali} materiale${totalMateriali !== 1 ? 'i' : ''} è stato richiesto dal tecnico ${tecnico.nome} ${tecnico.apellido || ''}.

Data Richiesta: ${dataRichiesta}

Materiali Richiesti:
${materialiText}

Accedi al sistema per gestire l'ordine.

Questo è un messaggio automatico da RegisMAC
    `;

    return await this.sendEmail({
      to: comercialEmail,
      subject,
      html,
      text,
    });
  }
}

export default new EmailService();


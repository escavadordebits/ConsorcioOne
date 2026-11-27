const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 8080;
const API_KEY = process.env.API_KEY || 'c7contempla_secret_key';

app.use(cors({ origin: '*' }));
app.use(express.json());

// Armazenamento de instâncias em memória
const instances = {};

// Auth middleware simples
const authMiddleware = (req, res, next) => {
  const reqApiKey = req.headers['apikey'] || req.query.apikey;
  if (API_KEY && reqApiKey && reqApiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }
  next();
};

app.use(authMiddleware);

async function getOrCreateInstance(instanceName) {
  if (instances[instanceName]) {
    return instances[instanceName];
  }

  const authDir = path.join(__dirname, 'sessions', instanceName);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const instData = {
    name: instanceName,
    sock: null,
    status: 'close',
    qrBase64: null,
    ownerNumber: null
  };

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    browser: ['ConsorcioOne', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrImg = await qrcode.toDataURL(qr);
        instData.qrBase64 = qrImg;
        instData.status = 'connecting';
        console.log(`[${instanceName}] Novo QR Code gerado para conexão`);
      } catch (err) {
        console.error('Erro ao gerar imagem QR:', err);
      }
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      instData.status = 'close';
      instData.qrBase64 = null;
      console.log(`[${instanceName}] Conexão fechada. Motivo:`, lastDisconnect?.error, 'Reconectar:', shouldReconnect);

      if (shouldReconnect) {
        delete instances[instanceName];
        setTimeout(() => getOrCreateInstance(instanceName), 3000);
      } else {
        console.log(`[${instanceName}] Sessão finalizada (desconectado pelo usuário).`);
        delete instances[instanceName];
      }
    } else if (connection === 'open') {
      instData.status = 'open';
      instData.qrBase64 = null;
      instData.ownerNumber = sock.user?.id ? sock.user.id.split(':')[0] : 'Conectado';
      console.log(`[${instanceName}] ✓ WhatsApp Conectado com sucesso! Número: +${instData.ownerNumber}`);
    }
  });

  instData.sock = sock;
  instances[instanceName] = instData;
  return instData;
}

// 1. Estado da Instância (Compatível com Evolution API)
app.get('/instance/connectionState/:instance', async (req, res) => {
  const { instance } = req.params;
  const inst = instances[instance];

  if (!inst) {
    return res.json({
      instance: {
        instanceName: instance,
        state: 'close',
        owner: null
      }
    });
  }

  res.json({
    instance: {
      instanceName: instance,
      state: inst.status,
      owner: inst.ownerNumber
    }
  });
});

// 2. Conectar / Obter QR Code (Compatível com Evolution API)
app.get('/instance/connect/:instance', async (req, res) => {
  const { instance } = req.params;
  try {
    const inst = await getOrCreateInstance(instance);

    // Se já estiver conectado
    if (inst.status === 'open') {
      return res.json({
        instance: {
          instanceName: instance,
          state: 'open',
          owner: inst.ownerNumber
        },
        message: 'Instância já está conectada.'
      });
    }

    // Aguarda até 3 segundos se o QR Code ainda estiver sendo gerado
    let attempts = 0;
    while (!inst.qrBase64 && inst.status !== 'open' && attempts < 15) {
      await new Promise(r => setTimeout(r, 200));
      attempts++;
    }

    if (inst.qrBase64) {
      return res.json({
        base64: inst.qrBase64,
        code: inst.qrBase64
      });
    }

    res.json({
      instance: {
        instanceName: instance,
        state: inst.status,
        owner: inst.ownerNumber
      }
    });
  } catch (err) {
    console.error(`Erro ao conectar instância ${instance}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Enviar Mensagem de Texto (Compatível com Evolution API)
app.post('/message/sendText/:instance', async (req, res) => {
  const { instance } = req.params;
  const { number, text } = req.body;

  if (!number || !text) {
    return res.status(400).json({ error: 'Parâmetros "number" e "text" são obrigatórios.' });
  }

  const inst = instances[instance];
  if (!inst || inst.status !== 'open' || !inst.sock) {
    return res.status(503).json({
      error: `Instância "${instance}" não está conectada ao WhatsApp. Abra o menu Conexão WhatsApp e escaneie o QR Code.`
    });
  }

  try {
    let cleanPhone = String(number).replace(/\D/g, '');
    if (!cleanPhone.includes('@')) {
      cleanPhone = `${cleanPhone}@s.whatsapp.net`;
    }

    const result = await inst.sock.sendMessage(cleanPhone, { text });
    console.log(`[${instance}] Mensagem enviada para ${cleanPhone}`);

    res.json({
      status: 'SUCCESS',
      key: result.key,
      message: result.message
    });
  } catch (err) {
    console.error(`[${instance}] Erro ao enviar mensagem para ${number}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint de saúde / ping
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Evolution API Gateway (Baileys) rodando na porta ${PORT}`);
  console.log(`🔑 API Key Padrão: ${API_KEY}`);
  console.log(`📡 URL Local: http://localhost:${PORT}`);
  console.log(`====================================================`);
});

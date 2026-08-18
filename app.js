import { auth, db, onAuthStateChanged, signOut, collection, getDocs, doc, setDoc, deleteDoc, getDoc, addDoc } from './firebase-setup.js?v=20240817_1';

let currentUserRole = 'CLIENTE'; // MOCK

// ConsórcioOne - Lógica do Portal e CRM
document.addEventListener('DOMContentLoaded', () => {


  // --- ESTADO GLOBAL DO APLICATIVO ---
  let state = {
    categoria: 'AUTOMOVEL', // AUTOMOVEL, IMOVEL, SERVICO, ELETRO
    credito: 80000,
    prazo: 60,
    leadCorrente: null,
    leads: [
      {
        id: 'lead-1',
        nomeCompleto: 'Ana Silva Mendonça',
        cpfCnpj: '342.981.092-23',
        email: 'ana.silva@email.com',
        telefone: '(11) 98765-4321',
        endereco: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
        rendaMensal: 6500.00,
        status: 'QUALIFICADO',
        origem: 'WHATSAPP',
        categoriaBem: 'AUTOMOVEL',
        valorCredito: 100000,
        prazoMeses: 72,
        administradora: 'Itaú Consórcios',
        valorParcela: 1569.44,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Ontem
        chatHistory: [
          { remetente: 'IA', conteudo: 'Olá! Sou o assistente virtual da ConsórcioOne. Qual o seu objetivo hoje?' },
          { remetente: 'CLIENTE', conteudo: 'Gostaria de ver planos de consórcio para um carro no valor de 100 mil reais.' },
          { remetente: 'IA', conteudo: 'Perfeito! Para um crédito de R$ 100.000,00, qual o prazo de pagamento ideal para você (ex: 36, 48, 60 ou 72 meses)?' },
          { remetente: 'CLIENTE', conteudo: 'Pode ser em 72 meses por favor.' },
          { remetente: 'IA', conteudo: 'Entendido. Já atualizei os simuladores. A melhor opção identificada foi o Itaú Consórcios com parcelas de R$ 1.569,44.' },
          { remetente: 'CLIENTE', conteudo: 'Gostei dessa opção, como faço para avançar?' }
        ],
        documentos: [
          { id: 'doc-1', tipo: 'CPF', nome: 'cpf_ana_silva.pdf', status: 'APROVADO', ocrLog: { score: 0.99, match: true } },
          { id: 'doc-2', tipo: 'COMPROVANTE_RENDA', nome: 'holerite_recente.jpg', status: 'PENDENTE', ocrLog: null }
        ]
      },
      {
        id: 'lead-2',
        nomeCompleto: 'Bruno Fernandes Costa',
        cpfCnpj: '098.345.871-12',
        email: 'bruno.fernandes@email.com',
        telefone: '(21) 99122-3344',
        endereco: 'Rua Voluntários da Pátria, 45 - Botafogo, Rio de Janeiro - RJ',
        rendaMensal: 3500.00,
        status: 'EM_ATENDIMENTO',
        origem: 'WEB',
        categoriaBem: 'IMOVEL',
        valorCredito: 350000,
        prazoMeses: 180,
        administradora: 'Consórcio Caixa',
        valorParcela: 2255.56,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 horas atrás
        chatHistory: [
          { remetente: 'IA', conteudo: 'Olá! Sou o assistente da ConsórcioOne. Qual o seu objetivo?' },
          { remetente: 'CLIENTE', conteudo: 'Quero comprar meu primeiro apartamento de uns 350 mil' }
        ],
        documentos: []
      }
    ]
  };

  // Carregar dados salvos do localStorage se existirem
  
  // Async load leads from Firestore
  const loadLeads = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'leads'));
      const firestoreLeads = [];
      querySnapshot.forEach((doc) => {
        firestoreLeads.push({ id: doc.id, ...doc.data() });
      });
      if (firestoreLeads.length > 0) {
        state.leads = firestoreLeads;
      }
      renderKanban();
    } catch (e) {
      console.error("Error loading leads", e);
    }
  };


  // --- PARAMETRIZAÇÃO DAS ADMINISTRADORAS ---
  const admRules = {
    'itau': {
      nome: 'Itaú Consórcios',
      logoUrl: 'data:image/jpeg;base64,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',
      taxaAdmin: 0.12,    // 12%
      fundoReserva: 0.01, // 1%
      prazoMaximo: { 'AUTOMOVEL': 80, 'IMOVEL': 200, 'SERVICO': 48, 'ELETRO': 36 },
      regras: 'Aceita apenas pessoa física. Exige renda compatível com parcela.'
    },
    'porto': {
      nome: 'Porto Seguro',
      logoUrl: 'https://www.portoseguro.com.br/faqs/_next/_next/static/media/ic-logo-porto.61491afc.svg',
      taxaAdmin: 0.15,    // 15%
      fundoReserva: 0.015, // 1.5%
      prazoMaximo: { 'AUTOMOVEL': 100, 'IMOVEL': 240, 'SERVICO': 48, 'ELETRO': 48 },
      regras: 'Renda mínima de R$ 2.500,00. Possibilidade de lance embutido de até 30%.'
    },
    'caixa': {
      nome: 'Consórcio Caixa',
      logoUrl: 'https://www.caixa.gov.br/PublishingImages/nova-home/icones/x-volume-negativa-54.png',
      taxaAdmin: 0.14,    // 14%
      fundoReserva: 0.02, // 2%
      prazoMaximo: { 'AUTOMOVEL': 120, 'IMOVEL': 240, 'SERVICO': 48, 'ELETRO': 36 },
      regras: 'Excelente taxa para imóveis. Análise cadastral rigorosa.'
    }
  };

  // --- ELEMENTOS DO DOM ---
  const elements = {
    // Abas de visualização (Portal vs CRM)
    viewPortal: document.getElementById('view-portal'),
    viewCrm: document.getElementById('view-crm'),
    togglePortalBtn: document.getElementById('toggle-portal'),
    toggleCrmBtn: document.getElementById('toggle-crm'),
    
    // Controles do Simulador
    categoryBtns: document.querySelectorAll('.category-btn'),
    sliderCredito: document.getElementById('slider-credito'),
    sliderPrazo: document.getElementById('slider-prazo'),
    valCredito: document.getElementById('val-credito'),
    valPrazo: document.getElementById('val-prazo'),
    comparisonContainer: document.getElementById('comparison-cards'),
    
    // Modal de Pré-cadastro
    preCadastroModal: document.getElementById('pre-cadastro-modal'),
    formPreCadastro: document.getElementById('form-pre-cadastro'),
    closeModalBtn: document.getElementById('close-modal'),
    selectedAdmField: document.getElementById('selected-adm'),
    
    // Chat Widget
    chatTrigger: document.getElementById('chat-trigger'),
    chatWindow: document.getElementById('chat-window'),
    chatClose: document.getElementById('chat-close'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    chatSendBtn: document.getElementById('chat-send-btn'),
    
    // CRM
    kanbanColumns: {
      'NOVO': document.getElementById('column-novo'),
      'EM_ATENDIMENTO': document.getElementById('column-atendimento'),
      'QUALIFICADO': document.getElementById('column-qualificado'),
      'PROPOSTA_ENVIADA': document.getElementById('column-proposta'),
      'VENDIDO': document.getElementById('column-vendido')
    },
    
    // Detalhe do Lead (Slide-over)
    leadPanel: document.getElementById('lead-panel'),
    closeLeadPanelBtn: document.getElementById('close-lead-panel'),
    leadPanelName: document.getElementById('lead-panel-name'),
    leadDetailsBox: document.getElementById('lead-details-box'),
    leadPanelChatList: document.getElementById('lead-panel-chat-list'),
    leadPanelDocsBox: document.getElementById('lead-panel-docs-box'),
    leadPanelDeleteBtn: document.getElementById('lead-panel-delete-btn'),
    leadPanelEditBtn: document.getElementById('lead-panel-edit-btn'),
    editLeadModal: document.getElementById('edit-lead-modal'),
    closeEditModalBtn: document.getElementById('close-edit-modal'),
    formEditLead: document.getElementById('form-edit-lead'),
    btnCancelEdit: document.getElementById('btn-cancel-edit'),
    btnAdmin: document.getElementById('btn-admin'),
    adminUsersModal: document.getElementById('admin-users-modal'),
    closeAdminModalBtn: document.getElementById('close-admin-modal'),
    formAddUser: document.getElementById('form-add-user'),
    usersTableBody: document.getElementById('users-table-body'),
    confirmModal: document.getElementById('confirm-modal'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmMessage: document.getElementById('confirm-message'),
    btnConfirmOk: document.getElementById('btn-confirm-ok'),
    btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
    alertModal: document.getElementById('alert-modal'),
    alertTitle: document.getElementById('alert-title'),
    alertMessage: document.getElementById('alert-message'),
    btnAlertOk: document.getElementById('btn-alert-ok')
  };


  // --- FUNÇÃO DE CONFIRMAÇÃO GENÉRICA ---
  let currentConfirmCallback = null;
  const showConfirm = (message, title, onConfirm) => {
    elements.confirmTitle.textContent = title || 'Confirmar';
    elements.confirmMessage.textContent = message;
    currentConfirmCallback = onConfirm;
    elements.confirmModal.classList.add('active');
  };

  elements.btnConfirmCancel.addEventListener('click', () => {
    elements.confirmModal.classList.remove('active');
    currentConfirmCallback = null;
  });

  elements.btnConfirmOk.addEventListener('click', () => {
    elements.confirmModal.classList.remove('active');
    if (currentConfirmCallback) currentConfirmCallback();
    currentConfirmCallback = null;
  });


  // --- FUNÇÃO DE ALERTA GENÉRICA ---
  let currentAlertCallback = null;
  const showAlert = (message, title, onOk) => {
    elements.alertTitle.textContent = title || 'Aviso';
    elements.alertMessage.textContent = message;
    currentAlertCallback = onOk;
    elements.alertModal.classList.add('active');
  };

  elements.btnAlertOk.addEventListener('click', () => {
    elements.alertModal.classList.remove('active');
    if (currentAlertCallback) currentAlertCallback();
    currentAlertCallback = null;
  });

  // --- CONFIGURAÇÃO INICIAL DO SIMULADOR ---
  const updateSimulatorLimits = () => {
    let minC = 10000;
    let maxC = 200000;
    let minP = 12;
    let maxP = 60;
    
    if (state.categoria === 'IMOVEL') {
      minC = 100000;
      maxC = 1000000;
      minP = 60;
      maxP = 240;
    } else if (state.categoria === 'SERVICO') {
      minC = 5000;
      maxC = 50000;
      minP = 12;
      maxP = 48;
    } else if (state.categoria === 'ELETRO') {
      minC = 2000;
      maxC = 20000;
      minP = 6;
      maxP = 36;
    }
    
    // Ajustar ranges dos inputs
    elements.sliderCredito.min = minC;
    elements.sliderCredito.max = maxC;
    elements.sliderCredito.step = minC === 100000 ? 25000 : (minC === 2000 ? 500 : 5000);
    
    elements.sliderPrazo.min = minP;
    elements.sliderPrazo.max = maxP;
    elements.sliderPrazo.step = minP === 60 ? 12 : 6;
    
    // Forçar os valores atuais a caírem dentro dos novos limites se estiverem fora
    if (state.credito < minC) state.credito = minC;
    if (state.credito > maxC) state.credito = maxC;
    if (state.prazo < minP) state.prazo = minP;
    if (state.prazo > maxP) state.prazo = maxP;
    
    elements.sliderCredito.value = state.credito;
    elements.sliderPrazo.value = state.prazo;
    
    elements.valCredito.textContent = formatCurrency(state.credito);
    elements.valPrazo.textContent = `${state.prazo} meses`;
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const calculateInstallment = (credito, prazo, taxaAdmin, fundoReserva) => {
    const totalComTaxas = credito * (1 + taxaAdmin + fundoReserva);
    return totalComTaxas / prazo;
  };

  const renderSimulations = () => {
    elements.comparisonContainer.innerHTML = '';
    
    // Calcular simulações para todas as administradoras cadastradas
    const results = Object.keys(admRules).map(key => {
      const rule = admRules[key];
      // Ajustar prazo máximo permitido para a categoria
      const prazoMax = rule.prazoMaximo[state.categoria] || 60;
      const prazoSimulado = Math.min(state.prazo, prazoMax);
      
      const parcela = calculateInstallment(state.credito, prazoSimulado, rule.taxaAdmin, rule.fundoReserva);
      const taxaTotal = (rule.taxaAdmin + rule.fundoReserva) * 100;
      
      return {
        key,
        nome: rule.nome,
        logoUrl: rule.logoUrl,
        parcela,
        taxaTotal,
        prazoEfetivo: prazoSimulado,
        regras: rule.regras
      };
    });
    
    // Ordenar por menor valor de parcela (mais atrativo)
    results.sort((a, b) => a.parcela - b.parcela);
    
    results.forEach((res, index) => {
      const card = document.createElement('div');
      card.className = `comparison-card ${index === 0 ? 'recommended' : ''}`;
      
      let badgeHtml = '';
      if (index === 0) {
        badgeHtml = `<div class="recommended-badge">Melhor Opção</div>`;
      }
      
      card.innerHTML = `
        ${badgeHtml}
        <div class="admin-info">
          <div class="admin-logo" style="background: white; overflow: hidden; padding: 4px;">
            <img src="${res.logoUrl}" alt="Logo ${res.nome}" style="width: 100%; height: 100%; object-fit: contain;">
          </div>
          <div class="admin-details">
            <h4>${res.nome}</h4>
            <span>${res.regras}</span>
          </div>
        </div>
        <div class="stat-group">
          <span class="stat-label">Parcela Estimada</span>
          <span class="stat-val highlight">${formatCurrency(res.parcela)}</span>
        </div>
        <div class="stat-group">
          <span class="stat-label">Taxa Admin + Fundo</span>
          <span class="stat-val">${res.taxaTotal.toFixed(1)}% total</span>
        </div>
        <div>
          <button class="btn btn-primary btn-sm w-full select-plan-btn" onclick="window.openPreCadastro('${res.nome}', ${res.parcela})">
            Solicitar Proposta
          </button>
        </div>
      `;
      
      elements.comparisonContainer.appendChild(card);
    });
  };

  // --- AÇÕES DO SIMULADOR ---
  elements.categoryBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      elements.categoryBtns.forEach(b => b.classList.remove('active'));
      const trigger = e.currentTarget;
      trigger.classList.add('active');
      state.categoria = trigger.getAttribute('data-category');
      
      updateSimulatorLimits();
      renderSimulations();
    });
  });

  elements.sliderCredito.addEventListener('input', (e) => {
    state.credito = parseFloat(e.target.value);
    elements.valCredito.textContent = formatCurrency(state.credito);
    renderSimulations();
  });

  elements.sliderPrazo.addEventListener('input', (e) => {
    state.prazo = parseInt(e.target.value);
    elements.valPrazo.textContent = `${state.prazo} meses`;
    renderSimulations();
  });

  // --- MODAL DE PRÉ-CADASTRO ---
  const openPreCadastro = (admName, parcela) => {
    elements.selectedAdmField.value = admName;
    elements.preCadastroModal.setAttribute('data-parcela', parcela);
    elements.preCadastroModal.classList.add('active');
  };
  window.openPreCadastro = openPreCadastro;

  const closePreCadastro = () => {
    elements.preCadastroModal.classList.remove('active');
    elements.formPreCadastro.reset();
  };

  elements.closeModalBtn.addEventListener('click', closePreCadastro);
  
  elements.formPreCadastro.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(elements.formPreCadastro);
    const adm = elements.selectedAdmField.value;
    const parcela = parseFloat(elements.preCadastroModal.getAttribute('data-parcela'));
    
    // Obter array de tipos de consórcios selecionados
    const tiposConsorcio = formData.getAll('tipo_consorcio');
    
    // Criar um novo Lead no estado
    const newLead = {
      id: `lead-${Date.now()}`,
      nomeCompleto: formData.get('nome'),
      cpfCnpj: formData.get('cpf'),
      email: formData.get('email'),
      telefone: formData.get('telefone'),
      endereco: '',
      rendaMensal: parseFloat(formData.get('renda')) || 3000,
      status: 'NOVO',
      origem: 'WEB',
      tiposConsorcio: tiposConsorcio, // Array multi-seleção
      categoriaBem: state.categoria, // Mantém a categoria principal da simulação
      valorCredito: state.credito,
      prazoMeses: state.prazo,
      administradora: adm,
      valorParcela: parcela,
      created_at: new Date().toISOString(),
      chatHistory: [
        { remetente: 'IA', conteudo: 'Olá! Proposta criada com sucesso através do simulador web!' }
      ],
      documentos: []
    };
    
    state.leads.push(newLead);
    
      // sync to firestore
      try {
        if (state.leadCorrente) {
           setDoc(doc(db, 'leads', state.leadCorrente.id), state.leadCorrente);
        } else {
           // when adding new or updating multiple
           state.leads.forEach(l => {
              if(l.id) setDoc(doc(db, 'leads', l.id), l);
           });
        }
      } catch (e) { console.error(e); }

    
    // Fechar modal e renderizar CRM atualizado
    closePreCadastro();
    renderKanban();
    
    showAlert('Simulação salva com sucesso! Um consultor entrará em contato em breve.', 'Sucesso');
  });

  // --- CHATBOT WIDGET (MOCK IA) ---
  const botAnswers = {
    'ola': 'Olá! Sou o assistente virtual da ConsórcioOne. Estou aqui para tirar suas dúvidas e te ajudar a simular o consórcio perfeito. Qual o seu objetivo de compra hoje (ex: Carro, Casa, Serviços)?',
    'oi': 'Olá! Sou o assistente virtual da ConsórcioOne. Estou aqui para tirar suas dúvidas e te ajudar a simular o consórcio perfeito. Qual o seu objetivo de compra hoje (ex: Carro, Casa, Serviços)?',
    'como funciona': 'O consórcio é um grupo de pessoas que poupam juntas para adquirir um bem. Mensalmente ocorrem assembleias onde cotistas são sorteados ou oferecem lances para retirar a Carta de Crédito. Não há juros, apenas uma taxa de administração diluída nas parcelas.',
    'consorcio': 'Consórcio é a compra planejada de bens sem juros. Você entra em um grupo e paga parcelas mensais. Pode ter acesso ao crédito por sorteio ou oferecendo um lance (que funciona como uma antecipação de parcelas).',
    'taxa': 'No consórcio não há cobrança de juros! Nós cobramos apenas uma Taxa de Administração (que varia entre 12% e 15% dependendo da administradora) e o Fundo de Reserva (em torno de 1% a 2%). Isso torna o consórcio até 60% mais barato que um financiamento convencional!',
    'juros': 'Não cobramos juros! Essa é a principal vantagem do consórcio. Cobramos apenas a taxa de administração diluída. Faça uma simulação ao lado para ver o valor exato das parcelas!',
    'lance': 'O lance é um valor que você oferece para tentar antecipar a contemplação da sua carta de crédito. O maior lance do mês é o vencedor. Se você não ganhar, não precisa pagar o lance oferecido! Ele pode ser oferecido do seu próprio bolso ou usando até 30% do valor da própria carta de crédito (lance embutido).',
    'contemplacao': 'A contemplação acontece de duas formas nas assembleias mensais: 1) Por sorteio (onde todos os participantes em dia concorrem igualmente) ou 2) Por Lance (onde quem ofertar o maior valor de antecipação leva a carta de crédito).',
    'itau': 'A carteira de consórcios do Itaú é excelente, com taxa de administração de apenas 12% total e fundo de reserva de 1%. É a opção mais barata e bem avaliada do mercado atual para automóveis e imóveis!',
    'carro': 'Ótimo objetivo! Consórcio de carros é muito procurado. Digite o valor aproximado do automóvel que você quer comprar para que eu possa simular para você.',
    'casa': 'Excelente investimento! O consórcio imobiliário é ideal para planejar a casa própria ou terreno sem juros altos. Me diga qual o valor do imóvel desejado.',
    'imovel': 'Excelente investimento! O consórcio imobiliário é ideal para planejar a casa própria ou terreno sem juros altos. Me diga qual o valor do imóvel desejado.'
  };

  const getBotResponse = (text) => {
    const rawText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Tentar identificar se o usuário digitou um valor monetário
    const valueMatch = rawText.match(/(\d+)\s*(mil|reais|r\$)/i) || rawText.match(/(rs|r\$)\s*(\d+)/i) || rawText.match(/\b\d{4,6}\b/);
    if (valueMatch) {
      let val = 0;
      if (rawText.includes('mil')) {
        const num = parseInt(rawText.match(/(\d+)/)[0]);
        val = num * 1000;
      } else {
        const numMatch = rawText.match(/(\d+)/);
        if (numMatch) val = parseInt(numMatch[0]);
      }
      
      if (val >= 2000) {
        state.credito = val;
        elements.sliderCredito.value = val;
        elements.valCredito.textContent = formatCurrency(val);
        
        // Ajustar categoria baseado no valor
        if (val >= 100000 && state.categoria !== 'IMOVEL') {
          state.categoria = 'IMOVEL';
          document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
          document.querySelector('[data-category="IMOVEL"]').classList.add('active');
        } else if (val < 100000 && state.categoria === 'IMOVEL') {
          state.categoria = 'AUTOMOVEL';
          document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
          document.querySelector('[data-category="AUTOMOVEL"]').classList.add('active');
        }
        
        updateSimulatorLimits();
        renderSimulations();
        return `Entendido! Configurei o simulador para um crédito de **${formatCurrency(val)}** na categoria de **${state.categoria}**. Veja os valores de parcelas atualizados no painel ao lado! Deseja que eu crie uma pré-proposta ou quer ajustar o prazo?`;
      }
    }
    
    // Tentar encontrar respostas de FAQ
    for (const key in botAnswers) {
      if (rawText.includes(key)) {
        return botAnswers[key];
      }
    }
    
    return 'Entendi. Posso te ajudar a simular as melhores taxas de consórcio multimarcas. Me diga qual o valor do crédito desejado ou envie uma mensagem com suas dúvidas!';
  };

  const addChatMessage = (sender, content) => {
    const msgElement = document.createElement('div');
    msgElement.className = `chat-msg ${sender.toLowerCase()}`;
    msgElement.innerHTML = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    elements.chatMessages.appendChild(msgElement);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  };

  const handleSendMessage = () => {
    const text = elements.chatInput.value.trim();
    if (!text) return;
    
    addChatMessage('CLIENTE', text);
    elements.chatInput.value = '';
    
    // Mostrar digitando
    const typingElement = document.createElement('div');
    typingElement.className = 'chat-msg ia typing';
    typingElement.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    elements.chatMessages.appendChild(typingElement);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    
    setTimeout(() => {
      typingElement.remove();
      const botResponse = getBotResponse(text);
      addChatMessage('IA', botResponse);
    }, 1200);
  };

  elements.chatTrigger.addEventListener('click', () => {
    elements.chatWindow.classList.toggle('active');
    // Enviar mensagem de boas-vindas se estiver vazio
    if (elements.chatMessages.children.length === 0) {
      addChatMessage('IA', 'Olá! Sou o assistente inteligente da ConsórcioOne. Posso ajudar você a escolher e simular seu consórcio sem juros. Qual bem você deseja adquirir (Carro, Imóvel, Eletro ou Serviços)?');
    }
  });

  elements.chatClose.addEventListener('click', () => {
    elements.chatWindow.classList.remove('active');
  });

  elements.chatSendBtn.addEventListener('click', handleSendMessage);
  
  elements.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendMessage();
  });

  // --- CRM / KANBAN BOARD ---
  const renderKanban = () => {
    // Limpar todas as colunas
    Object.keys(elements.kanbanColumns).forEach(key => {
      elements.kanbanColumns[key].querySelector('.kanban-cards').innerHTML = '';
      elements.kanbanColumns[key].querySelector('.lead-count').textContent = '0';
    });
    
    const counts = { 'NOVO': 0, 'EM_ATENDIMENTO': 0, 'QUALIFICADO': 0, 'PROPOSTA_ENVIADA': 0, 'VENDIDO': 0 };
    
    state.leads.forEach(lead => {
      const colKey = lead.status;
      const column = elements.kanbanColumns[colKey];
      if (!column) return;
      
      counts[colKey]++;
      
      const card = document.createElement('div');
      card.className = 'lead-card';
      card.draggable = true;
      card.id = lead.id;
      
      card.innerHTML = `
        <div class="lead-card-header">
          <span class="lead-name">${lead.nomeCompleto || 'Lead Anônimo'}</span>
          <span class="lead-source">${lead.origem}</span>
        </div>
        <div class="lead-meta">
          <div>${lead.telefone}</div>
          <div>${lead.administradora} • ${lead.prazoMeses}x</div>
        </div>
        <div class="lead-value">${formatCurrency(lead.valorCredito)}</div>
      `;
      
      // Drag events
      card.addEventListener('dragstart', handleDragStart);
      
      // Click event para ver detalhes
      card.addEventListener('click', () => {
        openLeadDetails(lead);
      });
      
      column.querySelector('.kanban-cards').appendChild(card);
    });
    
    // Atualizar contadores
    Object.keys(counts).forEach(key => {
      elements.kanbanColumns[key].querySelector('.lead-count').textContent = counts[key];
    });
  };

  // Drag & Drop logic
  let draggedLeadId = null;

  function handleDragStart(e) {
    draggedLeadId = e.target.id;
    e.dataTransfer.setData('text/plain', draggedLeadId);
  }

  Object.keys(elements.kanbanColumns).forEach(key => {
    const col = elements.kanbanColumns[key];
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      const lead = state.leads.find(l => l.id === id);
      if (lead && lead.status !== key) {
        lead.status = key;
        
      // sync to firestore
      try {
        if (state.leadCorrente) {
           setDoc(doc(db, 'leads', state.leadCorrente.id), state.leadCorrente);
        } else {
           // when adding new or updating multiple
           state.leads.forEach(l => {
              if(l.id) setDoc(doc(db, 'leads', l.id), l);
           });
        }
      } catch (e) { console.error(e); }

        renderKanban();
      }
    });
  });

  // --- DETALHES DO LEAD (SLIDE OVER) ---
  const openLeadDetails = (lead) => {
    state.leadCorrente = lead;
    elements.leadPanelName.textContent = lead.nomeCompleto || 'Sem Nome';
    
    // Renderizar informações básicas
    elements.leadDetailsBox.innerHTML = `
      <div class="detail-row"><span class="detail-label">Telefone:</span><span class="detail-value">${lead.telefone}</span></div>
      <div class="detail-row"><span class="detail-label">E-mail:</span><span class="detail-value">${lead.email || 'N/A'}</span></div>
      <div class="detail-row"><span class="detail-label">CPF/CNPJ:</span><span class="detail-value">${lead.cpfCnpj || 'N/A'}</span></div>
      <div class="detail-row"><span class="detail-label">Renda declarada:</span><span class="detail-value">${formatCurrency(lead.rendaMensal)}</span></div>
      <div class="detail-row"><span class="detail-label">Administradora:</span><span class="detail-value">${lead.administradora}</span></div>
      <div class="detail-row"><span class="detail-label">Tipos de Consórcio:</span><span class="detail-value">${(lead.tiposConsorcio && lead.tiposConsorcio.length > 0) ? lead.tiposConsorcio.join(', ') : (lead.categoriaBem || 'N/A')}</span></div>
      <div class="detail-row"><span class="detail-label">Crédito Simulado:</span><span class="detail-value">${formatCurrency(lead.valorCredito)}</span></div>
      <div class="detail-row"><span class="detail-label">Plano/Prazo:</span><span class="detail-value">${lead.prazoMeses} meses</span></div>
      <div class="detail-row"><span class="detail-label">Parcela Estimada:</span><span class="detail-valueHighlight" style="color:var(--accent); font-weight:700;">${formatCurrency(lead.valorParcela)}</span></div>
      <div class="detail-row"><span class="detail-label">Origem do Lead:</span><span class="detail-value">${lead.origem}</span></div>
    `;
    
    // Renderizar histórico de conversas do chat
    elements.leadPanelChatList.innerHTML = '';
    if (lead.chatHistory && lead.chatHistory.length > 0) {
      lead.chatHistory.forEach(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `history-chat-msg ${msg.remetente === 'CLIENTE' ? 'client' : 'ia'}`;
        msgDiv.textContent = msg.conteudo;
        elements.leadPanelChatList.appendChild(msgDiv);
      });
    } else {
      elements.leadPanelChatList.innerHTML = '<div style="font-size:0.8rem;color:var(--text-muted);">Nenhuma mensagem de conversa registrada.</div>';
    }
    
    // Renderizar seção de documentos / OCR
    renderLeadDocuments(lead);
    
    elements.leadPanel.classList.add('active');
  };

  const renderLeadDocuments = (lead) => {
    elements.leadPanelDocsBox.innerHTML = '';
    
    // Documentos pré-definidos se a lista estiver vazia para demonstrar OCR
    if (lead.documentos.length === 0) {
      lead.documentos = [
        { id: 'doc-cpf', tipo: 'CPF', nome: 'documento_identidade.pdf', status: 'PENDENTE', ocrLog: null },
        { id: 'doc-renda', tipo: 'COMPROVANTE_RENDA', nome: 'extrato_bancario.jpg', status: 'PENDENTE', ocrLog: null }
      ];
      
      // sync to firestore
      try {
        if (state.leadCorrente) {
           setDoc(doc(db, 'leads', state.leadCorrente.id), state.leadCorrente);
        } else {
           // when adding new or updating multiple
           state.leads.forEach(l => {
              if(l.id) setDoc(doc(db, 'leads', l.id), l);
           });
        }
      } catch (e) { console.error(e); }

    }
    
    lead.documentos.forEach(doc => {
      const docDiv = document.createElement('div');
      docDiv.className = 'doc-box';
      docDiv.style.marginBottom = '0.5rem';
      
      const badgeClass = doc.status === 'APROVADO' ? 'success' : 'pending';
      const badgeLabel = doc.status === 'APROVADO' ? 'Aprovado' : 'Validar OCR';
      
      docDiv.innerHTML = `
        <div>
          <div class="doc-name">${doc.nome}</div>
          <div style="font-size:0.7rem; color:var(--text-muted);">${doc.tipo}</div>
        </div>
        <button class="btn btn-secondary btn-sm doc-status-badge ${badgeClass}" data-doc-id="${doc.id}">
          ${badgeLabel}
        </button>
      `;
      
      // Ação de validação OCR Mock
      const btn = docDiv.querySelector('.doc-status-badge');
      if (doc.status === 'PENDENTE') {
        btn.addEventListener('click', () => {
          triggerMockOCR(lead, doc.id);
        });
      }
      
      elements.leadPanelDocsBox.appendChild(docDiv);
    });
  };

  const triggerMockOCR = (lead, docId) => {
    const doc = lead.documentos.find(d => d.id === docId);
    if (!doc) return;
    
    // Alterar botão para simulando carregamento
    const btn = elements.leadPanelDocsBox.querySelector(`[data-doc-id="${docId}"]`);
    btn.textContent = 'Processando...';
    btn.disabled = true;
    
    setTimeout(() => {
      doc.status = 'APROVADO';
      doc.ocrLog = {
        processed_at: new Date().toISOString(),
        confidenceScore: 0.985,
        fieldsExtracted: {
          nomeMatches: true,
          cpfValid: true
        }
      };
      
      
      // sync to firestore
      try {
        if (state.leadCorrente) {
           setDoc(doc(db, 'leads', state.leadCorrente.id), state.leadCorrente);
        } else {
           // when adding new or updating multiple
           state.leads.forEach(l => {
              if(l.id) setDoc(doc(db, 'leads', l.id), l);
           });
        }
      } catch (e) { console.error(e); }

      renderLeadDocuments(lead);
      alert(`OCR Processado com sucesso para ${doc.tipo}! Dados validados de acordo com o CPF cadastrado.`);
    }, 1500);
  };

  
  // --- LÓGICA DE EDIÇÃO ---
  elements.leadPanelEditBtn.addEventListener('click', () => {
    if (!state.leadCorrente) return;
    
    // Preencher o formulário
    const l = state.leadCorrente;
    document.getElementById('edit-lead-id').value = l.id;
    document.getElementById('edit-nome').value = l.nomeCompleto || '';
    document.getElementById('edit-cpf').value = l.cpfCnpj || '';
    document.getElementById('edit-email').value = l.email || '';
    document.getElementById('edit-tel').value = l.telefone || '';
    document.getElementById('edit-renda').value = l.rendaMensal || '';
    
    // Checkboxes
    const checkboxes = document.querySelectorAll('input[name="edit_tipo_consorcio"]');
    checkboxes.forEach(cb => cb.checked = false);
    if (l.tiposConsorcio) {
      l.tiposConsorcio.forEach(tc => {
        const cb = document.querySelector(`input[name="edit_tipo_consorcio"][value="${tc}"]`);
        if (cb) cb.checked = true;
      });
    } else if (l.categoriaBem) {
      const cb = document.querySelector(`input[name="edit_tipo_consorcio"][value="${l.categoriaBem}"]`);
      if (cb) cb.checked = true;
    }
    
    elements.editLeadModal.classList.add('active');
  });

  const closeEditModal = () => {
    elements.editLeadModal.classList.remove('active');
    elements.formEditLead.reset();
  };

  elements.closeEditModalBtn.addEventListener('click', closeEditModal);
  elements.btnCancelEdit.addEventListener('click', closeEditModal);

  elements.formEditLead.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(elements.formEditLead);
    const leadId = document.getElementById('edit-lead-id').value;
    
    const leadIndex = state.leads.findIndex(l => l.id === leadId);
    if (leadIndex > -1) {
      state.leads[leadIndex].nomeCompleto = formData.get('nome');
      state.leads[leadIndex].cpfCnpj = formData.get('cpf');
      state.leads[leadIndex].email = formData.get('email');
      state.leads[leadIndex].telefone = formData.get('telefone');
      state.leads[leadIndex].rendaMensal = parseFloat(formData.get('renda'));
      state.leads[leadIndex].tiposConsorcio = formData.getAll('edit_tipo_consorcio');
      
      // Salvar no firestore
      try {
        setDoc(doc(db, 'leads', leadId), state.leads[leadIndex]);
      } catch (e) { console.error(e); }
      
      // Atualizar interface
      openLeadDetails(state.leads[leadIndex]);
      renderKanban();
      closeEditModal();
      showAlert('Lead atualizado com sucesso!', 'Sucesso');
    }
  });

  elements.closeLeadPanelBtn.addEventListener('click', () => {
    elements.leadPanel.classList.remove('active');
    state.leadCorrente = null;
  });

  elements.leadPanelDeleteBtn.addEventListener('click', () => {
    if (!state.leadCorrente) return;
    showConfirm(`Tem certeza que deseja excluir o lead ${state.leadCorrente.nomeCompleto}?`, 'Excluir Lead', () => {
      state.leads = state.leads.filter(l => l.id !== state.leadCorrente.id);
      
      // sync to firestore
      try {
        if (state.leadCorrente) {
           setDoc(doc(db, 'leads', state.leadCorrente.id), state.leadCorrente);
        } else {
           // when adding new or updating multiple
           state.leads.forEach(l => {
              if(l.id) setDoc(doc(db, 'leads', l.id), l);
           });
        }
      } catch (e) { console.error(e); }

      elements.leadPanel.classList.remove('active');
      state.leadCorrente = null;
      renderKanban();
    });
  });

  // --- NAVEGAÇÃO ENTRE ABAS ---
  elements.togglePortalBtn.addEventListener('click', (e) => {
    elements.togglePortalBtn.classList.add('active');
    elements.toggleCrmBtn.classList.remove('active');
    elements.viewPortal.style.display = 'block';
    elements.viewCrm.classList.remove('active');
  });

  elements.toggleCrmBtn.addEventListener('click', (e) => {
    elements.toggleCrmBtn.classList.add('active');
    elements.togglePortalBtn.classList.remove('active');
    elements.viewPortal.style.display = 'none';
    elements.viewCrm.classList.add('active');
    renderKanban();
  });

  // Inicializar o simulador ao carregar
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'index.html'; // Redireciona se não logado
      return;
    }
    
    document.getElementById('user-display-name').textContent = user.email;
    
    // Obter o role do usuario no Firestore
    try {
      // Import query and where from firebase-setup.js - assuming they are exported
      // Note: we might need to add them to import if they are not. They were added in my script.
      const q = window.fbQuery ? window.fbQuery(collection(db, 'users'), window.fbWhere("email", "==", user.email)) : null;
      // Let's rely on standard SDK since I did export query and where.
      
      const { query, where } = await import('./firebase-setup.js?v=20240817_1');
      const qRef = query(collection(db, 'users'), where("email", "==", user.email));
      const querySnapshot = await getDocs(qRef);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        currentUserRole = userDoc.data().role;
      } else {
        // Se não existir, define como ADM para desenvolvimento
        currentUserRole = 'ADM'; 
        await setDoc(doc(db, 'users', user.uid), { role: 'ADM', email: user.email });
      }
    } catch (e) {
      console.error("Erro ao pegar role", e);
      currentUserRole = 'ADM'; // Fallback
    }

    if (currentUserRole === 'ADM') {
      document.getElementById('toggle-crm').style.display = 'block';
      document.getElementById('btn-admin').style.display = 'block';
    } else if (currentUserRole === 'OPERADOR') {
      document.getElementById('toggle-crm').style.display = 'block';
      document.getElementById('btn-admin').style.display = 'none';
    } else {
      document.getElementById('toggle-crm').style.display = 'none';
      document.getElementById('btn-admin').style.display = 'none';
      // Força a visualização do portal se for cliente
      document.getElementById('toggle-portal').click();
    }
    
    // Carrega os leads
    loadLeads();
  });

  
  // --- LÓGICA DE GERENCIAMENTO DE USUÁRIOS (ADM) ---
  const loadUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      elements.usersTableBody.innerHTML = '';
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.email) return;
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.innerHTML = `
          <td style="padding: 0.5rem;">${data.email}</td>
          <td style="padding: 0.5rem;">${data.role}</td>
          <td style="padding: 0.5rem;">
            <button class="btn btn-secondary btn-sm delete-user-btn" data-id="${docSnap.id}" style="padding:0.2rem 0.5rem; font-size:0.75rem; border-color:#ef4444; color:#ef4444;">Excluir</button>
          </td>
        `;
        elements.usersTableBody.appendChild(tr);
      });
      
      // Bind delete buttons
      document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          showConfirm('Tem certeza que deseja remover o acesso deste usuário?', 'Remover Acesso', async () => {
            try {
              await deleteDoc(doc(db, 'users', id));
              loadUsers();
            } catch(err) { console.error(err); }
          });
        });
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (elements.btnAdmin) {
    elements.btnAdmin.addEventListener('click', () => {
      elements.adminUsersModal.classList.add('active');
      loadUsers();
    });
    
    elements.closeAdminModalBtn.addEventListener('click', () => {
      elements.adminUsersModal.classList.remove('active');
    });
    
    elements.formAddUser.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('new-user-email').value;
      const role = document.getElementById('new-user-role').value;
      
      try {
        // Find if user already exists
        const { query, where } = await import('./firebase-setup.js');
        const qRef = query(collection(db, 'users'), where("email", "==", email));
        const snap = await getDocs(qRef);
        
        if (!snap.empty) {
           // Update
           await setDoc(doc(db, 'users', snap.docs[0].id), { email, role }, { merge: true });
        } else {
           // Add new
           await addDoc(collection(db, 'users'), { email, role });
        }
        
        document.getElementById('new-user-email').value = '';
        loadUsers();
      } catch (err) {
        console.error(err);
      }
    });
  }

  document.getElementById('btn-logout').addEventListener('click', () => {
    signOut(auth);
  });
  updateSimulatorLimits();
  renderSimulations();
});

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
  const savedLeads = localStorage.getItem('consorcio_one_leads');
  if (savedLeads) {
    state.leads = JSON.parse(savedLeads);
  } else {
    localStorage.setItem('consorcio_one_leads', JSON.stringify(state.leads));
  }

  // --- PARAMETRIZAÇÃO DAS ADMINISTRADORAS ---
  const admRules = {
    'itau': {
      nome: 'Itaú Consórcios',
      taxaAdmin: 0.12,    // 12%
      fundoReserva: 0.01, // 1%
      prazoMaximo: { 'AUTOMOVEL': 80, 'IMOVEL': 200, 'SERVICO': 48, 'ELETRO': 36 },
      regras: 'Aceita apenas pessoa física. Exige renda compatível com parcela.'
    },
    'porto': {
      nome: 'Porto Seguro',
      taxaAdmin: 0.15,    // 15%
      fundoReserva: 0.015, // 1.5%
      prazoMaximo: { 'AUTOMOVEL': 100, 'IMOVEL': 240, 'SERVICO': 48, 'ELETRO': 48 },
      regras: 'Renda mínima de R$ 2.500,00. Possibilidade de lance embutido de até 30%.'
    },
    'caixa': {
      nome: 'Consórcio Caixa',
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
    leadPanelDeleteBtn: document.getElementById('lead-panel-delete-btn')
  };

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
          <div class="admin-logo">${res.nome.substring(0, 2).toUpperCase()}</div>
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
          <button class="btn btn-primary btn-sm w-full select-plan-btn" data-adm="${res.nome}" data-parcela="${res.parcela.toFixed(2)}">
            Solicitar Proposta
          </button>
        </div>
      `;
      
      elements.comparisonContainer.appendChild(card);
    });

    // Registrar eventos para os botões do plano
    document.querySelectorAll('.select-plan-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const adm = e.currentTarget.getAttribute('data-adm');
        const parcela = parseFloat(e.currentTarget.getAttribute('data-parcela'));
        openPreCadastro(adm, parcela);
      });
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
      categoriaBem: state.categoria,
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
    localStorage.setItem('consorcio_one_leads', JSON.stringify(state.leads));
    
    // Fechar modal e renderizar CRM atualizado
    closePreCadastro();
    renderKanban();
    
    alert('Simulação salva com sucesso! Um consultor entrará em contato em breve.');
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
        localStorage.setItem('consorcio_one_leads', JSON.stringify(state.leads));
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
      localStorage.setItem('consorcio_one_leads', JSON.stringify(state.leads));
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
      
      localStorage.setItem('consorcio_one_leads', JSON.stringify(state.leads));
      renderLeadDocuments(lead);
      alert(`OCR Processado com sucesso para ${doc.tipo}! Dados validados de acordo com o CPF cadastrado.`);
    }, 1500);
  };

  elements.closeLeadPanelBtn.addEventListener('click', () => {
    elements.leadPanel.classList.remove('active');
    state.leadCorrente = null;
  });

  elements.leadPanelDeleteBtn.addEventListener('click', () => {
    if (!state.leadCorrente) return;
    if (confirm(`Tem certeza que deseja excluir o lead ${state.leadCorrente.nomeCompleto}?`)) {
      state.leads = state.leads.filter(l => l.id !== state.leadCorrente.id);
      localStorage.setItem('consorcio_one_leads', JSON.stringify(state.leads));
      elements.leadPanel.classList.remove('active');
      state.leadCorrente = null;
      renderKanban();
    }
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
  updateSimulatorLimits();
  renderSimulations();
});

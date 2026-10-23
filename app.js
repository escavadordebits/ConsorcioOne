import { auth, db, onAuthStateChanged, signOut, collection, getDocs, doc, setDoc, deleteDoc, getDoc, addDoc, query, where } from './firebase-setup.js?v=20240817_1';

let currentUserRole = localStorage.getItem('consorcio_user_role') || 'ADM';

// ConsórcioOne - Lógica do Portal e CRM
const initApp = () => {


  // --- ESTADO GLOBAL DO APLICATIVO ---
  let state = {
    categoria: 'AUTOMOVEL', // AUTOMOVEL, IMOVEL, SERVICO, ELETRO
    credito: 80000,
    prazo: 60,
    leadCorrente: null,
    leads: [],
    // Estado de Cartas Contempladas
    cartas: [],
    cartasFiltered: [],
    cartasPage: 1,
    cartasPageSize: 25,
    cartasSelected: new Set(),
    cartasFiltros: {
      cod: '',
      categoria: '',
      adm: '',
      status: '',
      order: 'cod_desc'
    },
    pendingImportData: []
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
      state.leads = firestoreLeads;
      renderKanban();
    } catch (e) {
      console.error("Error loading leads", e);
    }
  };


  // --- PARAMETRIZAÇÃO DAS ADMINISTRADORAS ---
  const admRules = {
    'itau': {
      nome: 'Itaú Consórcios',
      logoUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAKsAtgMBIgACEQEDEQH/xAAbAAEAAwEBAQEAAAAAAAAAAAAABQYHBAIDAf/EAE0QAAEDAgMCBw0DCAcJAAAAAAEAAgMEEQUGEiExB0FRYXGRsRMUMjU2cnSBobLBwtEiUmIVIzNCRYKDkhZDVGNzlKIkJjRVk9Lh4vD/xAAbAQEAAwEBAQEAAAAAAAAAAAAABAUGAwECB//EADQRAAIBAwEEBgkFAQEAAAAAAAABAgMEEQUSITGxUWFxgZHBExQyNEFCUqHwFTM1gtEicv/aAAwDAQACEQMRAD8A3FERAEREARF5e9rG6nuDRyk2QHpFHzY3hUJIkxCmBG8CUE9QXHJm7BGbO/C4/hiefguMrijH2pJd53ja15+zBvuZOIq1JnfCW+C2pf5sY+JC+Jz3h36tLVnpawfMuTvrZfOjstOun8jLWiqJz5R8VFU9bfqvz+nlJ/Yqj+Zq8/ULb6z6/TLv6ORb0VSGfKLjo6n1afqvbc94afCpqwfus/7k9ftvrR49Nu18jLUirkedcHd4Tp2edF9LrpizVgkpsK5rT+Njm9oXRXdCXCa8TnKyuY8ab8CaRccGK4dUG0FdTSHkbK0nqXZv3LvGSlvTI8oSi8SWAiIvT5CIiAIiIAiIgCg8xZkp8GAia3u1U4XEYNg0crj8FL1c7KWlmqJPAiY57ugC6x6rqZauplqZ3apZXFzj/wDcSrdSvHbwUYe0y20qxjczcqnsr7knW5oxirJvVmFp/VgGi3r3+1RM0sk7tc8j5Hfee4uPtXhFmalapU9uTZqqdGnSWIRS7AiIuZ1CIiAIiIAiIgCIiAL701XU0p/2Wpmh/wAN5b2L4IvVJxeUeNJrDLFh+ccUpXAVDm1UfG2QAOtzOHxur5hGK02LUgqKVx2bHsd4TDyFZCpvJ+IOocbhbqtFUERPHLfwT126yrWx1GpGooVHlP7FPqGmUp03OmsSXR8TUURFpjJhERAEREBBZ1qO4ZdqADZ0pbGPWdvsBWYK+8I81qKjg43yl/8AKLfMqEsvq89q4x0I1+iw2bXPS3/nkERFVlsEREAREQBERAEREAREQBERAF6Y90T2yMNnsIc084XlETwDaYJWzQxys8F7Q4dBC9qLyvN3fL9A/kiDP5fs/BSi3NOW3BS6T8+qw2KkodDaCIi+zmEREBQuEeS9bRRfcic7rP8A6qoKy8ID9WPNH3ado9rj8VWlj9QltXM2bfTo7NpBdQREUMnBERAEREAREQBERAEREAREQBERAaVkOXXl5jb/AKOV7fbf4qxKp8HL74XVM5Ki/W1v0VsWysZbVtB9RhtQjs3VRdYREUohhERAZhnZ+rMlSPuNYP8ASD8VBKZzgb5lrjzs9xqhli7t5uJ9r5m8s1i3p9i5BFc8vZPgq6GKrxGST883UyOMgANO4k8+9cWassMwmBtXRyPfAXaXtftLCdxvycS6y0+vGl6Vrcco6jbyrehT3/YrKIlwoROCL9IIJBFiOJfiAIiIAiIgCIvtT0lTUm1NTzTW39zjLuxepNvCPG0llnxRTVPlbGp7WojG08cj2t9l7+xfuLZZrMJoO+qqWAgvDAyMknb0gci7+qV9lycXhHD1uhtKCmsvrIRERRyQXjg3feOvZyOjPXq+iuio/BsfzmIjlEXzK8LXaY82sO/mzF6ssXk+7kgiIpxXBERAZVm7yjrvPb7oUQpjN4tmSu85vuNUOsVdfvz7XzN7a+70+xcjRss5iw+TC6enqamOnngjEZErtIcALAgnZuUfnbH6OpohQUUrZ3PeHSPYbtAG21+M3smXsrYdiOD09XUGfukmrVpeANjiOTmXHm7L9Fg9FDNSGUufLoOt1xaxPJzK5qTu/U96WMcfjgpKVOy9e/5b2svd8MkVleCKqx+jhqI2yROLtTHC4NmkrUKejpaUWpqaGEf3cYb2KDwHLVBTd54jGZu7iMP2v+zdzduy3OrGpenWroUv+0stkLVbuNeqvRt4Sx35Zj+NeOcQ9Kl98rjWl1OTsLqamWeR1Rrle57rPFrk3PEqZj2GQ0WO94UznCMlgBebkarfVUl3YVaWZyxhvmX1nqFGtinHOUiHRaHR5Hw6IA1Us9Q7j26G9Q2+1dwyngYFu8euV/1XWOj3DW9pHGet2sXhZfd/rMuRaLXZJwyZh70MtM/iIcXt9YO32hUbFMOqcLq3U1U0Bw2tcNzhyhRrmxrW6zNbulEu1v6Fzug9/QzjVvyZjmH4XQTxV05je+bU0CNztmkDiHMvllHL9FjFFNNVmUPZLoGh1hawPJzrrzDlbDsOweoq6cz91j06dTwRtcByc6k2tvcUY+swxjD4kW7ubatL1WpnOUtxNf0vwP8Atjv+i/6KEzfj+G4nhIgoqgySiVrtJjc3YL8oVLV7wjKOGVmF0tTK6o7pLE17tLwBcjoXend3V7GVOKXDrOFSys7CUasnLj1f4URFZM4YJSYN3p3oZT3XXq1uvu027VW1UVqMqNR05cUXFCvGvTVSHBly4N/09f5kfa5XpUbg2H57ED+GP5leVqNM91j382ZLV/fJd3JBERTytCIiAy7ObbZlrOfQf9DVCKxZ8ZpzC8/eiYe0fBV1Yy8WLifazd2TzbU+xcjUsmeTVF0P99yjeEbxXS+kfKVJZM8mqLof77lG8I3iul9I+UrQVv4/+q8jN0P5P+z8zlyzmisqq+iw18MAiLdGoA6rNYSOPmV2WWZO8paHpf7jlqa90qrOrRbm87/JHmsUadKulBYys/dlFxDOlfTV9VTsp6YtimfG0kOuQHEcvMq9W4pJX4szEKljWuDmFzYxss22655l8sZ8c4h6VL75XLHG+WRkcbS573BrWjeSdwVDXuq05uMpZSZore0oU4qcY4bRb63Pk7nEUNHGxvE6YlxPqFrdZXAM64uH3Lqcj7pj2dqn8FyZSQRtkxMd8TnaYwbMbzc/ZzKd72wugYLw0dOzlLWsCt4299UW1UqbJSzudPpvYpUtr868s58t403G6EzaBHLG7RI0G4vyjmKjs/0bZsGbVWGunkG38LjYjrt1Kfo5qOYONFJA8DwjC4HrsozOnkzWfue+1TK8W7SSm87nv7CBbzUb2LgtlZW7tI7g58V1XpHyhSOc/Jqt6Ge+1R3Bz4rqvSPlCkc5+TVb0M99q40v4/8Aq/MkV/5Nf+l5GXLW8ueIcP8AR2diyRa3lzxDh/o7OxQNF/cl2Fjr37Me3yK1wk/s7+L8qpKu3CT+zv4vyqkqJqfvc+7kiZpPucO/my7cGw24i7/CHvq7KocHDLUVY/llA6h/5VvV/pqxaw/PiZvVXm8n3ckERFOK8IiIDPeESPTi9PJxPpwOpx+qqqu3CRFsoJgNg1tJ/lI7CqSsjqUdm6n+fA22ly2rSD/OJqWTPJqi6H++5RvCN4rpfSPlK7snzwsy5RtfLG1wD9hcAfDco3hCmikwylEcjHkT7muB/VKu6zX6f/VeRQ0Iv9Tzj5n5lbyi4MzJQl27U4dbXBaosWhlfBNHNEdMkbg9p5CDcLU8Ex+ixaBmmRsdTb7cDnWcDzco51F0evBRdJvfnJK1y3nKUaqWVjDKDmPDaunxmrLqeQslmdIx7WEhwcb7/Wvvk2D/AHlp2zsLXsDnBrxY307NnrutNWZ45XPoM5T1kFnOikaQL7CNABHVcL4ubSna1I185W1w+50tL2peU5UMYey9/wBjTFjuKSVUuITuxAu751kPD+LmHNyLU8KxeixWESUkzS632oybPZ0hdM0VOfzs8cR0C+t7R9n1lWF3bK8hFxnhfYrLK6djUkpwy33MrfB/RTU+GzTzMLBUPBYCN7QN/ruu/OnkzWfue+1dFDjlDXVNTFTzNLINN5C4Bryb7uW1t6484zwvy3VtZLG5x0bA4E+G1HGELKUIPKSfmNqpUv4znHDco+XkR/Bw9poKyO/2mzBxHMW7Owqfx+ifiGD1VLFtkez7Ava5BuB1hZ3ljGfyNiHdJATTyjTKBvA4j6viVp1LVU9ZCJqWZksZ3OYbrnp1WFa29E+K3M66pSqULv0yW54afWZJFhdfLUinZRz92JtpMZFum+7pWsYdTd5YfTUurUYYmsJ5bC11+11bTUEBmrJmRMHG47+YDjK+OHYpTV1FFUh7IxICQx7xcC/Gvu0tKVrNpSy3yOd7eVryCexiK5lX4Sf2d/F+VUlXPhFljk/J/c5Gvt3S+k3t4Kpio9T96n3ckaDSlizh382aLwex6MEkef6yocR1NHwVnUJk2IxZcpARtdqf1uNvZZTa0lnHZt4LqRlr6W1c1H1sIiKSRAiIgKzwgQd1wNsg/qZmuPQbt+IWcrXcepTW4NWU7W6nOiJaOVw2j2gLIlmtZhispdKNXodTat3DofP8YsORLBEVQXQTfvREB+lzi3SXEt5L7F+IiZA3EEbxuK9ySyygCSR7wNwc4my8Ivcs8wLXSw5EReHoXpj3Ru1Rucx3K02K8omcA9Pc57tT3FzuVxuV5sORETIFrIdgRdmEUvfuKUlNa4klaHD8O8+wFfUIuUlFfE+ZSUYuT+Bq2FQGlwykpzvjhY09IAuupEW5ilFJI/PpScpOT+IREXp8hERAFnObcuy0FTJWUkZfRyEuOkfojxg83IfV06MijXVrC5hsyJdneTtam1HevijE0WrVuWsIrCXS0bGPP60RLD7N6hqjIdI7/hq2eM/3jQ8eyyoamkXEfZwzRU9atpe1lfnUUJFbJ8iVzf0FXTyeeHM+q45cm4yzwYYpPMlHxsosrC5jxgyZHULWXCouXMr6KYfljG2b8Pf6nsPYV8XYDizd+HVPqZfsXJ21ZcYPwZ1VzQfCa8URqLtOEYmP2bWf5d/0T8k4n/y2t/y7/ovn0VT6X4H36an9S8TiRdzcHxR27Daz1wOHwX1bl/F3bsOn9bbdq9VCq+EX4Hjr0lxkvFEYimWZVxt+6gcOmRg+K6oslYw/whTx+fL9AV0jZ3EuEH4HKV7bR41F4oriK4QZCqXW7vXxM8yMu7SFJ02RsOjsaieomPGLhoPUL+1d4aXcy+XHayPPVrSHzZ7EZ6AXENaCSTYAcZV/yXl6ShvX1zNM722jjO9jeMnnPs9eyeoMHw7DjejpI437tdru6ztXcrWz0tUZekqPLRTX2ruvB06awnx6QiIrcpQiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgP/2Q==',
      taxaAdmin: 0.12,    // 12%
      fundoReserva: 0.01, // 1%
      prazoMaximo: { 'AUTOMOVEL': 100, 'IMOVEL': 240, 'SERVICO': 70, 'ELETRO': 84 },
      regras: 'Aceita apenas pessoa física. Exige renda compatível com parcela.'
    },
    'porto': {
      nome: 'Porto Seguro',
      logoUrl: 'https://www.portoseguro.com.br/faqs/_next/_next/static/media/ic-logo-porto.61491afc.svg',
      taxaAdmin: 0.15,    // 15%
      fundoReserva: 0.015, // 1.5%
      prazoMaximo: { 'AUTOMOVEL': 100, 'IMOVEL': 240, 'SERVICO': 70, 'ELETRO': 84 },
      regras: 'Renda mínima de R$ 2.500,00. Possibilidade de lance embutido de até 30%.'
    },
    'caixa': {
      nome: 'Consórcio Caixa',
      logoUrl: 'https://www.caixa.gov.br/PublishingImages/nova-home/icones/x-volume-negativa-54.png',
      taxaAdmin: 0.14,    // 14%
      fundoReserva: 0.02, // 2%
      prazoMaximo: { 'AUTOMOVEL': 100, 'IMOVEL': 240, 'SERVICO': 70, 'ELETRO': 84 },
      regras: 'Excelente taxa para imóveis. Análise cadastral rigorosa.'
    }
  };

  // --- ELEMENTOS DO DOM ---
  const elements = {
    // Abas de visualização (Portal vs CRM vs Cartas)
    viewPortal: document.getElementById('view-portal'),
    viewCrm: document.getElementById('view-crm'),
    viewCartas: document.getElementById('view-cartas'),
    togglePortalBtn: document.getElementById('toggle-portal'),
    toggleCartasBtn: document.getElementById('toggle-cartas'),
    toggleCrmBtn: document.getElementById('toggle-crm'),

    // Controles do Simulador
    categoryBtns: document.querySelectorAll('.category-btn'),
    sliderCredito: document.getElementById('slider-credito'),
    sliderPrazo: document.getElementById('slider-prazo'),
    valCredito: document.getElementById('val-credito'),
    valPrazo: document.getElementById('val-prazo'),
    comparisonContainer: document.getElementById('comparison-cards'),

    // Modal de Pré-cadastro e Cadastro de Lead
    preCadastroModal: document.getElementById('pre-cadastro-modal'),
    modalLeadTitle: document.getElementById('modal-lead-title'),
    modalLeadSubtitle: document.getElementById('modal-lead-subtitle'),
    formPreCadastro: document.getElementById('form-pre-cadastro'),
    closeModalBtn: document.getElementById('close-modal'),
    selectedAdmField: document.getElementById('selected-adm'),
    groupLeadStatus: document.getElementById('group-lead-status'),
    regStatus: document.getElementById('reg-status'),
    regCredito: document.getElementById('reg-credito'),
    regAdmSelect: document.getElementById('reg-adm-select'),
    btnSubmitLead: document.getElementById('btn-submit-lead'),
    btnAddLeadCrm: document.getElementById('btn-add-lead-crm'),

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
    leadPanelBackdrop: document.getElementById('lead-panel-backdrop'),
    closeLeadPanelBtn: document.getElementById('close-lead-panel'),
    leadPanelName: document.getElementById('lead-panel-name'),
    leadDetailsBox: document.getElementById('lead-details-box'),
    leadPanelDocsBox: document.getElementById('lead-panel-docs-box'),
    btnAnexarDoc: document.getElementById('btn-anexar-doc'),
    leadDocUploadInput: document.getElementById('lead-doc-upload-input'),
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
    btnAlertOk: document.getElementById('btn-alert-ok'),

    // Elementos de Branding / Logo
    customLogoImg: document.getElementById('custom-logo-img'),
    defaultLogoIcon: document.getElementById('default-logo-icon'),
    btnUploadLogo: document.getElementById('btn-upload-logo'),
    btnUploadLogoText: document.getElementById('btn-upload-logo-text'),
    btnRemoveLogo: document.getElementById('btn-remove-logo'),
    inputUploadLogo: document.getElementById('input-upload-logo'),

    // Elementos de Cartas Contempladas
    cartasAdminActions: document.getElementById('cartas-admin-actions'),
    cartasTbody: document.getElementById('cartas-tbody'),
    filterCodCota: document.getElementById('filter-cod-cota'),
    filterCategoria: document.getElementById('filter-categoria'),
    filterAdministradora: document.getElementById('filter-administradora'),
    filterStatus: document.getElementById('filter-status'),
    filterOrder: document.getElementById('filter-order'),
    btnClearFilters: document.getElementById('btn-clear-filters'),
    cartasBatchToolbar: document.getElementById('cartas-batch-toolbar'),
    batchSelectedCount: document.getElementById('batch-selected-count'),
    checkSelectAll: document.getElementById('check-select-all'),
    btnBatchStatus: document.getElementById('btn-batch-status'),
    btnBatchDelete: document.getElementById('btn-batch-delete'),
    btnBatchClear: document.getElementById('btn-batch-clear'),
    kpiTotalCartas: document.getElementById('kpi-total-cartas'),
    kpiDispCartas: document.getElementById('kpi-disp-cartas'),
    kpiResCartas: document.getElementById('kpi-res-cartas'),
    kpiVolCredito: document.getElementById('kpi-vol-credito'),
    cartasPaginationInfo: document.getElementById('cartas-pagination-info'),
    cartasPaginationControls: document.getElementById('cartas-pagination-controls'),
    cartasPageSize: document.getElementById('cartas-page-size'),
    btnOpenImportCartas: document.getElementById('btn-open-import-cartas'),
    btnAddCarta: document.getElementById('btn-add-carta'),
    btnLoadDefaultCartas: document.getElementById('btn-load-default-cartas'),
    btnExportCartasCsv: document.getElementById('btn-export-cartas-csv'),
    modalImportCartas: document.getElementById('modal-import-cartas'),
    closeModalImportCartas: document.getElementById('close-modal-import-cartas'),
    importDropzone: document.getElementById('import-dropzone'),
    inputCartasFile: document.getElementById('input-cartas-file'),
    dropzoneLabel: document.getElementById('dropzone-label'),
    dropzoneFilename: document.getElementById('dropzone-filename'),
    btnUseModelArtefato: document.getElementById('btn-use-model-artefato'),
    btnCancelImport: document.getElementById('btn-cancel-import'),
    btnSubmitImport: document.getElementById('btn-submit-import'),
    importPreviewContainer: document.getElementById('import-preview-container'),
    importPreviewTbody: document.getElementById('import-preview-tbody'),
    previewCountLabel: document.getElementById('preview-count-label'),
    modalEditCarta: document.getElementById('modal-edit-carta'),
    closeModalEditCarta: document.getElementById('close-modal-edit-carta'),
    modalEditCartaTitle: document.getElementById('modal-edit-carta-title'),
    formCartaItem: document.getElementById('form-carta-item'),
    formCartaOriginalCod: document.getElementById('form-carta-original-cod'),
    btnCancelEditCarta: document.getElementById('btn-cancel-edit-carta'),
    modalBatchStatus: document.getElementById('modal-batch-status'),
    closeModalBatchStatus: document.getElementById('close-modal-batch-status'),
    batchModalCount: document.getElementById('batch-modal-count'),
    batchNewStatus: document.getElementById('batch-new-status'),
    btnCancelBatchStatus: document.getElementById('btn-cancel-batch-status'),
    btnApplyBatchStatus: document.getElementById('btn-apply-batch-status')
  };


  // --- FUNÇÃO DE CONFIRMAÇÃO GENÉRICA ---
  let currentConfirmCallback = null;
  const showConfirm = (message, title, onConfirm, btnText = 'Confirmar', isDanger = false) => {
    elements.confirmTitle.textContent = title || 'Confirmar';
    elements.confirmMessage.textContent = message;
    if (elements.btnConfirmOk) {
      elements.btnConfirmOk.textContent = btnText;
      if (isDanger) {
        elements.btnConfirmOk.style.background = '#ef4444';
        elements.btnConfirmOk.style.borderColor = '#ef4444';
      } else {
        elements.btnConfirmOk.style.background = 'var(--primary-gradient)';
        elements.btnConfirmOk.style.borderColor = 'transparent';
      }
    }
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
    // Padrão AUTOMOVEL: a partir de 30k com prazo máximo de 100 meses
    let minC = 30000;
    let maxC = 300000;
    let stepC = 5000;
    let minP = 12;
    let maxP = 100;
    let stepP = 1;

    if (state.categoria === 'IMOVEL') {
      // Imóvel: a partir de 100k com prazo máximo de 240 meses
      minC = 100000;
      maxC = 1500000;
      stepC = 25000;
      minP = 60;
      maxP = 240;
      stepP = 12;
    } else if (state.categoria === 'SERVICO') {
      // Serviços: a partir de 15k com prazo máximo de 70 meses
      minC = 15000;
      maxC = 100000;
      stepC = 2500;
      minP = 12;
      maxP = 70;
      stepP = 1;
    } else if (state.categoria === 'ELETRO') {
      // Eletro: a partir de 7k com prazo máximo de 84 meses
      minC = 7000;
      maxC = 50000;
      stepC = 1000;
      minP = 6;
      maxP = 84;
      stepP = 6;
    }

    // Ajustar ranges dos inputs
    elements.sliderCredito.min = minC;
    elements.sliderCredito.max = maxC;
    elements.sliderCredito.step = stepC;

    elements.sliderPrazo.min = minP;
    elements.sliderPrazo.max = maxP;
    elements.sliderPrazo.step = stepP;

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
          <button type="button" class="btn btn-primary btn-sm w-full select-plan-btn" data-adm="${res.nome}" data-parcela="${res.parcela}" onclick="window.openPreCadastro('${res.nome}', ${res.parcela})">
            Solicitar Proposta
          </button>
        </div>
      `;

      const selectBtn = card.querySelector('.select-plan-btn');
      if (selectBtn) {
        selectBtn.addEventListener('click', (e) => {
          e.preventDefault();
          openPreCadastro(res.nome, res.parcela);
        });
      }

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

  // --- STATUS LABELS PARA O CRM ---
  const statusTitles = {
    'NOVO': 'Novos Leads',
    'EM_ATENDIMENTO': 'Em Atendimento',
    'QUALIFICADO': 'Qualificados',
    'PROPOSTA_ENVIADA': 'Proposta Enviada',
    'VENDIDO': 'Vendido / Ativo'
  };

  // --- MODAL DE PRÉ-CADASTRO E CADASTRO DE NOVO LEAD ---
  const openPreCadastro = (admName, parcela, targetStatus = 'NOVO', origin = 'WEB') => {
    if (elements.formPreCadastro) elements.formPreCadastro.reset();

    if (elements.selectedAdmField) elements.selectedAdmField.value = admName || '';
    if (elements.regStatus) elements.regStatus.value = targetStatus;
    if (elements.regAdmSelect) {
      elements.regAdmSelect.value = admName || 'Itaú Consórcios';
    }
    if (elements.regCredito) {
      elements.regCredito.value = state.credito || 80000;
    }

    if (elements.preCadastroModal) {
      elements.preCadastroModal.setAttribute('data-parcela', parcela || 0);
      elements.preCadastroModal.setAttribute('data-status', targetStatus);
      elements.preCadastroModal.setAttribute('data-origin', origin);

      if (origin === 'CRM') {
        const colTitle = statusTitles[targetStatus] || targetStatus;
        if (elements.modalLeadTitle) elements.modalLeadTitle.textContent = 'Cadastrar Novo Lead';
        if (elements.modalLeadSubtitle) elements.modalLeadSubtitle.textContent = `Preencha os dados abaixo para cadastrar o lead na etapa: ${colTitle}.`;
        if (elements.btnSubmitLead) elements.btnSubmitLead.textContent = 'Cadastrar Lead';
        if (elements.groupLeadStatus) elements.groupLeadStatus.style.display = 'block';
      } else {
        if (elements.modalLeadTitle) elements.modalLeadTitle.textContent = 'Solicitar Pré-Cadastro';
        if (elements.modalLeadSubtitle) elements.modalLeadSubtitle.textContent = 'Preencha os dados abaixo para gerar sua pré-proposta e enviar para a administradora escolhida.';
        if (elements.btnSubmitLead) elements.btnSubmitLead.textContent = 'Enviar Simulação';
        if (elements.groupLeadStatus) elements.groupLeadStatus.style.display = 'none';
      }

      // Marca automaticamente a categoria atual do simulador
      const catCheck = elements.preCadastroModal.querySelector(`input[name="tipo_consorcio"][value="${state.categoria}"]`);
      if (catCheck) catCheck.checked = true;

      elements.preCadastroModal.classList.add('active');
    }
  };
  window.openPreCadastro = openPreCadastro;

  const closePreCadastro = () => {
    if (elements.preCadastroModal) {
      elements.preCadastroModal.classList.remove('active');
      elements.preCadastroModal.removeAttribute('data-status');
      elements.preCadastroModal.removeAttribute('data-origin');
    }
    if (elements.formPreCadastro) elements.formPreCadastro.reset();
  };
  window.closePreCadastro = closePreCadastro;

  if (elements.closeModalBtn) {
    elements.closeModalBtn.addEventListener('click', closePreCadastro);
  }

  if (elements.preCadastroModal) {
    elements.preCadastroModal.addEventListener('click', (e) => {
      if (e.target === elements.preCadastroModal) {
        closePreCadastro();
      }
    });
  }

  elements.formPreCadastro.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(elements.formPreCadastro);
    const origin = elements.preCadastroModal.getAttribute('data-origin') || 'WEB';
    const status = formData.get('status') || elements.preCadastroModal.getAttribute('data-status') || 'NOVO';
    const adm = elements.selectedAdmField.value || formData.get('administradora_select') || 'Itaú Consórcios';
    const parcelaAttr = parseFloat(elements.preCadastroModal.getAttribute('data-parcela'));
    const creditoVal = parseFloat(formData.get('valor_credito')) || state.credito || 80000;
    const parcela = !isNaN(parcelaAttr) && parcelaAttr > 0 ? parcelaAttr : Math.round(creditoVal / (state.prazo || 60));

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
      status: status,
      origem: origin === 'CRM' ? 'CRM' : 'WEB',
      tiposConsorcio: tiposConsorcio, // Array multi-seleção
      categoriaBem: tiposConsorcio.length > 0 ? tiposConsorcio[0] : state.categoria,
      valorCredito: creditoVal,
      prazoMeses: state.prazo || 60,
      administradora: adm,
      valorParcela: parcela,
      created_at: new Date().toISOString(),
      chatHistory: [
        { remetente: 'IA', conteudo: origin === 'CRM' ? `Lead cadastrado diretamente via CRM na etapa ${statusTitles[status] || status}.` : 'Olá! Proposta criada com sucesso através do simulador web!' }
      ],
      documentos: [
        { id: 'doc-cpf', tipo: 'CPF / IDENTIDADE', nome: 'documento_identidade.pdf', status: 'PENDENTE', ocrLog: null },
        { id: 'doc-renda', tipo: 'COMPROVANTE DE RENDA', nome: 'extrato_bancario.jpg', status: 'PENDENTE', ocrLog: null }
      ]
    };

    state.leads.push(newLead);

    // sync to firestore
    try {
      if (newLead.id) {
        await setDoc(doc(db, 'leads', newLead.id), newLead);
      }
    } catch (e) {
      console.error('Erro ao salvar lead no Firestore:', e);
    }

    // Fechar modal e renderizar CRM atualizado
    closePreCadastro();
    renderKanban();

    showAlert(origin === 'CRM' ? 'Lead cadastrado com sucesso no painel!' : 'Simulação salva com sucesso! Um consultor entrará em contato em breve.', 'Sucesso');
  });

  // --- CHATBOT WIDGET (MOCK IA) ---
  const botAnswers = {
    'ola': 'Olá! Sou o assistente virtual de consórcios. Estou aqui para tirar suas dúvidas e te ajudar a simular o consórcio perfeito. Qual o seu objetivo de compra hoje (ex: Carro, Casa, Serviços)?',
    'oi': 'Olá! Sou o assistente virtual de consórcios. Estou aqui para tirar suas dúvidas e te ajudar a simular o consórcio perfeito. Qual o seu objetivo de compra hoje (ex: Carro, Casa, Serviços)?',
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

      if (val >= 7000) {
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

  // --- INTEGRAÇÃO COM WHATSAPP ---
  const WHATSAPP_PHONE = '5521998228936';
  const openWhatsAppChat = () => {
    const defaultMsg = encodeURIComponent('Olá! Gostaria de falar sobre consórcios e tirar dúvidas.');
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${defaultMsg}`, '_blank');
  };

  elements.chatTrigger.addEventListener('click', () => {
    openWhatsAppChat();
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
              if (l.id) setDoc(doc(db, 'leads', l.id), l);
            });
          }
        } catch (e) { console.error(e); }

        renderKanban();
      }
    });
  });

  // --- BOTÕES DE ADICIONAR LEAD NAS COLUNAS / ABAS DO KANBAN ---
  document.querySelectorAll('.btn-add-lead-column').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const status = btn.getAttribute('data-status') || 'NOVO';
      openPreCadastro('', 0, status, 'CRM');
    });
  });

  // Botão de Novo Lead no cabeçalho do CRM
  if (elements.btnAddLeadCrm) {
    elements.btnAddLeadCrm.addEventListener('click', () => {
      openPreCadastro('', 0, 'NOVO', 'CRM');
    });
  }

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

    // Renderizar seção de documentos / OCR
    renderLeadDocuments(lead);

    elements.leadPanel.classList.add('active');
    if (elements.leadPanelBackdrop) elements.leadPanelBackdrop.classList.add('active');
  };

  // Sincronizar alterações de lead no Firestore
  const syncLeadUpdate = async (lead) => {
    try {
      if (lead && lead.id) {
        await setDoc(doc(db, 'leads', lead.id), lead, { merge: true });
      }
    } catch (e) {
      console.error('Erro ao sincronizar lead no Firestore:', e);
    }
  };

  const renderLeadDocuments = (lead) => {
    if (!elements.leadPanelDocsBox) return;
    elements.leadPanelDocsBox.innerHTML = '';

    // Garantir lista de documentos
    if (!lead.documentos || lead.documentos.length === 0) {
      lead.documentos = [
        { id: 'doc-cpf', tipo: 'CPF / IDENTIDADE', nome: 'documento_identidade.pdf', status: 'PENDENTE', ocrLog: null },
        { id: 'doc-renda', tipo: 'COMPROVANTE DE RENDA', nome: 'extrato_bancario.jpg', status: 'PENDENTE', ocrLog: null }
      ];
      syncLeadUpdate(lead);
    }

    lead.documentos.forEach(docItem => {
      const docDiv = document.createElement('div');
      docDiv.className = 'doc-box';
      docDiv.style.marginBottom = '0.5rem';

      const isApproved = docItem.status === 'APROVADO';
      const badgeClass = isApproved ? 'success' : 'pending';
      const badgeLabel = isApproved ? '✓ Aprovado' : 'Validar OCR';

      docDiv.innerHTML = `
        <div style="flex: 1; min-width: 0; margin-right: 0.5rem;">
          <div class="doc-name" style="word-break: break-all;">${docItem.nome}</div>
          <div style="font-size:0.7rem; color:var(--text-muted); display:flex; align-items:center; gap:0.5rem; margin-top:2px;">
            <span>${docItem.tipo || 'DOCUMENTO'}</span>
            ${docItem.uploadedAt ? `<span style="font-size:0.65rem;">• ${new Date(docItem.uploadedAt).toLocaleDateString('pt-BR')}</span>` : ''}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <button class="btn btn-secondary btn-sm doc-status-badge ${badgeClass}" data-doc-id="${docItem.id}" ${isApproved ? 'disabled style="cursor:default; opacity:0.9;"' : ''}>
            ${badgeLabel}
          </button>
          <button class="btn btn-secondary btn-sm delete-doc-btn" data-doc-id="${docItem.id}" title="Remover documento" style="padding: 0.2rem 0.45rem; font-size: 0.8rem; border-color: #ef4444; color: #ef4444; border-radius: 4px; line-height: 1;">
            &times;
          </button>
        </div>
      `;

      // Ação de validação OCR
      const btnOcr = docDiv.querySelector('.doc-status-badge');
      if (!isApproved) {
        btnOcr.addEventListener('click', () => {
          triggerMockOCR(lead, docItem.id);
        });
      }

      // Ação de excluir documento anexado
      const btnDel = docDiv.querySelector('.delete-doc-btn');
      btnDel.addEventListener('click', () => {
        showConfirm(`Deseja remover o documento "${docItem.nome}"?`, 'Remover Documento', () => {
          lead.documentos = lead.documentos.filter(d => d.id !== docItem.id);
          syncLeadUpdate(lead);
          renderLeadDocuments(lead);
        }, 'Remover', true);
      });

      elements.leadPanelDocsBox.appendChild(docDiv);
    });
  };

  const triggerMockOCR = (lead, docId) => {
    const docItem = lead.documentos.find(d => d.id === docId);
    if (!docItem) return;

    // Alterar botão para simulando carregamento
    const btn = elements.leadPanelDocsBox.querySelector(`[data-doc-id="${docId}"]`);
    if (btn) {
      btn.textContent = 'Processando...';
      btn.disabled = true;
    }

    setTimeout(async () => {
      docItem.status = 'APROVADO';
      docItem.ocrLog = {
        processed_at: new Date().toISOString(),
        confidenceScore: 0.985,
        fieldsExtracted: {
          nomeMatches: true,
          cpfValid: true
        }
      };

      // Sincronizar com Firestore
      await syncLeadUpdate(lead);
      renderLeadDocuments(lead);
      showAlert(`OCR processado com sucesso para "${docItem.nome}"! Os dados foram validados de acordo com o cadastro do lead.`, 'Validação Concluída');
    }, 1200);
  };

  // Configuração do input de anexar documento
  if (elements.leadDocUploadInput) {
    elements.leadDocUploadInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file || !state.leadCorrente) return;

      const newDoc = {
        id: 'doc-' + Date.now(),
        tipo: file.type.includes('pdf') ? 'DOCUMENTO (PDF)' : 'COMPROVANTE (IMAGEM)',
        nome: file.name,
        status: 'PENDENTE',
        uploadedAt: new Date().toISOString(),
        ocrLog: null
      };

      if (!state.leadCorrente.documentos) {
        state.leadCorrente.documentos = [];
      }
      state.leadCorrente.documentos.push(newDoc);
      syncLeadUpdate(state.leadCorrente);
      renderLeadDocuments(state.leadCorrente);
      showAlert(`Documento "${file.name}" anexado com sucesso! Agora você pode clicar em "Validar OCR".`, 'Documento Anexado');
      e.target.value = '';
    });
  }


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

  const closeLeadDrawer = () => {
    if (elements.leadPanel) elements.leadPanel.classList.remove('active');
    if (elements.leadPanelBackdrop) elements.leadPanelBackdrop.classList.remove('active');
    state.leadCorrente = null;
  };

  if (elements.closeLeadPanelBtn) {
    elements.closeLeadPanelBtn.addEventListener('click', closeLeadDrawer);
  }

  if (elements.leadPanelBackdrop) {
    elements.leadPanelBackdrop.addEventListener('click', closeLeadDrawer);
  }

  // Tecla Esc fecha o drawer do lead
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.leadPanel && elements.leadPanel.classList.contains('active')) {
      closeLeadDrawer();
    }
  });

  elements.leadPanelDeleteBtn.addEventListener('click', () => {
    if (!state.leadCorrente) return;
    const leadToDelete = state.leadCorrente;
    showConfirm(`Tem certeza que deseja excluir o lead ${leadToDelete.nomeCompleto || 'selecionado'}?`, 'Excluir Lead', async () => {
      state.leads = state.leads.filter(l => l.id !== leadToDelete.id);

      // sync to firestore
      try {
        if (leadToDelete.id) {
          await deleteDoc(doc(db, 'leads', leadToDelete.id));
        }
      } catch (e) {
        console.error('Erro ao excluir lead do Firestore:', e);
      }

      closeLeadDrawer();
      renderKanban();
    }, 'Excluir', true);
  });

  // --- SELETOR DE ETAPAS (TABS) MOBILE DO KANBAN ---
  document.querySelectorAll('.kanban-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.kanban-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetColId = btn.getAttribute('data-col');

      const allColumns = document.querySelectorAll('.kanban-column');
      allColumns.forEach(col => {
        if (targetColId === 'all' || col.id === targetColId) {
          col.classList.remove('mobile-hidden');
        } else {
          col.classList.add('mobile-hidden');
        }
      });
    });
  });

  // --- SISTEMA DE NAVEGAÇÃO MULTI-VIEWS & SIDEBAR (BOLTFLOW / DRIPIFY) ---
  const appViews = ['portal', 'campanhas', 'inbox', 'crm', 'cartas'];

  const switchAppView = (viewName) => {
    if (!appViews.includes(viewName)) viewName = 'portal';

    // Regra de segurança para visitantes/clientes
    if (['campanhas', 'inbox', 'crm'].includes(viewName) && currentUserRole !== 'ADM' && currentUserRole !== 'OPERADOR') {
      viewName = 'portal';
    }

    const titles = {
      'portal': 'Portal & Simulador',
      'campanhas': 'Campanhas WhatsApp',
      'inbox': 'Caixa de Entrada',
      'crm': 'Painel CRM de Leads',
      'cartas': 'Cartas Contempladas'
    };

    const titleEl = document.getElementById('topbar-current-title');
    if (titleEl && titles[viewName]) {
      titleEl.textContent = titles[viewName];
    }

    // Esconde/Exibe cada view
    const viewPortal = document.getElementById('view-portal');
    const viewCampanhas = document.getElementById('view-campanhas');
    const viewInbox = document.getElementById('view-inbox');
    const viewCrm = document.getElementById('view-crm');
    const viewCartas = document.getElementById('view-cartas');

    if (viewPortal) viewPortal.style.display = (viewName === 'portal') ? 'block' : 'none';

    if (viewCampanhas) {
      if (viewName === 'campanhas') {
        viewCampanhas.classList.add('active');
        viewCampanhas.style.display = 'block';
        renderCampanhas();
      } else {
        viewCampanhas.classList.remove('active');
        viewCampanhas.style.display = 'none';
      }
    }

    if (viewInbox) {
      if (viewName === 'inbox') {
        viewInbox.classList.add('active');
        viewInbox.style.display = 'flex';
        renderInbox();
      } else {
        viewInbox.classList.remove('active');
        viewInbox.style.display = 'none';
      }
    }

    if (viewCrm) {
      if (viewName === 'crm') {
        viewCrm.classList.add('active');
        viewCrm.style.display = 'block';
        renderKanban();
      } else {
        viewCrm.classList.remove('active');
        viewCrm.style.display = 'none';
      }
    }

    if (viewCartas) {
      if (viewName === 'cartas') {
        viewCartas.classList.add('active');
        viewCartas.style.display = 'block';
        applyCartasFiltersAndRender();
      } else {
        viewCartas.classList.remove('active');
        viewCartas.style.display = 'none';
      }
    }

    // Atualiza classes ativas na Sidebar
    document.querySelectorAll('.sidebar-nav-item[data-view]').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Sincroniza com botões antigos (compatibilidade)
    if (elements.togglePortalBtn) {
      elements.togglePortalBtn.classList.toggle('active', viewName === 'portal');
    }
    if (elements.toggleCartasBtn) {
      elements.toggleCartasBtn.classList.toggle('active', viewName === 'cartas');
    }
    if (elements.toggleCrmBtn) {
      elements.toggleCrmBtn.classList.toggle('active', viewName === 'crm');
    }

    // Fecha a sidebar no mobile se estiver aberta
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('active');
    }
  };

  // Listeners de cliques na Sidebar
  document.querySelectorAll('.sidebar-nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = btn.getAttribute('data-view');
      switchAppView(targetView);
    });
  });

  const sidebarBrandBtn = document.getElementById('sidebar-brand-btn');
  if (sidebarBrandBtn) {
    sidebarBrandBtn.addEventListener('click', (e) => {
      e.preventDefault();
      switchAppView('portal');
    });
  }

  // Compatibilidade com cliques nos botões legados
  if (elements.togglePortalBtn) {
    elements.togglePortalBtn.addEventListener('click', () => switchAppView('portal'));
  }
  if (elements.toggleCartasBtn) {
    elements.toggleCartasBtn.addEventListener('click', () => switchAppView('cartas'));
  }
  if (elements.toggleCrmBtn) {
    elements.toggleCrmBtn.addEventListener('click', () => switchAppView('crm'));
  }

  // Atualiza dados visuais do usuário na Sidebar
  const updateSidebarUserInfo = (name, email, role) => {
    const avatarEl = document.getElementById('sidebar-user-avatar');
    const nameEl = document.getElementById('sidebar-user-name');
    const roleBadgeEl = document.getElementById('sidebar-role-badge');
    const emailEl = document.getElementById('sidebar-user-email');

    const cleanName = name || 'Usuário';
    if (avatarEl) {
      const parts = cleanName.trim().split(' ');
      const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]) : cleanName.substring(0, 2);
      avatarEl.textContent = initials.toUpperCase();
    }
    if (nameEl) nameEl.textContent = cleanName;
    if (roleBadgeEl) roleBadgeEl.textContent = role || 'CLIENTE';
    if (emailEl) emailEl.textContent = email || '';
  };

  // Atualiza visibilidade dos itens de menu na Sidebar
  const updateSidebarNavPermissions = () => {
    const isAdm = currentUserRole === 'ADM';
    const isOperador = currentUserRole === 'OPERADOR';
    const canSeeInternal = isAdm || isOperador;

    const navCampanhas = document.getElementById('nav-campanhas');
    const navInbox = document.getElementById('nav-inbox');
    const navCrm = document.getElementById('nav-crm');

    if (navCampanhas) navCampanhas.style.display = canSeeInternal ? 'flex' : 'none';
    if (navInbox) navInbox.style.display = canSeeInternal ? 'flex' : 'none';
    if (navCrm) navCrm.style.display = canSeeInternal ? 'flex' : 'none';
  };

  // --- MÓDULO DE CAMPANHAS WHATSAPP (BOLTFLOW / DINBOTFLOW - PÁGINAS 1, 2 E 3) ---
  const defaultCampanhas = [
    {
      id: 'camp-1',
      nome: 'Campanha WhatsApp 01 - Consórcio Imóveis SP',
      segmento: 'IMOVEL',
      status: 'ATIVA',
      disparos: 286,
      entregues: 270,
      respostas: 48,
      conversoes: 14,
      prospects: [
        { id: 'p1', nome: 'Eduardo Silveira Ramos', whatsapp: '+55 (11) 98123-4567', origem: 'CRM C7 Contempla', etapa: 'Respondeu', status: 'Respondeu', data: 'Hoje às 11:42' },
        { id: 'p2', nome: 'Fabiana Cristina Araújo', whatsapp: '+55 (11) 97234-5678', origem: 'Importado CSV', etapa: 'Respondeu', status: 'Respondeu', data: 'Hoje às 10:15' },
        { id: 'p3', nome: 'Ricardo Magalhães Soares', whatsapp: '+55 (11) 96345-6789', origem: 'CRM C7 Contempla', etapa: '2ª Mensagem', status: 'Entregue', data: 'Ontem às 18:30' },
        { id: 'p4', nome: 'Samuel Oliveira Mendes', whatsapp: '+55 (21) 99456-7890', origem: 'Importado CSV', etapa: '1ª Mensagem', status: 'Enviado', data: 'Ontem às 14:10' },
        { id: 'p5', nome: 'José Mauricio Franklin de Miranda', whatsapp: '+55 (31) 98567-8901', origem: 'CRM C7 Contempla', etapa: 'Respondeu', status: 'Respondeu', data: '21/10 às 16:55' },
        { id: 'p6', nome: 'Filipe Villarman Prado', whatsapp: '+55 (41) 97678-9012', origem: 'Importado CSV', etapa: '1ª Mensagem', status: 'Pendente', data: '20/10 às 09:20' }
      ]
    },
    {
      id: 'camp-2',
      nome: 'Campanha Cartas Contempladas - Investidores',
      segmento: 'IMOVEL',
      status: 'ATIVA',
      disparos: 140,
      entregues: 135,
      respostas: 32,
      conversoes: 9,
      prospects: [
        { id: 'p7', nome: 'Juliana Beatriz Costa', whatsapp: '+55 (11) 99887-1122', origem: 'CRM C7 Contempla', etapa: 'Respondeu', status: 'Respondeu', data: 'Hoje às 08:30' },
        { id: 'p8', nome: 'Marcelo Pimentel', whatsapp: '+55 (21) 98776-3344', origem: 'Importado CSV', etapa: '2ª Mensagem', status: 'Entregue', data: 'Ontem às 17:00' }
      ]
    },
    {
      id: 'camp-3',
      nome: 'Reativação Leads Frios CRM',
      segmento: 'AUTOMOVEL',
      status: 'PAUSADA',
      disparos: 95,
      entregues: 91,
      respostas: 12,
      conversoes: 3,
      prospects: [
        { id: 'p9', nome: 'Lucas de Andrade', whatsapp: '+55 (19) 97654-2211', origem: 'CRM C7 Contempla', etapa: '1ª Mensagem', status: 'Pendente', data: '19/10 às 15:00' }
      ]
    }
  ];

  let campanhasData = [];
  try {
    const saved = localStorage.getItem('consorcio_campanhas');
    campanhasData = saved ? JSON.parse(saved) : defaultCampanhas;
  } catch (e) {
    campanhasData = defaultCampanhas;
  }

  let activeCampanhaId = campanhasData[0]?.id || 'camp-1';
  let prospectsFilterStatus = 'TODOS';
  let prospectsSearchQuery = '';

  const saveCampanhasData = () => {
    try {
      localStorage.setItem('consorcio_campanhas', JSON.stringify(campanhasData));
    } catch (e) {}
  };

  const getActiveCampanha = () => {
    return campanhasData.find(c => c.id === activeCampanhaId) || campanhasData[0];
  };

  const renderCampanhas = () => {
    const activeCamp = getActiveCampanha();
    if (!activeCamp) return;

    // Preenche seletor de campanhas
    const selectEl = document.getElementById('select-campanha-ativa');
    if (selectEl) {
      selectEl.innerHTML = campanhasData.map(c => `
        <option value="${c.id}" ${c.id === activeCamp.id ? 'selected' : ''}>${c.nome}</option>
      `).join('');
    }

    // Atualiza status badge
    const badgeEl = document.getElementById('badge-campanha-status');
    const textStatusEl = document.getElementById('text-campanha-status');
    const pauseBtnText = document.getElementById('btn-pause-text');

    const isAtiva = activeCamp.status === 'ATIVA';
    if (badgeEl) {
      badgeEl.className = isAtiva ? 'campanha-status-badge' : 'campanha-status-badge paused';
      badgeEl.innerHTML = `
        <span style="width:7px; height:7px; border-radius:50%; background:${isAtiva ? '#10b981' : '#facc15'};"></span>
        <span>${isAtiva ? 'Campanha Ativa' : 'Campanha Pausada'}</span>
      `;
    }
    if (pauseBtnText) {
      pauseBtnText.textContent = isAtiva ? 'Pausar' : 'Retomar';
    }

    // Atualiza Indicadores KPI / Funil (Página 1 do PDF)
    const kpiDisparos = document.getElementById('kpi-campanha-disparos');
    const kpiEntregues = document.getElementById('kpi-campanha-entregues');
    const kpiRespostas = document.getElementById('kpi-campanha-respostas');
    const kpiConversoes = document.getElementById('kpi-campanha-conversoes');

    const barDisparos = document.getElementById('bar-campanha-disparos');
    const barEntregues = document.getElementById('bar-campanha-entregues');
    const barRespostas = document.getElementById('bar-campanha-respostas');
    const barConversoes = document.getElementById('bar-campanha-conversoes');

    const pctDisparos = document.getElementById('pct-campanha-disparos');
    const pctEntregues = document.getElementById('pct-campanha-entregues');
    const pctRespostas = document.getElementById('pct-campanha-respostas');
    const pctConversoes = document.getElementById('pct-campanha-conversoes');

    if (kpiDisparos) kpiDisparos.textContent = activeCamp.disparos;
    if (kpiEntregues) kpiEntregues.textContent = activeCamp.entregues;
    if (kpiRespostas) kpiRespostas.textContent = activeCamp.respostas;
    if (kpiConversoes) kpiConversoes.textContent = activeCamp.conversoes;

    const rateEntregues = activeCamp.disparos > 0 ? ((activeCamp.entregues / activeCamp.disparos) * 100).toFixed(1) : '0';
    const rateRespostas = activeCamp.entregues > 0 ? ((activeCamp.respostas / activeCamp.entregues) * 100).toFixed(1) : '0';
    const rateConversoes = activeCamp.respostas > 0 ? ((activeCamp.conversoes / activeCamp.respostas) * 100).toFixed(1) : '0';

    if (barDisparos) barDisparos.style.width = '100%';
    if (barEntregues) barEntregues.style.width = `${rateEntregues}%`;
    if (barRespostas) barRespostas.style.width = `${rateRespostas}%`;
    if (barConversoes) barConversoes.style.width = `${rateConversoes}%`;

    if (pctDisparos) pctDisparos.textContent = '100%';
    if (pctEntregues) pctEntregues.textContent = `${rateEntregues}%`;
    if (pctRespostas) pctRespostas.textContent = `${rateRespostas}%`;
    if (pctConversoes) pctConversoes.textContent = `${rateConversoes}%`;

    // Filtra e Renderiza Tabela de Prospects (Página 1 do PDF)
    const prospects = activeCamp.prospects || [];
    const countTodos = prospects.length;
    const countResp = prospects.filter(p => p.status === 'Respondeu').length;
    const countEnv = prospects.filter(p => p.status === 'Enviado' || p.status === 'Entregue').length;
    const countPend = prospects.filter(p => p.status === 'Pendente').length;

    const elTodos = document.getElementById('count-prospects-todos');
    const elResp = document.getElementById('count-prospects-resp');
    const elEnv = document.getElementById('count-prospects-env');
    const elPend = document.getElementById('count-prospects-pend');

    if (elTodos) elTodos.textContent = countTodos;
    if (elResp) elResp.textContent = countResp;
    if (elEnv) elEnv.textContent = countEnv;
    if (elPend) elPend.textContent = countPend;

    let filtered = prospects;
    if (prospectsFilterStatus === 'RESPONDIDOS') {
      filtered = filtered.filter(p => p.status === 'Respondeu');
    } else if (prospectsFilterStatus === 'ENVIADOS') {
      filtered = filtered.filter(p => p.status === 'Enviado' || p.status === 'Entregue');
    } else if (prospectsFilterStatus === 'PENDENTES') {
      filtered = filtered.filter(p => p.status === 'Pendente');
    }

    if (prospectsSearchQuery.trim()) {
      const q = prospectsSearchQuery.toLowerCase();
      filtered = filtered.filter(p => p.nome.toLowerCase().includes(q) || p.whatsapp.includes(q));
    }

    const tbody = document.getElementById('prospects-table-body');
    if (tbody) {
      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
              Nenhum prospect encontrado com os filtros atuais.
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = filtered.map(p => {
          let statusClass = 'sent';
          if (p.status === 'Respondeu') statusClass = 'replied';
          else if (p.status === 'Pendente') statusClass = 'pending';
          else if (p.status === 'Convertido') statusClass = 'converted';

          const initials = p.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

          return `
            <tr>
              <td>
                <div class="prospect-user-cell">
                  <div class="prospect-avatar">${initials}</div>
                  <div>
                    <strong style="color:var(--text-main); font-size:0.88rem;">${p.nome}</strong>
                  </div>
                </div>
              </td>
              <td style="color:var(--text-muted); font-size:0.84rem;">${p.whatsapp}</td>
              <td><span style="font-size:0.75rem; background:rgba(255,255,255,0.06); padding:0.15rem 0.5rem; border-radius:4px; color:#cbd5e1;">${p.origem}</span></td>
              <td><span style="font-size:0.8rem; font-weight:600; color:var(--primary);">${p.etapa}</span></td>
              <td>
                <span class="status-pill ${statusClass}">
                  <span style="width:6px; height:6px; border-radius:50%; background:currentColor;"></span>
                  ${p.status}
                </span>
              </td>
              <td style="color:var(--text-muted); font-size:0.78rem;">${p.data}</td>
              <td style="text-align: right;">
                <button type="button" class="btn btn-secondary" style="font-size:0.76rem; padding:0.3rem 0.65rem;" onclick="openInboxForProspect('${p.whatsapp}', '${p.nome}', '${activeCamp.nome}')" title="Abrir conversa na Caixa de Entrada">
                  Ver conversa
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  };

  // Listeners da Tela de Campanhas
  const selectCampanhaAtiva = document.getElementById('select-campanha-ativa');
  if (selectCampanhaAtiva) {
    selectCampanhaAtiva.addEventListener('change', (e) => {
      activeCampanhaId = e.target.value;
      renderCampanhas();
    });
  }

  const btnToggleCampanhaPause = document.getElementById('btn-toggle-campanha-pause');
  if (btnToggleCampanhaPause) {
    btnToggleCampanhaPause.addEventListener('click', () => {
      const activeCamp = getActiveCampanha();
      if (!activeCamp) return;
      activeCamp.status = activeCamp.status === 'ATIVA' ? 'PAUSADA' : 'ATIVA';
      saveCampanhasData();
      renderCampanhas();
    });
  }

  const searchProspectsInput = document.getElementById('input-search-prospects');
  if (searchProspectsInput) {
    searchProspectsInput.addEventListener('input', (e) => {
      prospectsSearchQuery = e.target.value;
      renderCampanhas();
    });
  }

  document.querySelectorAll('.prospects-filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.prospects-filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      prospectsFilterStatus = tab.getAttribute('data-filter');
      renderCampanhas();
    });
  });

  const btnOpenCriarCampanha = document.getElementById('btn-open-criar-campanha');
  if (btnOpenCriarCampanha) {
    btnOpenCriarCampanha.addEventListener('click', () => {
      openCriarCampanhaModal();
    });
  }

  // --- WIZARD ASSISTENTE DE CRIAÇÃO DE CAMPANHA (PÁGINAS 2 E 3 DO PDF) ---
  let wzCurrentStep = 1;
  let wzSelectedSource = 'CSV';
  let wzParsedLeads = [];

  const openCriarCampanhaModal = () => {
    wzCurrentStep = 1;
    wzSelectedSource = 'CSV';
    wzParsedLeads = [];

    const inputNome = document.getElementById('wz-input-nome');
    if (inputNome) inputNome.value = '';

    const statusCsv = document.getElementById('wz-csv-status-text');
    if (statusCsv) statusCsv.textContent = 'Nenhum arquivo carregado';

    updateWizardStepView();
    updateWizardCrmCount();

    const modal = document.getElementById('modal-criar-campanha');
    if (modal) modal.classList.add('active');
  };

  window._openCriarCampanhaWizard = openCriarCampanhaModal;
  window.openCriarCampanhaModal = openCriarCampanhaModal;
  window.closeCriarCampanhaModal = () => {
    const modal = document.getElementById('modal-criar-campanha');
    if (modal) modal.classList.remove('active');
  };

  window.openWhatsAppConfigModal = (event) => {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const modal = document.getElementById('modal-whatsapp-config');
    if (modal) modal.classList.add('active');
  };

  window.closeWhatsAppConfigModal = () => {
    const modal = document.getElementById('modal-whatsapp-config');
    if (modal) modal.classList.remove('active');
  };

  // Fechar modals ao clicar no backdrop (fora do conteúdo)
  const modalCampEl = document.getElementById('modal-criar-campanha');
  if (modalCampEl) {
    modalCampEl.addEventListener('click', (e) => {
      if (e.target === modalCampEl) window.closeCriarCampanhaModal();
    });
  }

  const modalWaEl = document.getElementById('modal-whatsapp-config');
  if (modalWaEl) {
    modalWaEl.addEventListener('click', (e) => {
      if (e.target === modalWaEl) window.closeWhatsAppConfigModal();
    });
  }

  const updateWizardStepView = () => {
    // Atualiza indicadores visuais à esquerda
    for (let i = 1; i <= 4; i++) {
      const ind = document.getElementById(`wz-step-indicator-${i}`);
      const content = document.getElementById(`wz-content-step-${i}`);

      if (ind) {
        ind.classList.remove('active', 'completed');
        if (i < wzCurrentStep) ind.classList.add('completed');
        else if (i === wzCurrentStep) ind.classList.add('active');
      }

      if (content) {
        content.classList.toggle('active', i === wzCurrentStep);
      }
    }

    const btnPrev = document.getElementById('wz-btn-prev');
    const btnNext = document.getElementById('wz-btn-next');
    const btnFinish = document.getElementById('wz-btn-finish');

    if (btnPrev) btnPrev.style.visibility = wzCurrentStep === 1 ? 'hidden' : 'visible';
    if (btnNext) btnNext.style.display = wzCurrentStep === 4 ? 'none' : 'inline-flex';
    if (btnFinish) btnFinish.style.display = wzCurrentStep === 4 ? 'inline-flex' : 'none';

    // Se passo 4, preenche revisão
    if (wzCurrentStep === 4) {
      const revNome = document.getElementById('wz-review-nome');
      const revSource = document.getElementById('wz-review-source');
      const revCount = document.getElementById('wz-review-count');

      const inputNome = document.getElementById('wz-input-nome');
      if (revNome) revNome.textContent = inputNome?.value.trim() || 'Nova Campanha';

      if (revSource) {
        revSource.textContent = wzSelectedSource === 'CSV' ? 'Planilha CSV' : 'Painel de Leads do CRM';
      }

      let count = 0;
      if (wzSelectedSource === 'CSV') {
        count = wzParsedLeads.length > 0 ? wzParsedLeads.length : 12; // Exemplo de amostra
      } else {
        count = getFilteredCrmLeads().length;
      }
      if (revCount) revCount.textContent = `${count} contatos`;
    }
  };

  window.wizardStepNext = () => {
    if (wzCurrentStep === 1) {
      const nomeInput = document.getElementById('wz-input-nome');
      if (!nomeInput || !nomeInput.value.trim()) {
        alert('Por favor, informe o nome da campanha.');
        if (nomeInput) nomeInput.focus();
        return;
      }
    }
    if (wzCurrentStep < 4) {
      wzCurrentStep++;
      updateWizardStepView();
    }
  };

  window.wizardStepPrev = () => {
    if (wzCurrentStep > 1) {
      wzCurrentStep--;
      updateWizardStepView();
    }
  };

  window.selectLeadSource = (src) => {
    wzSelectedSource = src;
    const cardCsv = document.getElementById('card-source-csv');
    const cardCrm = document.getElementById('card-source-crm');
    const paneCsv = document.getElementById('wz-pane-csv');
    const paneCrm = document.getElementById('wz-pane-crm');

    if (cardCsv) cardCsv.classList.toggle('selected', src === 'CSV');
    if (cardCrm) cardCrm.classList.toggle('selected', src === 'CRM');

    if (paneCsv) paneCsv.style.display = src === 'CSV' ? 'block' : 'none';
    if (paneCrm) paneCrm.style.display = src === 'CRM' ? 'block' : 'none';
  };

  window.handleWizardCsvUpload = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const leads = [];

      lines.slice(1).forEach((line, idx) => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols[0]) {
          leads.push({
            id: `p-csv-${Date.now()}-${idx}`,
            nome: cols[0] || `Lead ${idx + 1}`,
            whatsapp: cols[1] || '+55 (11) 9' + Math.floor(10000000 + Math.random() * 90000000),
            origem: 'Importado CSV',
            etapa: '1ª Mensagem',
            status: 'Pendente',
            data: 'Agora'
          });
        }
      });

      if (leads.length === 0) {
        // Fallback para arquivo vazio com leads modelo
        wzParsedLeads = [
          { id: `p-${Date.now()}-1`, nome: 'Marcos Vinicius Tavares', whatsapp: '+55 (11) 98877-6655', origem: 'Importado CSV', etapa: '1ª Mensagem', status: 'Pendente', data: 'Agora' },
          { id: `p-${Date.now()}-2`, nome: 'Ana Paula Guimarães', whatsapp: '+55 (21) 97766-5544', origem: 'Importado CSV', etapa: '1ª Mensagem', status: 'Pendente', data: 'Agora' }
        ];
      } else {
        wzParsedLeads = leads;
      }

      const statusEl = document.getElementById('wz-csv-status-text');
      if (statusEl) {
        statusEl.textContent = `✓ ${file.name} carregado com sucesso (${wzParsedLeads.length} leads identificados)`;
        statusEl.style.color = '#34d399';
      }
    };
    reader.readAsText(file);
  };

  const getFilteredCrmLeads = () => {
    const selectStatus = document.getElementById('wz-select-crm-status');
    const filter = selectStatus ? selectStatus.value : 'ALL';
    const leadsList = state.leads && state.leads.length > 0 ? state.leads : [
      { id: 'crm-l1', nome: 'Carlos Eduardo Nogueira', telefone: '+55 (11) 98765-4321', status: 'NOVO', valorBem: 150000 },
      { id: 'crm-l2', nome: 'Patricia Helena Castro', telefone: '+55 (21) 97654-3210', status: 'EM_ATENDIMENTO', valorBem: 280000 },
      { id: 'crm-l3', nome: 'Rodrigo Bastos', telefone: '+55 (31) 96543-2109', status: 'QUALIFICADO', valorBem: 450000 },
      { id: 'crm-l4', nome: 'Camila Fernandes', telefone: '+55 (41) 95432-1098', status: 'NOVO', valorBem: 80000 }
    ];

    if (filter === 'ALL') return leadsList;
    return leadsList.filter(l => l.status === filter);
  };

  window.updateWizardCrmCount = () => {
    const countEl = document.getElementById('wz-crm-leads-count');
    if (countEl) {
      const count = getFilteredCrmLeads().length;
      countEl.textContent = `${count}`;
    }
  };

  window.insertWzTag = (textareaId, tag) => {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = textarea.value;
    textarea.value = text.substring(0, start) + tag + text.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + tag.length;
  };

  window.concluirCriacaoCampanha = () => {
    const inputNome = document.getElementById('wz-input-nome');
    const selectCat = document.getElementById('wz-select-categoria');
    const nome = inputNome ? inputNome.value.trim() : 'Nova Campanha';
    const segmento = selectCat ? selectCat.value : 'IMOVEL';

    let prospects = [];
    if (wzSelectedSource === 'CSV') {
      prospects = wzParsedLeads.length > 0 ? wzParsedLeads : [
        { id: `p-${Date.now()}-1`, nome: 'Marcos Vinicius Tavares', whatsapp: '+55 (11) 98877-6655', origem: 'Importado CSV', etapa: '1ª Mensagem', status: 'Pendente', data: 'Agora' },
        { id: `p-${Date.now()}-2`, nome: 'Ana Paula Guimarães', whatsapp: '+55 (21) 97766-5544', origem: 'Importado CSV', etapa: '1ª Mensagem', status: 'Pendente', data: 'Agora' },
        { id: `p-${Date.now()}-3`, nome: 'Guilherme Siqueira', whatsapp: '+55 (31) 96655-4433', origem: 'Importado CSV', etapa: '1ª Mensagem', status: 'Pendente', data: 'Agora' }
      ];
    } else {
      const crmLeads = getFilteredCrmLeads();
      prospects = crmLeads.map((l, idx) => ({
        id: `p-crm-${l.id || idx}`,
        nome: l.nome || `Lead CRM ${idx + 1}`,
        whatsapp: l.telefone || l.whatsapp || '+55 (11) 98765-0000',
        origem: 'CRM C7 Contempla',
        etapa: '1ª Mensagem',
        status: 'Pendente',
        data: 'Agora'
      }));
    }

    const newCamp = {
      id: `camp-${Date.now()}`,
      nome: nome,
      segmento: segmento,
      status: 'ATIVA',
      disparos: prospects.length,
      entregues: 0,
      respostas: 0,
      conversoes: 0,
      prospects: prospects
    };

    campanhasData.unshift(newCamp);
    activeCampanhaId = newCamp.id;
    saveCampanhasData();

    closeCriarCampanhaModal();
    switchAppView('campanhas');
    alert(`Campanha "${nome}" criada com sucesso! Disparos iniciados com intervalo de segurança anti-ban.`);
  };

  // --- CAIXA DE ENTRADA (INBOX WHATSAPP - PÁGINAS 1 E 2 DO PDF) ---
  const defaultConversas = [
    {
      id: 'conv-1',
      nome: 'Eduardo Silveira Ramos',
      whatsapp: '+55 (11) 98123-4567',
      campanha: 'Campanha WhatsApp 01 - Consórcio Imóveis SP',
      avatar: 'ES',
      online: true,
      naoLida: true,
      mensagens: [
        { id: 'm1', texto: 'Olá Eduardo, tudo bem? Sou especialista da C7 Contempla. Vi seu interesse em uma cota de Imóvel no valor de R$ 300.000. Posso te apresentar opções sem juros?', remetente: 'agente', hora: '11:30' },
        { id: 'm2', texto: 'Olá! Sim, gostaria de saber qual o valor da parcela para 180 meses.', remetente: 'cliente', hora: '11:42' }
      ]
    },
    {
      id: 'conv-2',
      nome: 'Fabiana Cristina Araújo',
      whatsapp: '+55 (11) 97234-5678',
      campanha: 'Campanha WhatsApp 01 - Consórcio Imóveis SP',
      avatar: 'FA',
      online: true,
      naoLida: true,
      mensagens: [
        { id: 'm3', texto: 'Olá Fabiana, vi seu interesse em planejamento imobiliário sem juros. Tem preferência por imóvel pronto ou na planta?', remetente: 'agente', hora: '10:05' },
        { id: 'm4', texto: 'Bom dia! Gostaria de comprar um apartamento pronto em São Paulo. Vocês têm cotas contempladas?', remetente: 'cliente', hora: '10:15' }
      ]
    },
    {
      id: 'conv-3',
      nome: 'José Mauricio Franklin de Miranda',
      whatsapp: '+55 (31) 98567-8901',
      campanha: 'Campanha WhatsApp 01 - Consórcio Imóveis SP',
      avatar: 'JM',
      online: false,
      naoLida: true,
      mensagens: [
        { id: 'm5', texto: 'José, consegui simular duas administradoras com taxas administrativas promocionais. Deseja que envie a tabela comparativa?', remetente: 'agente', hora: '21/10 16:40' },
        { id: 'm6', texto: 'Pode me mandar em PDF por gentileza?', remetente: 'cliente', hora: '21/10 16:55' }
      ]
    },
    {
      id: 'conv-4',
      nome: 'Juliana Beatriz Costa',
      whatsapp: '+55 (11) 99887-1122',
      campanha: 'Campanha Cartas Contempladas - Investidores',
      avatar: 'JC',
      online: false,
      naoLida: false,
      mensagens: [
        { id: 'm7', texto: 'Olá Juliana, temos 3 cartas contempladas de imóvel com crédito de 400 mil e entrada facilitada.', remetente: 'agente', hora: 'Ontem 17:15' },
        { id: 'm8', texto: 'Perfeito, me passa a administradora e o prazo restante.', remetente: 'cliente', hora: 'Hoje 08:30' }
      ]
    }
  ];

  let conversasData = [];
  try {
    const saved = localStorage.getItem('consorcio_inbox');
    conversasData = saved ? JSON.parse(saved) : defaultConversas;
  } catch (e) {
    conversasData = defaultConversas;
  }

  let activeConversaId = null;
  let inboxCampaignFilter = 'ALL';
  let inboxStatusFilter = 'ALL';
  let inboxSearchTerm = '';

  const saveConversasData = () => {
    try {
      localStorage.setItem('consorcio_inbox', JSON.stringify(conversasData));
    } catch (e) {}
  };

  const updateUnreadBadge = () => {
    const unreadCount = conversasData.filter(c => c.naoLida).length;
    const badgeSidebar = document.getElementById('sidebar-inbox-unread');
    if (badgeSidebar) {
      badgeSidebar.textContent = unreadCount;
      badgeSidebar.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
  };

  const renderInbox = () => {
    updateUnreadBadge();

    // Popula filtro de campanhas
    const selectCamp = document.getElementById('inbox-select-campaign');
    if (selectCamp) {
      const campNames = Array.from(new Set(conversasData.map(c => c.campanha).filter(Boolean)));
      selectCamp.innerHTML = `
        <option value="ALL">Todas as campanhas</option>
        ${campNames.map(name => `<option value="${name}" ${inboxCampaignFilter === name ? 'selected' : ''}>${name}</option>`).join('')}
      `;
    }

    // Filtra lista de conversas
    let filtered = conversasData;
    if (inboxCampaignFilter !== 'ALL') {
      filtered = filtered.filter(c => c.campanha === inboxCampaignFilter);
    }

    if (inboxStatusFilter === 'UNREAD') {
      filtered = filtered.filter(c => c.naoLida);
    } else if (inboxStatusFilter === 'REPLIED') {
      filtered = filtered.filter(c => c.mensagens && c.mensagens.some(m => m.remetente === 'cliente'));
    }

    if (inboxSearchTerm.trim()) {
      const q = inboxSearchTerm.toLowerCase();
      filtered = filtered.filter(c => c.nome.toLowerCase().includes(q) || c.whatsapp.includes(q));
    }

    const totalEl = document.getElementById('inbox-total-conversations');
    if (totalEl) totalEl.textContent = `${filtered.length} conversas`;

    // Renderiza itens da lista à esquerda (Páginas 1 e 2 do PDF)
    const listEl = document.getElementById('inbox-conversations-list');
    if (listEl) {
      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div style="padding: 2.5rem 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.84rem;">
            Nenhuma conversa encontrada com os filtros atuais.
          </div>
        `;
      } else {
        listEl.innerHTML = filtered.map(c => {
          const lastMsg = c.mensagens && c.mensagens.length > 0 ? c.mensagens[c.mensagens.length - 1] : { texto: 'Sem mensagens', hora: '' };
          const isActive = c.id === activeConversaId;

          return `
            <div class="inbox-conv-item ${isActive ? 'active' : ''}" onclick="selectInboxConversation('${c.id}')">
              <div class="inbox-conv-avatar">
                ${c.avatar || 'CL'}
                ${c.online ? '<div class="inbox-online-indicator"></div>' : ''}
              </div>
              <div class="inbox-conv-content">
                <div class="inbox-conv-top">
                  <span class="inbox-conv-name">${c.nome}</span>
                  <span class="inbox-conv-time">${lastMsg.hora}</span>
                </div>
                <div class="inbox-conv-campaign-tag">${c.campanha || 'WhatsApp Flow'}</div>
                <div class="inbox-conv-snippet">
                  <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">
                    ${lastMsg.remetente === 'agente' ? '<span style="color:#38bdf8;">Você:</span> ' : ''}${lastMsg.texto}
                  </span>
                  ${c.naoLida ? '<div class="inbox-unread-dot"></div>' : ''}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Renderiza chat ativo à direita (Página 1 e 2 do PDF)
    renderActiveChat();
  };

  const renderActiveChat = () => {
    const emptyState = document.getElementById('inbox-empty-state');
    const header = document.getElementById('inbox-chat-header');
    const scrollPane = document.getElementById('inbox-chat-messages-scroll');
    const footer = document.getElementById('inbox-chat-footer');

    if (!activeConversaId) {
      if (emptyState) emptyState.style.display = 'flex';
      if (header) header.style.display = 'none';
      if (scrollPane) scrollPane.style.display = 'none';
      if (footer) footer.style.display = 'none';
      return;
    }

    const conv = conversasData.find(c => c.id === activeConversaId);
    if (!conv) return;

    if (emptyState) emptyState.style.display = 'none';
    if (header) header.style.display = 'flex';
    if (scrollPane) scrollPane.style.display = 'flex';
    if (footer) footer.style.display = 'flex';

    // Header do Chat
    const avatar = document.getElementById('inbox-active-avatar');
    const name = document.getElementById('inbox-active-name');
    const phone = document.getElementById('inbox-active-phone');
    const tag = document.getElementById('inbox-active-campaign-tag');

    if (avatar) avatar.textContent = conv.avatar || 'CL';
    if (name) name.textContent = conv.nome;
    if (phone) phone.textContent = conv.whatsapp;
    if (tag) tag.textContent = conv.campanha || 'Campanha WhatsApp';

    // Histórico de Mensagens Estilo WhatsApp
    if (scrollPane) {
      scrollPane.innerHTML = conv.mensagens.map(m => {
        const isIncoming = m.remetente === 'cliente';
        return `
          <div class="chat-bubble ${isIncoming ? 'incoming' : 'outgoing'}">
            <div>${m.texto}</div>
            <div class="chat-bubble-time">
              <span>${m.hora}</span>
              ${!isIncoming ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/><polyline points="20 12 12 20 9 17"/></svg>' : ''}
            </div>
          </div>
        `;
      }).join('');

      scrollPane.scrollTop = scrollPane.scrollHeight;
    }
  };

  window.selectInboxConversation = (convId) => {
    activeConversaId = convId;
    const conv = conversasData.find(c => c.id === convId);
    if (conv && conv.naoLida) {
      conv.naoLida = false;
      saveConversasData();
    }
    renderInbox();
  };

  window.openInboxForProspect = (whatsapp, nome, campanhaNome) => {
    let conv = conversasData.find(c => c.whatsapp === whatsapp);
    if (!conv) {
      const parts = nome.split(' ');
      const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]) : nome.substring(0, 2);
      conv = {
        id: `conv-${Date.now()}`,
        nome: nome,
        whatsapp: whatsapp,
        campanha: campanhaNome || 'Campanha WhatsApp',
        avatar: initials.toUpperCase(),
        online: true,
        naoLida: false,
        mensagens: [
          { id: `m-${Date.now()}`, texto: `Olá ${nome}, como posso te ajudar hoje na C7 Contempla?`, remetente: 'agente', hora: 'Agora' }
        ]
      };
      conversasData.unshift(conv);
      saveConversasData();
    }
    activeConversaId = conv.id;
    switchAppView('inbox');
  };

  const sendInboxMessage = () => {
    const input = document.getElementById('inbox-chat-input');
    if (!input || !input.value.trim() || !activeConversaId) return;

    const conv = conversasData.find(c => c.id === activeConversaId);
    if (!conv) return;

    const now = new Date();
    const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    conv.mensagens.push({
      id: `m-${Date.now()}`,
      texto: input.value.trim(),
      remetente: 'agente',
      hora: hora
    });

    input.value = '';
    saveConversasData();
    renderInbox();

    // Simulação interativa de resposta do lead após 2.5s (demonstração dinâmica)
    setTimeout(() => {
      const currentConv = conversasData.find(c => c.id === activeConversaId);
      if (currentConv) {
        currentConv.mensagens.push({
          id: `m-reply-${Date.now()}`,
          texto: 'Recebido! Poderia me enviar a proposta detalhada com a taxa de administração e o lance embutido?',
          remetente: 'cliente',
          hora: hora
        });
        saveConversasData();
        renderInbox();
      }
    }, 2500);
  };

  const btnInboxSend = document.getElementById('btn-inbox-send');
  if (btnInboxSend) {
    btnInboxSend.addEventListener('click', sendInboxMessage);
  }

  const inboxChatInput = document.getElementById('inbox-chat-input');
  if (inboxChatInput) {
    inboxChatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendInboxMessage();
      }
    });
  }

  // Quick Templates
  document.querySelectorAll('.template-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const tpl = pill.getAttribute('data-template') || '';
      const input = document.getElementById('inbox-chat-input');
      const conv = conversasData.find(c => c.id === activeConversaId);
      const leadName = conv ? conv.nome.split(' ')[0] : 'Cliente';

      if (input) {
        input.value = tpl.replace('{nome}', leadName);
        input.focus();
      }
    });
  });

  // Filtros da Caixa de Entrada
  const selectInboxCampaign = document.getElementById('inbox-select-campaign');
  if (selectInboxCampaign) {
    selectInboxCampaign.addEventListener('change', (e) => {
      inboxCampaignFilter = e.target.value;
      renderInbox();
    });
  }

  const searchInboxField = document.getElementById('inbox-search-field');
  if (searchInboxField) {
    searchInboxField.addEventListener('input', (e) => {
      inboxSearchTerm = e.target.value;
      renderInbox();
    });
  }

  document.querySelectorAll('.inbox-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.inbox-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      inboxStatusFilter = chip.getAttribute('data-inbox-filter');
      renderInbox();
    });
  });

  const btnInboxOpenCrm = document.getElementById('btn-inbox-open-crm');
  if (btnInboxOpenCrm) {
    btnInboxOpenCrm.addEventListener('click', () => {
      switchAppView('crm');
    });
  }

  // --- INICIALIZAÇÃO DE AUTENTICAÇÃO E PERMISSÕES ---
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Modo Demonstração / Local: Garante acesso completo como ADM
      currentUserRole = localStorage.getItem('consorcio_user_role') || 'ADM';
      const userRoleBadgeEl = document.getElementById('user-role-badge');
      if (userRoleBadgeEl) userRoleBadgeEl.textContent = currentUserRole;
      const userDisplayNameEl = document.getElementById('user-display-name');
      if (userDisplayNameEl) userDisplayNameEl.textContent = 'Rodrigo Porrino';
      const userEmailDisplayEl = document.getElementById('user-email-display');
      if (userEmailDisplayEl) userEmailDisplayEl.textContent = '(rodrigo@c7contempla.com.br)';

      updateSidebarUserInfo('Rodrigo Porrino', 'rodrigo@c7contempla.com.br', currentUserRole);
      updateSidebarNavPermissions();

      const btnLogout = document.getElementById('btn-logout');
      if (btnLogout) {
        btnLogout.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Entrar`;
        btnLogout.onclick = () => window.location.href = 'index.html';
      }

      updateCartasPermissions();
      loadCartasData();
      checkUrlNavigation();
      return;
    }

    const email = user.email || '';
    const displayName = user.displayName || (email ? email.split('@')[0] : 'Usuário');

    const userDisplayNameEl = document.getElementById('user-display-name');
    if (userDisplayNameEl) userDisplayNameEl.textContent = displayName;

    const userEmailDisplayEl = document.getElementById('user-email-display');
    if (userEmailDisplayEl) userEmailDisplayEl.textContent = email ? `(${email})` : '';

    // Obter o role do usuario no Firestore
    try {
      const qRef = query(collection(db, 'users'), where("email", "==", user.email));
      const querySnapshot = await getDocs(qRef);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        currentUserRole = userDoc.data().role || 'CLIENTE';
      } else {
        currentUserRole = 'CLIENTE';
        await setDoc(doc(db, 'users', user.uid), { role: 'CLIENTE', email: user.email });
      }
    } catch (e) {
      console.error("Erro ao pegar role", e);
      currentUserRole = 'CLIENTE'; // Fallback seguro para novos usuários
    }

    const userRoleBadgeEl = document.getElementById('user-role-badge');
    if (userRoleBadgeEl) userRoleBadgeEl.textContent = currentUserRole || 'CLIENTE';

    updateSidebarUserInfo(displayName, email, currentUserRole);
    updateSidebarNavPermissions();

    if (currentUserRole === 'ADM') {
      const toggleCrm = document.getElementById('toggle-crm');
      if (toggleCrm) toggleCrm.style.display = 'block';
      const btnAdmin = document.getElementById('btn-admin');
      if (btnAdmin) btnAdmin.style.display = 'inline-flex';
      if (elements.btnUploadLogo) elements.btnUploadLogo.style.display = 'inline-flex';
      updateLogoButtonsState();
    } else if (currentUserRole === 'OPERADOR') {
      const toggleCrm = document.getElementById('toggle-crm');
      if (toggleCrm) toggleCrm.style.display = 'block';
      const btnAdmin = document.getElementById('btn-admin');
      if (btnAdmin) btnAdmin.style.display = 'none';
      if (elements.btnUploadLogo) elements.btnUploadLogo.style.display = 'none';
      if (elements.btnRemoveLogo) elements.btnRemoveLogo.style.display = 'none';
    } else {
      const toggleCrm = document.getElementById('toggle-crm');
      if (toggleCrm) toggleCrm.style.display = 'none';
      const btnAdmin = document.getElementById('btn-admin');
      if (btnAdmin) btnAdmin.style.display = 'none';
      if (elements.btnUploadLogo) elements.btnUploadLogo.style.display = 'none';
      if (elements.btnRemoveLogo) elements.btnRemoveLogo.style.display = 'none';
    }

    updateCartasPermissions();
    loadCartasData();
    checkUrlNavigation();

    // Carrega os leads
    loadLeads();
  });

  // --- LÓGICA DE BRANDING / UPLOAD, SUBSTITUIÇÃO E REMOÇÃO DE LOGO (ADM) ---
  const updateLogoButtonsState = () => {
    const role = localStorage.getItem('consorcio_user_role') || currentUserRole;
    const isAdm = role === 'ADM';
    const activeLogo = localStorage.getItem('consorcio_custom_logo');
    const wasRemoved = localStorage.getItem('consorcio_logo_removed') === 'true';

    if (!isAdm) {
      if (elements.btnUploadLogo) elements.btnUploadLogo.style.display = 'none';
      if (elements.btnRemoveLogo) elements.btnRemoveLogo.style.display = 'none';
      return;
    }

    if (elements.btnUploadLogo) elements.btnUploadLogo.style.display = 'inline-flex';

    // Determina se há um logo ativo exibido
    const customImg = document.getElementById('custom-logo-img');
    const hasActiveLogo = !!activeLogo || (!wasRemoved && customImg && customImg.getAttribute('src'));

    if (hasActiveLogo) {
      if (elements.btnUploadLogoText) elements.btnUploadLogoText.textContent = 'Substituir logo';
      if (elements.btnRemoveLogo) elements.btnRemoveLogo.style.display = 'inline-flex';
    } else {
      if (elements.btnUploadLogoText) elements.btnUploadLogoText.textContent = 'Upload do logo';
      if (elements.btnRemoveLogo) elements.btnRemoveLogo.style.display = 'none';
    }
  };

  const applyCustomLogo = (logoUrl) => {
    const customImg = document.getElementById('custom-logo-img');
    const defaultIcon = document.getElementById('default-logo-icon');
    const logoText = document.getElementById('logo-text');

    const sidebarImg = document.getElementById('sidebar-custom-logo-img');
    const sidebarIcon = document.getElementById('sidebar-default-icon');
    const sidebarText = document.getElementById('sidebar-brand-text');

    if (logoUrl) {
      if (customImg) {
        customImg.src = logoUrl;
        customImg.style.display = 'block';
      }
      if (defaultIcon) defaultIcon.style.display = 'none';
      if (logoText) logoText.style.display = 'none';

      if (sidebarImg) {
        sidebarImg.src = logoUrl;
        sidebarImg.style.display = 'block';
      }
      if (sidebarIcon) sidebarIcon.style.display = 'none';
      if (sidebarText) sidebarText.style.display = 'none';
    } else {
      if (customImg) {
        customImg.style.display = 'none';
        customImg.removeAttribute('src');
      }
      if (defaultIcon) defaultIcon.style.display = 'flex';
      if (logoText) {
        logoText.style.display = 'inline-block';
        logoText.textContent = 'C7 Contempla';
      }

      if (sidebarImg) {
        sidebarImg.style.display = 'none';
        sidebarImg.removeAttribute('src');
      }
      if (sidebarIcon) sidebarIcon.style.display = 'flex';
      if (sidebarText) sidebarText.style.display = 'flex';
    }
    updateLogoButtonsState();
  };

  // Carregar imediatamente do cache local ou logo C7 Contempla padrão (se não tiver sido removido)
  const wasRemoved = localStorage.getItem('consorcio_logo_removed') === 'true';
  const cachedLogo = localStorage.getItem('consorcio_custom_logo');
  if (cachedLogo) {
    applyCustomLogo(cachedLogo);
  } else if (!wasRemoved) {
    applyCustomLogo('images/c7_contempla_logo.png');
  } else {
    applyCustomLogo(null);
  }

  // Carregar do Firestore para sincronização
  const loadCustomLogo = async () => {
    try {
      const brandingDoc = await getDoc(doc(db, 'settings', 'branding'));
      if (brandingDoc.exists()) {
        const data = brandingDoc.data();
        if (data.logoUrl) {
          localStorage.removeItem('consorcio_logo_removed');
          localStorage.setItem('consorcio_custom_logo', data.logoUrl);
          applyCustomLogo(data.logoUrl);
        } else if (data.logoUrl === null) {
          localStorage.setItem('consorcio_logo_removed', 'true');
          localStorage.removeItem('consorcio_custom_logo');
          applyCustomLogo(null);
        }
      }
    } catch (err) {
      console.warn('Carregamento do logo via Firestore:', err);
    }
  };
  loadCustomLogo();

  // Configuração do input de upload / substituição do logo
  if (elements.inputUploadLogo) {
    elements.inputUploadLogo.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showAlert('Por favor, selecione uma imagem válida (PNG, JPG, SVG, WebP).', 'Formato Inválido');
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        const rawData = uploadEvt.target.result;
        const img = new Image();
        img.onload = async () => {
          // Otimizar dimensões para logo preservando proporção e alta nitidez (Retina/2x)
          const maxW = 600;
          const maxH = 200;
          let w = img.width;
          let h = img.height;
          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const optimizedDataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92);

          // Salva local e aplica imediatamente no cabeçalho
          localStorage.removeItem('consorcio_logo_removed');
          localStorage.setItem('consorcio_custom_logo', optimizedDataUrl);
          applyCustomLogo(optimizedDataUrl);

          // Persiste no Firestore
          try {
            await setDoc(doc(db, 'settings', 'branding'), {
              logoUrl: optimizedDataUrl,
              updatedAt: new Date().toISOString(),
              uploadedBy: auth.currentUser ? auth.currentUser.email : 'ADM'
            }, { merge: true });
            showAlert('Logo da empresa salvo com sucesso!', 'Logo Atualizado');
          } catch (cloudErr) {
            console.error('Erro ao sincronizar logo no Firestore:', cloudErr);
            showAlert('Logo importado e salvo com sucesso!', 'Logo Atualizado');
          }
        };
        img.src = rawData;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });
  }

  // Ação de Remoção do Logo (ADM)
  window.triggerRemoveLogo = () => {
    showConfirm(
      'Deseja remover o logotipo personalizado e restaurar a identidade padrão C7 Contempla?',
      'Restaurar Identidade Padrão',
      async () => {
        try {
          localStorage.setItem('consorcio_logo_removed', 'true');
          localStorage.removeItem('consorcio_custom_logo');
          applyCustomLogo(null);

          try {
            await setDoc(doc(db, 'settings', 'branding'), {
              logoUrl: null,
              updatedAt: new Date().toISOString(),
              removedBy: auth.currentUser ? auth.currentUser.email : 'ADM'
            }, { merge: true });
          } catch (cloudErr) {
            console.warn('Erro ao sincronizar remoção no Firestore:', cloudErr);
          }

          showAlert('Logotipo removido com sucesso! A identidade padrão C7 Contempla foi restaurada.', 'Padrão Restaurado');
        } catch (err) {
          console.error('Erro ao remover logo:', err);
          showAlert('Erro ao remover logo.', 'Erro');
        }
      },
      'Restaurar C7 Contempla',
      false
    );
  };


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
          <td style="padding: 0.5rem;"><span style="font-size:0.75rem; padding:0.15rem 0.45rem; border-radius:4px; background:rgba(255,255,255,0.06); font-weight:600; color:var(--text-main);">${data.role || 'CLIENTE'}</span></td>
          <td style="padding: 0.5rem; text-align: right; white-space: nowrap;">
            <button type="button" class="btn btn-secondary btn-sm edit-user-btn" data-email="${data.email}" data-role="${data.role || 'CLIENTE'}" style="padding:0.25rem 0.55rem; font-size:0.75rem; border-color:var(--primary); color:var(--primary); margin-right:0.35rem; cursor:pointer;" title="Clique para editar e alterar este usuário">Editar</button>
            <button type="button" class="btn btn-secondary btn-sm delete-user-btn" data-id="${docSnap.id}" style="padding:0.25rem 0.55rem; font-size:0.75rem; border-color:#ef4444; color:#ef4444; cursor:pointer;" title="Excluir acesso">Excluir</button>
          </td>
        `;
        elements.usersTableBody.appendChild(tr);
      });

      // Vincular clique no botão Editar
      document.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const email = btn.getAttribute('data-email');
          const role = btn.getAttribute('data-role');
          const emailInput = document.getElementById('new-user-email');
          const roleSelect = document.getElementById('new-user-role');
          
          if (emailInput) {
            emailInput.value = email;
            emailInput.style.borderColor = 'var(--primary)';
            emailInput.focus();
          }
          if (roleSelect && role) {
            roleSelect.value = role;
            roleSelect.style.borderColor = 'var(--primary)';
          }

          const submitBtn = elements.formAddUser ? elements.formAddUser.querySelector('button[type="submit"]') : null;
          if (submitBtn) {
            submitBtn.textContent = 'Salvar Alteração';
            submitBtn.style.background = 'var(--primary-gradient)';
          }
        });
      });

      // Bind delete buttons
      document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          showConfirm('Tem certeza que deseja remover o acesso deste usuário?', 'Remover Acesso', async () => {
            try {
              await deleteDoc(doc(db, 'users', id));
              loadUsers();
            } catch (err) { console.error(err); }
          }, 'Excluir', true);
        });
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Funções globais acessíveis via onclick e listeners
  window.APP_VERSION = '1.0.6';
  window.loadUsersData = loadUsers;
  window.openAdminUsersModal = () => {
    const modal = document.getElementById('admin-users-modal');
    if (modal) {
      modal.classList.add('active');
      loadUsers();
    }
  };

  window.handleLogoButtonClick = (e) => {
    const input = document.getElementById('input-upload-logo');
    const btn = document.getElementById('btn-upload-logo');
    if (input && (!btn || btn.tagName !== 'LABEL')) {
      input.click();
    }
  };

  window.handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Erro ao deslogar:', err);
    }
    localStorage.removeItem('consorcio_user_role');
    window.location.href = 'index.html';
  };

  // Vincular eventos nos botões do topo
  const btnAdminEl = document.getElementById('btn-admin');
  if (btnAdminEl) {
    btnAdminEl.onclick = (e) => {
      e.preventDefault();
      window.openAdminUsersModal();
    };
  }

  const btnUploadLogoEl = document.getElementById('btn-upload-logo');
  if (btnUploadLogoEl) {
    btnUploadLogoEl.addEventListener('click', (e) => {
      // Se for elemento que não seja LABEL nativo, dispara clique
      if (btnUploadLogoEl.tagName !== 'LABEL') {
        const input = document.getElementById('input-upload-logo');
        if (input) input.click();
      }
    });
  }

  const btnRemoveLogoEl = document.getElementById('btn-remove-logo');
  if (btnRemoveLogoEl) {
    btnRemoveLogoEl.onclick = (e) => {
      e.preventDefault();
      if (typeof window.triggerRemoveLogo === 'function') {
        window.triggerRemoveLogo();
      }
    };
  }

  const btnLogoutEl = document.getElementById('btn-logout');
  if (btnLogoutEl) {
    btnLogoutEl.onclick = (e) => {
      e.preventDefault();
      window.handleLogout();
    };
  }

  if (elements.closeAdminModalBtn) {
    elements.closeAdminModalBtn.addEventListener('click', () => {
      elements.adminUsersModal.classList.remove('active');
    });
  }

  if (elements.formAddUser) {
    elements.formAddUser.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('new-user-email');
      const roleSelect = document.getElementById('new-user-role');
      const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
      const role = roleSelect ? roleSelect.value : 'CLIENTE';
      const submitBtn = elements.formAddUser.querySelector('button[type="submit"]');

      if (!email) return;

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Salvando...';
        }

        const qRef = query(collection(db, 'users'), where("email", "==", email));
        const snap = await getDocs(qRef);

        if (!snap.empty) {
          await setDoc(doc(db, 'users', snap.docs[0].id), { email, role }, { merge: true });
        } else {
          await addDoc(collection(db, 'users'), { email, role });
        }

        if (emailInput) {
          emailInput.value = '';
          emailInput.style.borderColor = '';
        }
        if (roleSelect) {
          roleSelect.style.borderColor = '';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Salvar';
          submitBtn.style.background = '';
        }

        showAlert(`Perfil do usuário "${email}" salvo com sucesso como ${role}!`, 'Acesso Atualizado');
        loadUsers();
      } catch (err) {
        console.error("Erro ao salvar perfil do usuário:", err);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Salvar';
          submitBtn.style.background = '';
        }
        showAlert('Erro ao salvar permissão do usuário.', 'Erro');
      }
    });
  }

  // =========================================================================
  // MÓDULO DE CARTAS CONTEMPLADAS (IMPORTAÇÃO, FILTROS, WHATSAPP E GESTÃO)
  // =========================================================================

  const parseMoeda = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const clean = String(val).replace(/R\$/g, '').replace(/\./g, '').replace(/,/g, '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const formatMoeda = (val) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const parseHtmlTableXls = (htmlString) => {
    const trMatches = htmlString.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    if (trMatches.length === 0) return [];

    const items = [];
    for (let i = 1; i < trMatches.length; i++) {
      const tdMatches = trMatches[i].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      const cells = tdMatches.map(td => td.replace(/<[^>]+>/g, '').trim());
      if (cells.length >= 7 && cells[0]) {
        items.push({
          cod_cota: cells[0] || '',
          categoria: cells[1] || 'Imóvel',
          credito: cells[2] || '',
          entrada: cells[3] || '',
          num_parcelas: cells[4] || '',
          vlr_parcela: cells[5] || '',
          saldo_devedor: cells[6] || '',
          fundo_comum: cells[7] || '',
          ref_garantia: cells[8] || '',
          administradora: cells[9] || 'Consórcio',
          grupo: cells[10] || '',
          status: cells[11] || 'Disponível',
          updated_at: new Date().toISOString()
        });
      }
    }
    return items;
  };

  const parseCsvText = (csvString) => {
    const lines = csvString.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) return [];

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const items = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(col => col.replace(/^"|"$/g, '').trim());
      if (cols.length >= 6 && cols[0]) {
        items.push({
          cod_cota: cols[0],
          categoria: cols[1] || 'Imóvel',
          credito: cols[2] || '',
          entrada: cols[3] || '',
          num_parcelas: cols[4] || '',
          vlr_parcela: cols[5] || '',
          saldo_devedor: cols[6] || '',
          administradora: cols[7] || 'Consórcio',
          status: cols[8] || 'Disponível',
          grupo: cols[9] || '',
          updated_at: new Date().toISOString()
        });
      }
    }
    return items;
  };

  const loadCartasData = async () => {
    try {
      const stored = localStorage.getItem('consorcio_cartas_contempladas');
      if (stored) {
        state.cartas = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Erro ao ler localStorage de cartas:", e);
    }

    if (!state.cartas || state.cartas.length === 0) {
      await loadDefaultCartasFromFile(false);
    } else {
      populateAdministradorasFilter();
      applyCartasFiltersAndRender();
    }
  };

  const loadDefaultCartasFromFile = async (showNotification = false) => {
    try {
      let loadedItems = [];
      try {
        const respJson = await fetch('artefatos/cartas_default.json');
        if (respJson.ok) {
          loadedItems = await respJson.json();
        }
      } catch (e) {}

      if (!loadedItems || loadedItems.length === 0) {
        const respXls = await fetch('artefatos/CartasContempladas.xls');
        if (respXls.ok) {
          const text = await respXls.text();
          loadedItems = parseHtmlTableXls(text);
        }
      }

      if (loadedItems && loadedItems.length > 0) {
        state.cartas = loadedItems;
        saveCartasData();
        populateAdministradorasFilter();
        applyCartasFiltersAndRender();

        if (showNotification) {
          showAlert(`Planilha modelo carregada com sucesso! ${state.cartas.length.toLocaleString('pt-BR')} cartas contempladas prontas para consulta.`, 'Modelo Importado');
        }
      }
    } catch (err) {
      console.error("Erro ao carregar modelo:", err);
      if (showNotification) {
        showAlert('Erro ao ler arquivo modelo da pasta artefatos.', 'Erro');
      }
    }
  };

  const saveCartasData = () => {
    try {
      localStorage.setItem('consorcio_cartas_contempladas', JSON.stringify(state.cartas));
    } catch (e) {
      console.warn("Erro ao persistir cartas localmente:", e);
    }
    updateCartasKPIs();
  };

  const populateAdministradorasFilter = () => {
    if (!elements.filterAdministradora) return;
    const currentVal = elements.filterAdministradora.value;
    const uniqueAdms = Array.from(new Set(state.cartas.map(c => (c.administradora || '').trim()).filter(Boolean))).sort();

    let html = '<option value="">Todas as Administradoras</option>';
    uniqueAdms.forEach(adm => {
      html += `<option value="${adm}">${adm}</option>`;
    });
    elements.filterAdministradora.innerHTML = html;
    if (uniqueAdms.includes(currentVal)) {
      elements.filterAdministradora.value = currentVal;
    }
  };

  const updateCartasKPIs = () => {
    const total = state.cartas.length;
    const disp = state.cartas.filter(c => (c.status || '').toLowerCase() === 'disponível').length;
    const res = state.cartas.filter(c => (c.status || '').toLowerCase() === 'reservada').length;
    const totalVol = state.cartas
      .filter(c => (c.status || '').toLowerCase() === 'disponível')
      .reduce((sum, c) => sum + parseMoeda(c.credito), 0);

    if (elements.kpiTotalCartas) elements.kpiTotalCartas.textContent = total.toLocaleString('pt-BR');
    if (elements.kpiDispCartas) elements.kpiDispCartas.textContent = disp.toLocaleString('pt-BR');
    if (elements.kpiResCartas) elements.kpiResCartas.textContent = res.toLocaleString('pt-BR');
    if (elements.kpiVolCredito) elements.kpiVolCredito.textContent = formatMoeda(totalVol);
  };

  const applyCartasFiltersAndRender = () => {
    const codQuery = (elements.filterCodCota ? elements.filterCodCota.value : '').trim().toLowerCase();
    const catQuery = elements.filterCategoria ? elements.filterCategoria.value : '';
    const admQuery = elements.filterAdministradora ? elements.filterAdministradora.value : '';
    const statusQuery = elements.filterStatus ? elements.filterStatus.value : '';
    const orderQuery = elements.filterOrder ? elements.filterOrder.value : 'cod_desc';

    state.cartasFiltered = state.cartas.filter(c => {
      if (codQuery && !(c.cod_cota || '').toLowerCase().includes(codQuery)) {
        return false;
      }
      if (catQuery && (c.categoria || '').toLowerCase() !== catQuery.toLowerCase()) {
        return false;
      }
      if (admQuery && (c.administradora || '').trim().toLowerCase() !== admQuery.trim().toLowerCase()) {
        return false;
      }
      if (statusQuery && (c.status || '').trim().toLowerCase() !== statusQuery.trim().toLowerCase()) {
        return false;
      }
      return true;
    });

    state.cartasFiltered.sort((a, b) => {
      const codA = parseInt(a.cod_cota) || 0;
      const codB = parseInt(b.cod_cota) || 0;
      const credA = parseMoeda(a.credito);
      const credB = parseMoeda(b.credito);
      const entA = parseMoeda(a.entrada);
      const entB = parseMoeda(b.entrada);
      const parcA = parseMoeda(a.vlr_parcela);
      const parcB = parseMoeda(b.vlr_parcela);

      switch (orderQuery) {
        case 'cod_asc': return codA - codB;
        case 'cod_desc': return codB - codA;
        case 'credito_desc': return credB - credA;
        case 'credito_asc': return credA - credB;
        case 'entrada_asc': return entA - entB;
        case 'entrada_desc': return entB - entA;
        case 'parcela_asc': return parcA - parcB;
        default: return codB - codA;
      }
    });

    updateCartasKPIs();

    const totalItems = state.cartasFiltered.length;
    const pageSize = state.cartasPageSize || 25;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    if (state.cartasPage > totalPages) state.cartasPage = totalPages;
    if (state.cartasPage < 1) state.cartasPage = 1;

    const startIdx = (state.cartasPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalItems);
    const pageItems = state.cartasFiltered.slice(startIdx, endIdx);

    renderCartasTable(pageItems);

    if (elements.cartasPaginationInfo) {
      if (totalItems === 0) {
        elements.cartasPaginationInfo.textContent = 'Nenhuma carta contemplada encontrada com os filtros selecionados';
      } else {
        elements.cartasPaginationInfo.textContent = `Exibindo ${startIdx + 1} a ${endIdx} de ${totalItems.toLocaleString('pt-BR')} cartas contempladas`;
      }
    }

    renderCartasPagination(totalPages);
    updateBatchToolbar();
  };

  const renderCartasTable = (items) => {
    if (!elements.cartasTbody) return;

    const isAdm = currentUserRole === 'ADM';
    const isOperador = currentUserRole === 'OPERADOR';
    const canManage = isAdm || isOperador;

    if (!items || items.length === 0) {
      elements.cartasTbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 0.75rem; opacity: 0.5;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <div style="font-size: 1.05rem; font-weight: 600; color: #f1f5f9;">Nenhuma carta encontrada</div>
            <div style="font-size: 0.85rem; margin-top: 0.25rem;">Tente ajustar os filtros de pesquisa ou pesquisar por outro código de cota.</div>
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    items.forEach(c => {
      const isSelected = state.cartasSelected.has(c.cod_cota);
      const isImovel = (c.categoria || '').toLowerCase().includes('imóvel') || (c.categoria || '').toLowerCase().includes('imovel');
      const catClass = isImovel ? 'badge-cat-imovel' : 'badge-cat-veiculo';
      const catIcon = isImovel 
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
        : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>';

      const statusLower = (c.status || '').toLowerCase();
      let statusClass = 'badge-status-disponivel';
      if (statusLower.includes('reservad')) statusClass = 'badge-status-reservada';
      else if (statusLower.includes('vendid')) statusClass = 'badge-status-vendida';

      html += `
        <tr class="${isSelected ? 'selected' : ''}" data-cod="${c.cod_cota}">
          ${canManage ? `
            <td style="text-align: center;">
              <input type="checkbox" class="check-carta-item" data-cod="${c.cod_cota}" ${isSelected ? 'checked' : ''}>
            </td>
          ` : '<td style="display:none;"></td>'}
          <td><strong style="color: #38bdf8; font-size: 0.95rem;">#${c.cod_cota}</strong></td>
          <td>
            <span class="badge-cat ${catClass}">
              ${catIcon}
              ${c.categoria || 'Consórcio'}
            </span>
          </td>
          <td><strong style="color: #ffffff;">${c.administradora || '-'}</strong>${c.grupo ? ` <span style="font-size:0.75rem; color:var(--text-muted);">(Gr. ${c.grupo})</span>` : ''}</td>
          <td><strong style="color: #34d399; font-size: 0.95rem;">${c.credito || '-'}</strong></td>
          <td><strong style="color: #fbbf24;">${c.entrada || '-'}</strong></td>
          <td>
            <div style="font-weight: 600; color: #f1f5f9;">${c.num_parcelas ? `${c.num_parcelas}x` : ''} ${c.vlr_parcela ? `de ${c.vlr_parcela}` : ''}</div>
          </td>
          <td style="color: var(--text-muted); font-size: 0.85rem;">${c.saldo_devedor || '-'}</td>
          <td>
            <span class="badge-status ${statusClass}">
              ${c.status || 'Disponível'}
            </span>
          </td>
          <td style="text-align: right;">
            <div class="cell-actions" style="justify-content: flex-end;">
              <button type="button" class="btn-action-wpp" data-action="wpp" data-cod="${c.cod_cota}" title="Negociar esta cota no WhatsApp">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                Negociar
              </button>
              ${canManage ? `
                <button type="button" class="btn-action-icon" data-action="edit" data-cod="${c.cod_cota}" title="Editar Cota">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              ` : ''}
              ${isAdm ? `
                <button type="button" class="btn-action-icon btn-delete" data-action="delete" data-cod="${c.cod_cota}" title="Excluir Cota">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    });

    elements.cartasTbody.innerHTML = html;
  };

  const renderCartasPagination = (totalPages) => {
    if (!elements.cartasPaginationControls) return;

    if (totalPages <= 1) {
      elements.cartasPaginationControls.innerHTML = '';
      return;
    }

    const current = state.cartasPage;
    let html = '';

    html += `<button type="button" class="btn-page" ${current === 1 ? 'disabled' : ''} data-page="${current - 1}">&laquo;</button>`;

    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(totalPages, current + 2);

    if (startPage > 1) {
      html += `<button type="button" class="btn-page" data-page="1">1</button>`;
      if (startPage > 2) html += `<span style="color:var(--text-muted); padding:0 0.25rem;">...</span>`;
    }

    for (let p = startPage; p <= endPage; p++) {
      html += `<button type="button" class="btn-page ${p === current ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<span style="color:var(--text-muted); padding:0 0.25rem;">...</span>`;
      html += `<button type="button" class="btn-page" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<button type="button" class="btn-page" ${current === totalPages ? 'disabled' : ''} data-page="${current + 1}">&raquo;</button>`;

    elements.cartasPaginationControls.innerHTML = html;
  };

  const openWhatsAppNegotiation = (codCota) => {
    const carta = state.cartas.find(c => String(c.cod_cota) === String(codCota));
    if (!carta) return;

    const phone = '5521998228936';
    const text = `Olá! Tenho interesse na Carta Contemplada Cód. ${carta.cod_cota} (${carta.categoria} - ${carta.administradora}).\n` +
                 `• Crédito: ${carta.credito}\n` +
                 `• Entrada: ${carta.entrada}\n` +
                 `• Parcelas: ${carta.num_parcelas}x de ${carta.vlr_parcela}\n` +
                 `• Saldo Devedor: ${carta.saldo_devedor || 'A consultar'}\n\n` +
                 `Gostaria de verificar a disponibilidade e condições para transferência desta cota.`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const updateBatchToolbar = () => {
    if (!elements.cartasBatchToolbar) return;
    const isAdm = currentUserRole === 'ADM';
    const isOperador = currentUserRole === 'OPERADOR';
    const canManage = isAdm || isOperador;

    const count = state.cartasSelected.size;
    if (canManage && count > 0) {
      elements.cartasBatchToolbar.classList.add('active');
      if (elements.batchSelectedCount) elements.batchSelectedCount.textContent = count;
      if (elements.batchModalCount) elements.batchModalCount.textContent = count;
    } else {
      elements.cartasBatchToolbar.classList.remove('active');
    }

    if (elements.checkSelectAll) {
      const pageCheckboxes = document.querySelectorAll('.check-carta-item');
      if (pageCheckboxes.length > 0) {
        const allChecked = Array.from(pageCheckboxes).every(cb => cb.checked);
        elements.checkSelectAll.checked = allChecked;
      } else {
        elements.checkSelectAll.checked = false;
      }
    }
  };

  const parseUploadedCartasFile = async (file) => {
    try {
      let items = [];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.csv')) {
        const text = await file.text();
        items = parseCsvText(text);
      } else {
        const text = await file.text();
        if (text.includes('<table') || text.includes('<tr')) {
          items = parseHtmlTableXls(text);
        } else if (window.XLSX) {
          const buffer = await file.arrayBuffer();
          const wb = window.XLSX.read(buffer, { type: 'array' });
          const firstSheetName = wb.SheetNames[0];
          const ws = wb.Sheets[firstSheetName];
          const jsonRows = window.XLSX.utils.sheet_to_json(ws, { defval: '' });

          items = jsonRows.map(row => {
            const cod = row['Cód. Cota'] || row['Cod. Cota'] || row['Cota'] || row['Cód.'] || row['COD'] || row['Codigo'] || '';
            const cat = row['Categoria'] || row['Tipo'] || 'Imóvel';
            const cred = row['Crédito'] || row['Credito'] || row['Valor'] || '';
            const ent = row['Entrada'] || row['Valor Entrada'] || '';
            const parc = row['Nº Parcelas'] || row['Parcelas'] || row['Prazo'] || '';
            const vlrParc = row['Vlr Parcela'] || row['Valor Parcela'] || row['Parcela'] || '';
            const saldo = row['Saldo devedor'] || row['Saldo Devedor'] || '';
            const adm = row['Administradora'] || row['Admin'] || row['Consórcio'] || 'Consórcio';
            const status = row['Status'] || row['Situação'] || 'Disponível';
            const grupo = row['Grupo'] || '';

            return {
              cod_cota: String(cod).trim(),
              categoria: String(cat).trim(),
              credito: String(cred).trim(),
              entrada: String(ent).trim(),
              num_parcelas: String(parc).trim(),
              vlr_parcela: String(vlrParc).trim(),
              saldo_devedor: String(saldo).trim(),
              fundo_comum: '',
              ref_garantia: '',
              administradora: String(adm).trim(),
              grupo: String(grupo).trim(),
              status: String(status).trim() || 'Disponível',
              updated_at: new Date().toISOString()
            };
          }).filter(c => c.cod_cota.length > 0);
        }
      }

      if (items.length === 0) {
        showAlert('Nenhuma linha de cota válida encontrada no arquivo fornecido. Verifique as colunas do arquivo.', 'Formato Inválido');
        return;
      }

      state.pendingImportData = items;
      renderImportPreview(items);
      if (elements.btnSubmitImport) elements.btnSubmitImport.disabled = false;
      if (elements.dropzoneFilename) elements.dropzoneFilename.textContent = `Arquivo carregado: ${file.name} (${items.length} cotas detectadas)`;

    } catch (err) {
      console.error("Erro ao analisar arquivo de cartas:", err);
      showAlert('Erro ao processar o arquivo selecionado. Verifique o formato e tente novamente.', 'Erro no Processamento');
    }
  };

  const renderImportPreview = (items) => {
    if (!elements.importPreviewContainer || !elements.importPreviewTbody) return;
    elements.importPreviewContainer.style.display = 'block';
    if (elements.previewCountLabel) {
      elements.previewCountLabel.textContent = `Prévia: ${items.length.toLocaleString('pt-BR')} registros detectados`;
    }

    const previewItems = items.slice(0, 5);
    elements.importPreviewTbody.innerHTML = previewItems.map(c => `
      <tr>
        <td><strong>#${c.cod_cota}</strong></td>
        <td>${c.categoria}</td>
        <td>${c.administradora}</td>
        <td>${c.credito}</td>
        <td>${c.entrada}</td>
        <td>${c.num_parcelas}x ${c.vlr_parcela}</td>
        <td>${c.status}</td>
      </tr>
    `).join('');
  };

  const executeImportCartas = () => {
    if (!state.pendingImportData || state.pendingImportData.length === 0) return;

    const policyRadio = document.querySelector('input[name="duplicate_policy"]:checked');
    const policy = policyRadio ? policyRadio.value : 'upsert';

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    if (policy === 'replace') {
      state.cartas = [...state.pendingImportData];
      insertedCount = state.pendingImportData.length;
    } else {
      const existingMap = new Map();
      state.cartas.forEach((c, idx) => {
        existingMap.set(String(c.cod_cota).trim(), idx);
      });

      state.pendingImportData.forEach(newItem => {
        const cod = String(newItem.cod_cota).trim();
        if (existingMap.has(cod)) {
          if (policy === 'upsert') {
            const idx = existingMap.get(cod);
            state.cartas[idx] = { ...state.cartas[idx], ...newItem };
            updatedCount++;
          } else if (policy === 'skip') {
            skippedCount++;
          }
        } else {
          state.cartas.unshift(newItem);
          existingMap.set(cod, 0);
          insertedCount++;
        }
      });
    }

    saveCartasData();
    populateAdministradorasFilter();
    applyCartasFiltersAndRender();

    if (elements.modalImportCartas) elements.modalImportCartas.classList.remove('active');
    state.pendingImportData = [];
    if (elements.btnSubmitImport) elements.btnSubmitImport.disabled = true;
    if (elements.importPreviewContainer) elements.importPreviewContainer.style.display = 'none';

    showAlert(
      `<strong>Importação Concluída com Sucesso!</strong><br><br>` +
      `• Total processado: <strong>${(insertedCount + updatedCount + skippedCount).toLocaleString('pt-BR')}</strong><br>` +
      `• Novas cotas adicionadas: <strong style="color:#34d399;">${insertedCount.toLocaleString('pt-BR')}</strong><br>` +
      `• Cotas existentes atualizadas: <strong style="color:#38bdf8;">${updatedCount.toLocaleString('pt-BR')}</strong><br>` +
      `• Duplicados mantidos/ignorados: <strong style="color:#fbbf24;">${skippedCount.toLocaleString('pt-BR')}</strong>`,
      'Importação Concluída'
    );
  };

  const openEditCartaModal = (codCota = null) => {
    if (!elements.modalEditCarta) return;

    if (codCota) {
      const carta = state.cartas.find(c => String(c.cod_cota) === String(codCota));
      if (!carta) return;

      if (elements.modalEditCartaTitle) elements.modalEditCartaTitle.textContent = `Editar Carta Cód. #${carta.cod_cota}`;
      if (elements.formCartaOriginalCod) elements.formCartaOriginalCod.value = carta.cod_cota;

      document.getElementById('carta-cod').value = carta.cod_cota;
      document.getElementById('carta-categoria').value = carta.categoria || 'Imóvel';
      document.getElementById('carta-adm').value = carta.administradora || '';
      document.getElementById('carta-status').value = carta.status || 'Disponível';
      document.getElementById('carta-credito').value = carta.credito || '';
      document.getElementById('carta-entrada').value = carta.entrada || '';
      document.getElementById('carta-num-parcelas').value = carta.num_parcelas || '';
      document.getElementById('carta-vlr-parcela').value = carta.vlr_parcela || '';
      document.getElementById('carta-saldo-devedor').value = carta.saldo_devedor || '';
      document.getElementById('carta-grupo').value = carta.grupo || '';
    } else {
      if (elements.modalEditCartaTitle) elements.modalEditCartaTitle.textContent = 'Nova Carta Contemplada';
      if (elements.formCartaOriginalCod) elements.formCartaOriginalCod.value = '';
      if (elements.formCartaItem) elements.formCartaItem.reset();
    }

    elements.modalEditCarta.classList.add('active');
  };

  const saveCartaForm = (e) => {
    e.preventDefault();

    const originalCod = elements.formCartaOriginalCod ? elements.formCartaOriginalCod.value : '';
    const newCod = document.getElementById('carta-cod').value.trim();

    if (!newCod) {
      showAlert('Por favor, informe o Código da Cota.', 'Campo Obrigatório');
      return;
    }

    if ((!originalCod || originalCod !== newCod) && state.cartas.some(c => String(c.cod_cota) === newCod)) {
      showAlert(`Já existe uma carta cadastrada com o Código "${newCod}". Altere o código para evitar duplicidade.`, 'Cota Duplicada');
      return;
    }

    const cartaData = {
      cod_cota: newCod,
      categoria: document.getElementById('carta-categoria').value,
      administradora: document.getElementById('carta-adm').value.trim(),
      status: document.getElementById('carta-status').value,
      credito: document.getElementById('carta-credito').value.trim(),
      entrada: document.getElementById('carta-entrada').value.trim(),
      num_parcelas: document.getElementById('carta-num-parcelas').value.trim(),
      vlr_parcela: document.getElementById('carta-vlr-parcela').value.trim(),
      saldo_devedor: document.getElementById('carta-saldo-devedor').value.trim(),
      grupo: document.getElementById('carta-grupo').value.trim(),
      updated_at: new Date().toISOString()
    };

    if (originalCod) {
      const idx = state.cartas.findIndex(c => String(c.cod_cota) === String(originalCod));
      if (idx !== -1) {
        state.cartas[idx] = { ...state.cartas[idx], ...cartaData };
      }
    } else {
      state.cartas.unshift(cartaData);
    }

    saveCartasData();
    populateAdministradorasFilter();
    applyCartasFiltersAndRender();

    if (elements.modalEditCarta) elements.modalEditCarta.classList.remove('active');
    showAlert(originalCod ? 'Carta atualizada com sucesso!' : 'Nova carta cadastrada com sucesso!', 'Sucesso');
  };

  const confirmDeleteCarta = (codCota) => {
    showConfirm(
      `Deseja realmente excluir a carta contemplada <strong>#${codCota}</strong>? Esta ação não pode ser desfeita.`,
      'Excluir Carta',
      () => {
        state.cartas = state.cartas.filter(c => String(c.cod_cota) !== String(codCota));
        state.cartasSelected.delete(String(codCota));
        saveCartasData();
        populateAdministradorasFilter();
        applyCartasFiltersAndRender();
        showAlert(`Carta #${codCota} excluída com sucesso.`, 'Carta Excluída');
      },
      'Excluir',
      true
    );
  };

  const executeBatchStatus = () => {
    const newStatus = elements.batchNewStatus ? elements.batchNewStatus.value : 'Disponível';
    if (state.cartasSelected.size === 0) return;

    let updated = 0;
    state.cartas.forEach(c => {
      if (state.cartasSelected.has(String(c.cod_cota))) {
        c.status = newStatus;
        c.updated_at = new Date().toISOString();
        updated++;
      }
    });

    state.cartasSelected.clear();
    saveCartasData();
    applyCartasFiltersAndRender();

    if (elements.modalBatchStatus) elements.modalBatchStatus.classList.remove('active');
    showAlert(`Status de ${updated} cartas alterado para "${newStatus}" com sucesso!`, 'Lote Atualizado');
  };

  const confirmBatchDelete = () => {
    const count = state.cartasSelected.size;
    if (count === 0) return;

    showConfirm(
      `Deseja realmente excluir as <strong>${count}</strong> cartas selecionadas? Esta ação removerá os registros definitivamente.`,
      'Excluir em Lote',
      () => {
        state.cartas = state.cartas.filter(c => !state.cartasSelected.has(String(c.cod_cota)));
        state.cartasSelected.clear();
        saveCartasData();
        populateAdministradorasFilter();
        applyCartasFiltersAndRender();
        showAlert(`${count} cartas foram excluídas com sucesso.`, 'Exclusão Concluída');
      },
      'Excluir Selecionadas',
      true
    );
  };

  const exportCartasCsv = () => {
    const list = state.cartasFiltered && state.cartasFiltered.length > 0 ? state.cartasFiltered : state.cartas;
    if (list.length === 0) {
      showAlert('Nenhuma carta disponível para exportação.', 'Aviso');
      return;
    }

    const headers = ['Cód. Cota', 'Categoria', 'Crédito', 'Entrada', 'Nº Parcelas', 'Vlr Parcela', 'Saldo devedor', 'Administradora', 'Grupo', 'Status'];
    const rows = list.map(c => [
      `"${c.cod_cota || ''}"`,
      `"${c.categoria || ''}"`,
      `"${c.credito || ''}"`,
      `"${c.entrada || ''}"`,
      `"${c.num_parcelas || ''}"`,
      `"${c.vlr_parcela || ''}"`,
      `"${c.saldo_devedor || ''}"`,
      `"${c.administradora || ''}"`,
      `"${c.grupo || ''}"`,
      `"${c.status || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cartas_contempladas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const checkUrlNavigation = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    if (view && ['portal', 'campanhas', 'inbox', 'crm', 'cartas'].includes(view)) {
      switchAppView(view);
    }
  };

  const updateCartasPermissions = () => {
    const isAdm = currentUserRole === 'ADM';
    const isOperador = currentUserRole === 'OPERADOR';
    const canManage = isAdm || isOperador;

    if (elements.cartasAdminActions) {
      elements.cartasAdminActions.style.display = canManage ? 'flex' : 'none';
    }

    const thCheck = document.getElementById('th-check-all');
    if (thCheck) {
      thCheck.style.display = canManage ? 'table-cell' : 'none';
    }
  };

  // --- LISTENERS DE CARTAS CONTEMPLADAS ---
  const setupCartasEventListeners = () => {
    // Filtros de pesquisa
    if (elements.filterCodCota) {
      elements.filterCodCota.addEventListener('input', () => {
        state.cartasPage = 1;
        applyCartasFiltersAndRender();
      });
    }

    if (elements.filterCategoria) {
      elements.filterCategoria.addEventListener('change', () => {
        state.cartasPage = 1;
        applyCartasFiltersAndRender();
      });
    }

    if (elements.filterAdministradora) {
      elements.filterAdministradora.addEventListener('change', () => {
        state.cartasPage = 1;
        applyCartasFiltersAndRender();
      });
    }

    if (elements.filterStatus) {
      elements.filterStatus.addEventListener('change', () => {
        state.cartasPage = 1;
        applyCartasFiltersAndRender();
      });
    }

    if (elements.filterOrder) {
      elements.filterOrder.addEventListener('change', () => {
        applyCartasFiltersAndRender();
      });
    }

    if (elements.btnClearFilters) {
      elements.btnClearFilters.addEventListener('click', () => {
        if (elements.filterCodCota) elements.filterCodCota.value = '';
        if (elements.filterCategoria) elements.filterCategoria.value = '';
        if (elements.filterAdministradora) elements.filterAdministradora.value = '';
        if (elements.filterStatus) elements.filterStatus.value = '';
        if (elements.filterOrder) elements.filterOrder.value = 'cod_desc';
        state.cartasPage = 1;
        applyCartasFiltersAndRender();
      });
    }

    if (elements.cartasPageSize) {
      elements.cartasPageSize.addEventListener('change', () => {
        state.cartasPageSize = parseInt(elements.cartasPageSize.value) || 25;
        state.cartasPage = 1;
        applyCartasFiltersAndRender();
      });
    }

    // Paginação
    if (elements.cartasPaginationControls) {
      elements.cartasPaginationControls.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-page');
        if (btn && !btn.disabled && btn.getAttribute('data-page')) {
          state.cartasPage = parseInt(btn.getAttribute('data-page')) || 1;
          applyCartasFiltersAndRender();
          const tableElem = document.getElementById('table-cartas');
          if (tableElem) tableElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    // Tabela: cliques nas ações (WhatsApp, Editar, Excluir, Checkbox)
    if (elements.cartasTbody) {
      elements.cartasTbody.addEventListener('click', (e) => {
        const wppBtn = e.target.closest('[data-action="wpp"]');
        if (wppBtn) {
          const cod = wppBtn.getAttribute('data-cod');
          openWhatsAppNegotiation(cod);
          return;
        }

        const editBtn = e.target.closest('[data-action="edit"]');
        if (editBtn) {
          const cod = editBtn.getAttribute('data-cod');
          openEditCartaModal(cod);
          return;
        }

        const deleteBtn = e.target.closest('[data-action="delete"]');
        if (deleteBtn) {
          const cod = deleteBtn.getAttribute('data-cod');
          confirmDeleteCarta(cod);
          return;
        }

        const checkbox = e.target.closest('.check-carta-item');
        if (checkbox) {
          const cod = checkbox.getAttribute('data-cod');
          if (checkbox.checked) {
            state.cartasSelected.add(cod);
          } else {
            state.cartasSelected.delete(cod);
          }
          const tr = checkbox.closest('tr');
          if (tr) tr.classList.toggle('selected', checkbox.checked);
          updateBatchToolbar();
          return;
        }
      });
    }

    // Selecionar todos na página
    if (elements.checkSelectAll) {
      elements.checkSelectAll.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const pageCheckboxes = document.querySelectorAll('.check-carta-item');
        pageCheckboxes.forEach(cb => {
          cb.checked = isChecked;
          const cod = cb.getAttribute('data-cod');
          if (isChecked) {
            state.cartasSelected.add(cod);
          } else {
            state.cartasSelected.delete(cod);
          }
          const tr = cb.closest('tr');
          if (tr) tr.classList.toggle('selected', isChecked);
        });
        updateBatchToolbar();
      });
    }

    // Botões da Barra de Ações em Lote
    if (elements.btnBatchClear) {
      elements.btnBatchClear.addEventListener('click', () => {
        state.cartasSelected.clear();
        applyCartasFiltersAndRender();
      });
    }

    if (elements.btnBatchStatus) {
      elements.btnBatchStatus.addEventListener('click', () => {
        if (state.cartasSelected.size === 0) return;
        if (elements.batchModalCount) elements.batchModalCount.textContent = state.cartasSelected.size;
        if (elements.modalBatchStatus) elements.modalBatchStatus.classList.add('active');
      });
    }

    if (elements.closeModalBatchStatus) {
      elements.closeModalBatchStatus.addEventListener('click', () => {
        if (elements.modalBatchStatus) elements.modalBatchStatus.classList.remove('active');
      });
    }

    if (elements.btnCancelBatchStatus) {
      elements.btnCancelBatchStatus.addEventListener('click', () => {
        if (elements.modalBatchStatus) elements.modalBatchStatus.classList.remove('active');
      });
    }

    if (elements.btnApplyBatchStatus) {
      elements.btnApplyBatchStatus.addEventListener('click', executeBatchStatus);
    }

    if (elements.btnBatchDelete) {
      elements.btnBatchDelete.addEventListener('click', confirmBatchDelete);
    }

    // Botão Adicionar Nova Carta
    if (elements.btnAddCarta) {
      elements.btnAddCarta.addEventListener('click', () => openEditCartaModal(null));
    }

    // Botão Carregar Modelo da pasta artefatos
    if (elements.btnLoadDefaultCartas) {
      elements.btnLoadDefaultCartas.addEventListener('click', () => loadDefaultCartasFromFile(true));
    }

    // Botão Exportar CSV
    if (elements.btnExportCartasCsv) {
      elements.btnExportCartasCsv.addEventListener('click', exportCartasCsv);
    }

    // Modal Importação
    if (elements.btnOpenImportCartas) {
      elements.btnOpenImportCartas.addEventListener('click', () => {
        state.pendingImportData = [];
        if (elements.btnSubmitImport) elements.btnSubmitImport.disabled = true;
        if (elements.importPreviewContainer) elements.importPreviewContainer.style.display = 'none';
        if (elements.dropzoneFilename) elements.dropzoneFilename.textContent = 'Suporta formato padrão Excel (.xls, .xlsx) e CSV';
        if (elements.modalImportCartas) elements.modalImportCartas.classList.add('active');
      });
    }

    if (elements.closeModalImportCartas) {
      elements.closeModalImportCartas.addEventListener('click', () => {
        if (elements.modalImportCartas) elements.modalImportCartas.classList.remove('active');
      });
    }

    if (elements.btnCancelImport) {
      elements.btnCancelImport.addEventListener('click', () => {
        if (elements.modalImportCartas) elements.modalImportCartas.classList.remove('active');
      });
    }

    if (elements.importDropzone) {
      elements.importDropzone.addEventListener('click', () => {
        if (elements.inputCartasFile) elements.inputCartasFile.click();
      });

      elements.importDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.importDropzone.classList.add('dragover');
      });

      elements.importDropzone.addEventListener('dragleave', () => {
        elements.importDropzone.classList.remove('dragover');
      });

      elements.importDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.importDropzone.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
          parseUploadedCartasFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (elements.inputCartasFile) {
      elements.inputCartasFile.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          parseUploadedCartasFile(e.target.files[0]);
        }
      });
    }

    if (elements.btnUseModelArtefato) {
      elements.btnUseModelArtefato.addEventListener('click', async () => {
        try {
          elements.btnUseModelArtefato.disabled = true;
          elements.btnUseModelArtefato.textContent = 'Lendo artefato...';

          let items = [];
          try {
            const respJson = await fetch('artefatos/cartas_default.json');
            if (respJson.ok) items = await respJson.json();
          } catch (e) {}

          if (!items || items.length === 0) {
            const respXls = await fetch('artefatos/CartasContempladas.xls');
            const text = await respXls.text();
            items = parseHtmlTableXls(text);
          }

          if (items && items.length > 0) {
            state.pendingImportData = items;
            renderImportPreview(items);
            if (elements.btnSubmitImport) elements.btnSubmitImport.disabled = false;
            if (elements.dropzoneFilename) {
              elements.dropzoneFilename.textContent = `Modelo carregado: artefatos/CartasContempladas.xls (${items.length} cotas prontas)`;
            }
          } else {
            showAlert('Não foi possível ler o arquivo modelo da pasta artefatos.', 'Erro');
          }
        } catch (err) {
          console.error("Erro ao carregar modelo no modal:", err);
          showAlert('Erro ao ler modelo da pasta artefatos.', 'Erro');
        } finally {
          elements.btnUseModelArtefato.disabled = false;
          elements.btnUseModelArtefato.textContent = 'Carregar artefatos/CartasContempladas.xls';
        }
      });
    }

    if (elements.btnSubmitImport) {
      elements.btnSubmitImport.addEventListener('click', executeImportCartas);
    }

    // Modal de Edição de Carta
    if (elements.closeModalEditCarta) {
      elements.closeModalEditCarta.addEventListener('click', () => {
        if (elements.modalEditCarta) elements.modalEditCarta.classList.remove('active');
      });
    }

    if (elements.btnCancelEditCarta) {
      elements.btnCancelEditCarta.addEventListener('click', () => {
        if (elements.modalEditCarta) elements.modalEditCarta.classList.remove('active');
      });
    }

    if (elements.formCartaItem) {
      elements.formCartaItem.addEventListener('submit', saveCartaForm);
    }
  };

  // Inicializa os listeners do módulo de Cartas Contempladas
  setupCartasEventListeners();

  updateSimulatorLimits();
  renderSimulations();
};

// Inicialização segura compatível com ES Modules
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

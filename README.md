# ConsórcioOne 🚀

**ConsórcioOne** é uma plataforma digital premium desenvolvida para centralizar, simplificar e automatizar a jornada de simulação, venda e contratação de consórcios multimarcas (Automóvel, Imóvel, Serviços e Eletro) integrando Inteligência Artificial.

O projeto foi concebido a partir de requisitos de negócios detalhados e áudios de alinhamento operacional (incluindo as bases lógicas de tabelas otimizadas).

---

## 🌟 Funcionalidades Principais (MVP)

1. **Portal do Cliente:**
   * **Simulador Multimarcas Interativo:** Seleção de categoria e sliders interativos de crédito e prazo que calculam instantaneamente as parcelas para as administradoras cadastradas (*Itaú Consórcios, Porto Seguro e Consórcio Caixa*).
   * **Visualização de Propostas:** Destaque visual da melhor opção com taxas de administração e fundo de reserva detalhados.
   * **Formulário de Pré-cadastro:** Coleta de dados importantes como nome, CPF/CNPJ, e-mail, celular e renda mensal para envio de propostas.

2. **Chatbot Virtual com IA (Mock integrado):**
   * Widget de chat flutuante e responsivo de fácil navegação.
   * Responde dúvidas frequentes sobre o funcionamento de consórcios, lances, contemplações e taxas de forma instantânea.
   * **Integração Bidirecional:** Identifica se o usuário digita intenção de compra (ex: *"Quero um carro de 90 mil"*) e atualiza os controles do simulador automaticamente.

3. **Painel Comercial / CRM do Consultor (Interno):**
   * Quadro Kanban completo dividido em funis de venda (`Novos Leads`, `Em Atendimento`, `Qualificados`, `Proposta Enviada`, `Vendido / Ativo`).
   * Interface *drag-and-drop* para transição de status de leads.
   * Painel de detalhes do lead (slide-over) contendo dados cadastrais, histórico da conversa mantida com a IA e seção de arquivos anexados.

4. **Motor de OCR (Mock integrado):**
   * Permite aos consultores iniciarem uma simulação de validação por IA/OCR nos documentos enviados (CPF/Comprovantes) para validar a legibilidade e aprovação cadastral instantaneamente.

---

## 🛠️ Tecnologias Utilizadas

* **Estrutura:** HTML5 Semântico e Moderno.
* **Estilização:** CSS3 Vanilla customizado, usando paleta de cores HSL, Glassmorphism, tipografia importada (Outfit & Inter) e design adaptável para dispositivos móveis.
* **Lógica:** Vanilla Javascript, gerenciando estado local de leads no `localStorage` para manter a persistência de dados.

---

## 💻 Como Rodar o Projeto Localmente

Você pode abrir o projeto diretamente em qualquer navegador abrindo o arquivo `index.html`, ou servir localmente usando Python:

```bash
# Entre na pasta do projeto
cd ConsorcioOne

# Inicie um servidor estático local
python3 -m http.server 8000
```
Depois, abra o seu navegador em [http://localhost:8000](http://localhost:8000).

---

## 🚀 Como Realizar o Deploy

Como o projeto atual é composto por arquivos estáticos (`index.html`, `styles.css`, `app.js`), você pode hospedá-lo de forma **100% gratuita** utilizando as seguintes ferramentas:

### Opção 1: GitHub Pages (Recomendado para repositórios Git)
1. Crie um repositório no seu GitHub.
2. Faça o push dos arquivos locais.
3. Vá em **Settings** > **Pages** do seu repositório.
4. Em **Build and deployment**, selecione a branch `main` e a pasta `/ (root)`.
5. Clique em **Save**. O link do deploy será gerado em poucos minutos!

### Opção 2: Vercel CLI (Deploy Instantâneo)
1. Instale o Vercel CLI em seu terminal: `npm install -g vercel`
2. Na raiz do projeto, execute o comando: `vercel`
3. Siga as instruções do terminal para vincular sua conta e publicar em produção.

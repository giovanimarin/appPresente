# Presente — Especificação do Site Público
# Documento para Claude Code
# Versão 1.0

---

## 0. Instrução de Inicialização para o Claude Code

```
Você vai desenvolver o site público do Presente — plataforma SaaS B2B de
comunicação escola-família. Este documento especifica todas as páginas,
seções, componentes, fluxos e regras visuais. O brand guide do Presente
(presente-brand-guide.md) deve ser seguido rigorosamente para cores,
tipografia e componentes. A parte funcional de pagamento é FAKE neste
momento — implemente apenas o visual e os estados de UI. Use Next.js 14
(App Router) com Tailwind CSS. Leia este documento completo antes de
escrever qualquer linha de código.
```

---

## 1. Visão Geral

**Produto:** Site público de marketing e conversão do Presente  
**Stack:** Next.js 14 (App Router), Tailwind CSS, Framer Motion, Lucide Icons  
**Domínio:** presente.com.br  
**Objetivo:** Converter visitantes (diretoras e gestores de escola) em clientes  
**Tom:** Cálido, profissional, direto. Como uma boa diretora de escola — séria quando necessário, humana sempre.

### Páginas

| Rota | Página |
|---|---|
| `/` | Home — landing principal |
| `/produto` | Produto — funcionalidades detalhadas |
| `/precos` | Preços e planos |
| `/checkout` | Fluxo de checkout (fake) |
| `/contato` | Contato e FAQ |

### Estrutura de Arquivos

```
apps/site/
  src/
    app/
      layout.tsx              # Root layout com navbar e footer
      page.tsx                # Home
      produto/page.tsx        # Produto
      precos/page.tsx         # Preços
      checkout/page.tsx       # Checkout
      contato/page.tsx        # Contato e FAQ
    components/
      layout/
        Navbar.tsx
        Footer.tsx
      ui/
        Button.tsx
        Badge.tsx
        Card.tsx
      sections/
        home/
          Hero.tsx
          Problem.tsx
          HowItWorks.tsx
          Personas.tsx
          SocialProof.tsx
          CTA.tsx
        produto/
          ProductHero.tsx
          Features.tsx         # ← DINÂMICO — lê do PRD
          Screens.tsx
        precos/
          PricingHero.tsx
          PricingCards.tsx
          FAQ.tsx
        checkout/
          CheckoutFlow.tsx
          PlanSummary.tsx
          FakeForm.tsx
        contato/
          ContactHero.tsx
          ContactForm.tsx
          FAQAccordion.tsx
```

---

## 2. Identidade Visual no Site

### Cores (do Brand Guide)

```css
--primary:         #7BAFD4   /* Azul escola — CTAs principais */
--primary-dark:    #5A96BE   /* Hover */
--primary-pale:    #EBF4FA   /* Backgrounds suaves */
--secondary:       #8DB5A0   /* Sage — sucesso, destaques */
--cream:           #F2EDE4   /* Fundo de seções alternadas */
--cream-dark:      #E0D8CC   /* Bordas, separadores */
--text-primary:    #3D5166   /* Textos principais */
--text-secondary:  #6B8299   /* Textos secundários */
--text-muted:      #9AAFC0   /* Placeholders */
--bg-app:          #FAFAF8   /* Background geral */
--error:           #C4826A   /* Nunca vermelho puro */
```

### Tipografia

```
Display/Headlines:   Fraunces (Google Fonts) — italic 300 para emoção, 700 para impacto
Body/UI:             DM Sans (Google Fonts) — 400, 500, 600, 700
```

```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,700;1,300;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Regras Inegociáveis

```
✅ Border radius mínimo 10px — nunca cantos a 90 graus
✅ Botões principais sempre pill shape (border-radius: 9999px)
✅ Sombras suaves — nunca duras ou escuras
✅ Animações: suaves, propósito claro, nunca distrativas
✅ Scroll animations com Framer Motion (fade + slide up)
❌ Nunca usar preto puro (#000)
❌ Nunca usar vermelho puro para erros
❌ Nunca usar gradientes de alto contraste
❌ Nunca usar Inter, Roboto ou Arial
```

---

## 3. Componentes Globais

### 3.1 Navbar

**Comportamento:**
- Fixa no topo com backdrop blur ao fazer scroll
- Transparente no topo da página, branca com sombra suave ao scrollar
- Responsiva — menu hamburger no mobile

**Conteúdo:**

```
[Logo Presente]                    [Produto] [Preços] [Contato]    [Entrar] [Começar grátis →]
```

**Especificação:**
- Logo: símbolo P + wordmark "Presente" lado a lado
- Links: DM Sans 500, 14px, cor #6B8299, hover #3D5166
- Botão "Entrar": ghost, border #E0D8CC, cor #6B8299
- Botão "Começar grátis": pill, background #7BAFD4, branco, sombra suave
- Altura: 64px desktop, 56px mobile
- Border bottom: 1px solid #E0D8CC ao scrollar

**Mobile menu:**
- Drawer deslizando da direita
- Background branco, border-left 1px #E0D8CC
- Links em lista vertical, 48px de altura cada
- Botão "Começar grátis" full-width no rodapé do drawer

---

### 3.2 Footer

**Layout 4 colunas desktop, 2 colunas mobile:**

```
Coluna 1: Logo + tagline + redes sociais
Coluna 2: Produto
Coluna 3: Empresa
Coluna 4: Legal
```

**Conteúdo:**

```
[Logo]
Escola e família,
sempre conectadas.

[LinkedIn] [Instagram]

Produto              Empresa              Legal
Funcionalidades      Sobre o Presente     Termos de uso
Preços               Blog                 Privacidade
Para diretoras       Contato              LGPD
Para professores     Trabalhe conosco     Cookies
Para responsáveis

---
© 2026 Presente. Todos os direitos reservados.        Feito com ♥ para a educação brasileira
```

**Especificação:**
- Background: #3D5166 (deep slate)
- Texto: branco com opacidade variada
- Links: #9AAFC0, hover branco
- Divider: 1px rgba(255,255,255,0.1)
- Padding: 80px top, 48px bottom

---

## 4. Página Home (`/`)

**Objetivo:** Explicar o que é o Presente para quem nunca ouviu falar. Direto, emocional, convincente. Terminar com CTA claro.

---

### 4.1 Hero

**Layout:** Full viewport height, conteúdo centralizado, elemento visual à direita

**Conteúdo:**

```
[Badge: "Novo · Comunicação escola-família reinventada"]

O canal oficial
entre escola e família.

Sem grupo de WhatsApp.
Sem circular impressa.
Sem "mas eu não recebi."

[Começar gratuitamente →]    [Ver como funciona]

↓ Mais de 200 escolas já usam o Presente

[Logos de escolas parceiras — placeholder]
```

**Especificação visual:**
- Headline: Fraunces italic 300, 64px desktop / 40px mobile, cor #3D5166
- "Sem grupo de WhatsApp..." em DM Sans 400, 20px, cor #6B8299
- Badge: pill shape, background #EBF4FA, cor #5A96BE, ícone ⚡
- CTA primário: pill, #7BAFD4, shadow-button
- CTA secundário: ghost, #6B8299, ícone play ▶
- Elemento visual direito: mockup do app em frame de celular, animação suave de float
- Background: #FAFAF8 com textura sutil de pontos cream

**Animação de entrada:**
- Badge: fade in, delay 0ms
- H1: fade up, delay 100ms
- Subtítulo: fade up, delay 200ms
- CTAs: fade up, delay 300ms
- Celular mockup: fade in + float animation loop

---

### 4.2 Social Proof Bar

**Layout:** Barra horizontal com números

```
247 escolas         18.400 responsáveis         98% de taxa de leitura         4.9 ★ avaliação
```

**Especificação:**
- Background: #F2EDE4
- Números: Fraunces 700, 32px, #3D5166
- Labels: DM Sans 500, 13px, #6B8299
- Dividers: 1px #E0D8CC
- Padding: 40px vertical

---

### 4.3 O Problema (Problem Section)

**Layout:** 2 colunas — esquerda texto, direita cards de dor

**Título:**
```
A comunicação escolar
ainda está no grupo de WhatsApp.
E todo mundo sabe que não funciona.
```

**Cards de dor (lado direito) — 3 cards empilhados levemente rotacionados:**

```
Card 1: 📱
"Mãe da Luíza, boa noite!
Só pra confirmar que vocês viram
o aviso da reunião amanhã?"
[Entregue às 23:47]

Card 2: 📋
Circular nº 47/2026
Prezados responsáveis...
[Folha amassada com marca d'água: EXTRAVIADO]

Card 3: ⚠️
"Diretora, o pai do João disse
que não foi avisado da excursão.
Mas eu juro que mandei no grupo!"
```

**Subtítulo abaixo dos cards:**
```
Escolas perdem horas, pais perdem informação,
e ninguém tem como provar o que foi dito.
```

**Especificação:**
- Background: branco
- Cards de dor: estilo de chat/papel com rotação leve (-2deg, 1deg, -1deg)
- Animação: cards aparecem em sequência ao scrollar

---

### 4.4 Como Funciona (How It Works)

**Layout:** 3 passos em linha horizontal desktop, vertical mobile

**Título:** `Em 3 passos, sua escola está conectada.`

```
Passo 1                    Passo 2                    Passo 3
[Ícone: upload]           [Ícone: send]              [Ícone: check-circle]

Importe seus alunos        Envie comunicados           Acompanhe quem leu

Suba sua planilha do       Texto, fotos ou avisos.     Relatório em tempo real.
sistema escolar e o        A escola envia, os pais     Sabe exatamente quem
Presente configura tudo.   recebem no app.             confirmou. Ponto final.
```

**Especificação:**
- Background: #F2EDE4
- Números dos passos: Fraunces 700, 48px, cor #E0D8CC (gigante, decorativo)
- Ícones: Lucide, 32px, #7BAFD4
- Conectores entre passos: linha tracejada #E0D8CC
- Animação: steps aparecem da esquerda para direita ao scrollar

---

### 4.5 Para Quem É (Personas)

**Layout:** 3 cards lado a lado

**Título:** `Feito para toda a escola.`

```
Card 1 — Diretora
[Ícone: building]
"Quero saber que a informação chegou."

Tenha controle total da comunicação.
Veja quem leu, quem não leu. Acabe
com o 'não fui avisado'.

Card 2 — Coordenadora / Professora
[Ícone: book-open]
"Preciso me comunicar sem expor meu número."

Envie para sua turma com 1 clique.
Sem WhatsApp pessoal. Sem invasão
fora do horário de trabalho.

Card 3 — Responsável
[Ícone: heart]
"Quero saber o que acontece com meu filho."

Tudo que a escola manda, organizado.
Sem perder no meio de 300 mensagens.
Confirme com um toque.
```

**Especificação:**
- Background: branco
- Cards: background #FAFAF8, border 1px #E0D8CC, radius 20px, padding 32px
- Hover: border-color #7BAFD4, shadow-md, translateY(-4px)
- Quote: Fraunces italic 300, 18px, #3D5166
- Body: DM Sans 400, 15px, #6B8299

---

### 4.6 Funcionalidades em Destaque

**Layout:** Alternado — imagem esquerda/texto direita, depois texto esquerda/imagem direita

**Nota para Claude Code:**
```
IMPORTANTE: As funcionalidades exibidas aqui devem ser extraídas
do documento PRD do Presente (presente_prd_v12.docx / seções 3.x).
Use as funcionalidades principais mapeadas no PRD como fonte da verdade.
Esta seção fica em aberto para ser preenchida conforme o produto evolui.
Implemente o layout e os componentes — o conteúdo virá do PRD.

Sugestão de estrutura para cada feature block:
- Badge de categoria (ex: "Comunicados", "Agenda", "Formulários")
- Headline da funcionalidade
- Descrição em 2-3 linhas
- 3-4 bullets de benefícios
- Mockup/screenshot do app (placeholder por enquanto)
```

**Layout de cada feature block:**

```
[Mockup app]     |     [Badge]
                 |     Headline da funcionalidade
                 |
                 |     Descrição curta e direta.
                 |
                 |     ✓ Benefício 1
                 |     ✓ Benefício 2
                 |     ✓ Benefício 3
                 |
                 |     [Saiba mais →]
```

---

### 4.7 Depoimentos

**Layout:** 3 cards em grid

**Conteúdo (placeholder — substituir por reais):**

```
Card 1:
"Acabei com o grupo de WhatsApp da escola. Os professores
ficaram aliviados e os pais passaram a ler os comunicados."
— Sônia G., Diretora · Escola Girassol, RJ
⭐⭐⭐⭐⭐

Card 2:
"Meu número pessoal não está mais exposto para 28 famílias.
Isso por si só já valeu cada centavo."
— Juliana A., Professora · 3º ano
⭐⭐⭐⭐⭐

Card 3:
"Agora sei exatamente quem não leu o aviso da reunião
e posso agir antes que vire problema."
— Fernanda R., Coordenadora
⭐⭐⭐⭐⭐
```

**Especificação:**
- Background: #3D5166 (dark section — contraste com o restante)
- Cards: background rgba(255,255,255,0.08), border 1px rgba(255,255,255,0.12), radius 20px
- Quote: Fraunces italic 300, 18px, branco
- Nome: DM Sans 600, 13px, #A8C9C0
- Estrelas: #D4A96A

---

### 4.8 CTA Final

**Layout:** Centralizado, full-width com background gradiente suave

```
Sua escola ainda usa WhatsApp para avisar os pais?

[Começar 30 dias grátis →]

Sem cartão de crédito. Cancele quando quiser.
Setup em menos de 40 minutos.
```

**Especificação:**
- Background: linear-gradient(135deg, #EBF4FA 0%, #EDF5F1 100%)
- Headline: Fraunces italic 700, 40px, #3D5166
- CTA: pill, #7BAFD4, 56px height, DM Sans 600, 16px
- Sub: DM Sans 400, 13px, #9AAFC0
- Ícones de checkmark antes de cada sub-item

---

## 5. Página Produto (`/produto`)

**Objetivo:** Detalhar todas as funcionalidades para quem já entendeu o produto e quer saber mais antes de comprar.

---

### 5.1 Hero do Produto

```
[Badge: "Produto"]

Tudo que sua escola
precisa para se comunicar
de forma profissional.

[Começar grátis →]    [Ver preços]
```

**Especificação:**
- Background: #3D5166
- Texto: branco
- Badge: rgba(255,255,255,0.15) bg, branco
- Ilustração: mockup do painel web ao fundo, opacidade 20%

---

### 5.2 Navegação de Funcionalidades (Tabs fixas)

**Layout:** Tabs horizontais sticky abaixo da navbar ao scrollar

```
[Comunicados] [Agenda] [Formulários] [Responsáveis] [Gestão] [Relatórios]
```

**Comportamento:**
- Ao clicar, scroll suave até a seção correspondente
- Tab ativa: background #7BAFD4, texto branco
- Tab inativa: fundo transparente, texto #6B8299

---

### 5.3 Seções de Funcionalidades

**⚠️ NOTA CRÍTICA PARA CLAUDE CODE:**

```
O conteúdo desta seção deve ser extraído do PRD do Presente.
Consulte o documento presente_prd_v12.docx, especificamente:
  - Seção 3: Requisitos Funcionais (RF-01 a RF-24)
  - Seção 13: Modelo de Entidades (para entender os conceitos)

Para cada módulo funcional (RF), crie uma seção com:
  1. Ícone representativo (Lucide)
  2. Título do módulo
  3. Descrição em linguagem de marketing (não técnica)
  4. Lista de capacidades em bullets
  5. Mockup ou ilustração placeholder
  6. Badge indicando se está no MVP ou roadmap

Implemente o LAYOUT e os COMPONENTES agora.
O conteúdo final será preenchido conforme o produto evolui.
Esta seção deve ser facilmente atualizável via dados/CMS.

Layout sugerido para cada seção de funcionalidade:
```

**Template de seção de funcionalidade:**

```jsx
// FeaturesSection component — cada módulo usa este template
<section id="[modulo]" className="feature-section">
  <div className="feature-header">
    <Badge>{categoria}</Badge>
    <Icon name={icon} />
    <h2>{titulo}</h2>
    <p>{descricao}</p>
  </div>
  <div className="feature-body">
    <div className="feature-list">
      {capacidades.map(c => <FeatureItem key={c.id} {...c} />)}
    </div>
    <div className="feature-visual">
      <AppMockup screen={screen} />
    </div>
  </div>
</section>
```

---

### 5.4 Comparação com Alternativas

**Layout:** Tabela comparativa

```
Funcionalidade          Presente    WhatsApp    Circular    Outros apps
─────────────────────────────────────────────────────────────────────
Confirmação de leitura    ✅          ❌           ❌           ⚠️
Sem número exposto        ✅          ❌           ✅           ✅
Histórico documentado     ✅          ❌           ⚠️           ⚠️
Relatório por aluno       ✅          ❌           ❌           ⚠️
Formulários integrados    ✅          ❌           ❌           ❌
Multi-turma em lote       ✅          ⚠️           ✅           ⚠️
App para responsáveis     ✅          ✅           ❌           ✅
Validade jurídica         ✅          ❌           ⚠️           ❌
```

**Especificação:**
- ✅ verde (#8DB5A0), ❌ terracota suave (#C4826A), ⚠️ amarelo suave (#D4A96A)
- Coluna "Presente" com background #EBF4FA destacada
- Header da coluna "Presente" com badge "Recomendado"

---

### 5.5 CTA Produto

```
Pronto para ver na prática?

[Começar 30 dias grátis]    [Falar com especialista]
```

---

## 6. Página Preços (`/precos`)

**Objetivo:** Apresentar os planos claramente e levar o visitante ao checkout.

---

### 6.1 Hero de Preços

```
Simples, transparente,
sem surpresas.

30 dias grátis em qualquer plano.
Sem cartão de crédito.

[Toggle: Mensal | Anual (-20%)]
```

---

### 6.2 Cards de Planos

**Layout:** 3 cards lado a lado, card central destacado ("Escola" — mais popular)

**Plano Starter:**
```
Starter
Para escolas menores

R$ 199
/mês · até 100 alunos

[Começar grátis →]

✓ Comunicados ilimitados
✓ Até 100 alunos
✓ App para responsáveis
✓ Confirmação de leitura
✓ Agenda escolar
✓ Formulários do responsável
✓ Relatórios básicos
✓ Suporte por e-mail
─────────────────
✗ API
✗ Múltiplas unidades
✗ Suporte prioritário
```

**Plano Escola (DESTAQUE):**
```
⭐ Mais popular

Escola
Para escolas em crescimento

R$ 449
/mês · 101 a 400 alunos

[Começar grátis →]

✓ Tudo do Starter
✓ Até 400 alunos
✓ Múltiplas unidades
✓ API básica
✓ Relatórios avançados
✓ Dashboard de engajamento
✓ Onboarding assistido
✓ Suporte prioritário (8h)
─────────────────
✗ API completa
✗ CS dedicado
```

**Plano Rede:**
```
Rede
Para redes de escolas

R$ 890
/mês · 401 a 1000 alunos

[Falar com especialista →]

✓ Tudo do Escola
✓ Até 1000 alunos
✓ API completa
✓ Múltiplas unidades ilimitadas
✓ Relatórios executivos
✓ CS dedicado
✓ SLA de uptime
✓ Suporte WhatsApp (2h)
✓ Integração personalizada
```

**Especificação dos cards:**
- Starter: background branco, border #E0D8CC
- Escola: background #3D5166, texto branco — card maior (scale 1.05)
- Rede: background branco, border #E0D8CC
- Badge "Mais popular": pill, #7BAFD4, posição absolute top center
- Botão Starter/Rede: pill, border #7BAFD4, cor #7BAFD4 (ghost)
- Botão Escola: pill, background #7BAFD4, branco
- Preço: Fraunces 700, 48px
- Toggle anual: desconto aplicado nos preços (×0.8)

---

### 6.3 Calculadora de ROI

**Layout:** Seção interativa simples

**Título:** `Quanto você gasta hoje com comunicação?`

```
Número de alunos: [slider: 50 ─────●──── 1000]    287 alunos

Custo atual estimado:
📄 Circulares impressas:              R$ 145/mês
⏱ Horas de equipe em comunicação:    R$ 320/mês
📱 Retrabalho e falhas:              R$ 80/mês
─────────────────────────────────────
Total atual:                         R$ 545/mês

Com o Presente (Plano Escola):       R$ 449/mês

Você economiza R$ 96/mês · R$ 1.152/ano
```

**Especificação:**
- Seção background #F2EDE4
- Slider com thumb redondo, cor #7BAFD4
- Números animados ao mover o slider
- Destaque do "Você economiza" em verde #8DB5A0

---

### 6.4 FAQ de Preços (acordeão)

```
Q: Posso mudar de plano depois?
A: Sim. Upgrade ou downgrade a qualquer momento. O valor é ajustado proporcionalmente.

Q: O que acontece após os 30 dias grátis?
A: Você escolhe um plano e informa o pagamento. Se não fizer nada, sua conta entra em modo leitura por 7 dias.

Q: Como funciona a cobrança por aluno?
A: Você paga pelo número de alunos ativos no mês. Alunos transferidos ou formados saem da contagem automaticamente.

Q: Aceita quais formas de pagamento?
A: Cartão de crédito, boleto bancário e PIX. Planos anuais com desconto de 20%.

Q: Preciso de contrato de fidelidade?
A: Não. Cancele quando quiser, sem multa.

Q: Os responsáveis pagam alguma coisa?
A: Nunca. O Presente é sempre gratuito para os responsáveis.
```

---

### 6.5 CTA Preços

```
Ainda com dúvidas?
Fale com a gente antes de decidir.

[Agendar demonstração]    [Falar no WhatsApp]
```

---

## 7. Página Checkout (`/checkout`)

**⚠️ TUDO FAKE — apenas visual e estados de UI**

**Objetivo:** Simular o fluxo completo de contratação de um plano.

**Comportamento:**
```
- Formulários preenchíveis visualmente mas sem submissão real
- Botão final mostra estado de "Processando..." por 2 segundos
- Redireciona para página de sucesso fake
- Não integrar com nenhum gateway de pagamento
- Comentar no código: // TODO: integrar com gateway de pagamento
```

---

### 7.1 Layout do Checkout

**Layout:** 2 colunas — esquerda formulário (60%), direita resumo do pedido (40%)

**Header do checkout:**
```
[Logo Presente]          Compra segura 🔒          [Precisa de ajuda?]
```

**Barra de progresso (3 etapas):**
```
① Dados da escola  →  ② Pagamento  →  ③ Confirmação
```

---

### 7.2 Etapa 1 — Dados da Escola

**Formulário esquerda:**

```
Dados da escola

Nome da escola *
[_________________________________]

CNPJ (opcional)
[_________________________________]

Nome do responsável *
[_________________________________]

E-mail institucional *
[_________________________________]

Telefone *
[_________________________________]

Número de alunos *
[○ Até 100   ○ 101-400   ○ 401-1000]

Cidade / Estado *
[_________________________________]

[Continuar para pagamento →]
```

**Resumo direita (sticky):**

```
┌─────────────────────────────────┐
│ Resumo do pedido                │
│                                 │
│ Plano Escola                    │
│ Até 400 alunos · Mensal         │
│                                 │
│ Subtotal:           R$ 449,00   │
│ Desconto trial:     R$ 0,00     │
│ ─────────────────────────────   │
│ Total hoje:         R$ 0,00     │
│                                 │
│ ⚡ 30 dias grátis               │
│ Primeiro pagamento em:          │
│ 13/05/2026                      │
│                                 │
│ 🔒 Pagamento 100% seguro        │
│ ✓ Cancele quando quiser         │
│ ✓ Sem fidelidade                │
└─────────────────────────────────┘
```

---

### 7.3 Etapa 2 — Pagamento

**Tabs de forma de pagamento:**
```
[💳 Cartão] [📋 Boleto] [⚡ PIX]
```

**Tab Cartão:**
```
Dados do cartão

Número do cartão *
[____ ____ ____ ____]     [ícones Visa/Master/Elo]

Nome no cartão *
[_________________________________]

Validade *          CVV *
[__/____]           [___]

[  ] Salvar cartão para futuras compras

[Finalizar assinatura →]
```

**Tab Boleto:**
```
Um boleto será gerado após a confirmação.
Vencimento: 3 dias úteis.

Nome completo *
[_________________________________]

CPF / CNPJ *
[_________________________________]

[Gerar boleto →]
```

**Tab PIX:**
```
Pague com PIX e sua conta é ativada
em até 5 minutos.

[QR Code placeholder — 200x200px]

Chave PIX: presente@pagamento.com.br

[Copiar chave PIX]

[Já paguei →]
```

**Especificação visual:**
- Input de cartão: máscara automática visual (fake)
- Validação visual: border verde quando "preenchido corretamente"
- Ícones de bandeira aparecem ao digitar
- Botão "Finalizar": pill, #7BAFD4, 100% width, 56px height
- Lacre de segurança no rodapé: "Pagamento processado com criptografia SSL"

---

### 7.4 Estado de Processamento (fake)

**Ao clicar em "Finalizar assinatura":**

```
[Animação de loading — spinner suave em #7BAFD4]

Processando sua assinatura...

(2 segundos de delay)
```

---

### 7.5 Etapa 3 — Confirmação (Sucesso)

**Layout:** Centralizado, celebrativo mas sóbrio

```
✅

Bem-vinda ao Presente!

Sua escola está configurada.
Você receberá um e-mail com os próximos passos.

────────────────────────────────────

O que acontece agora:

① Em 5 minutos
   Você recebe o e-mail de boas-vindas
   com suas credenciais de acesso.

② Nos próximos 40 minutos
   Importe seus alunos e configure
   sua primeira turma.

③ Ainda hoje
   Envie seu primeiro comunicado
   e convide os responsáveis.

────────────────────────────────────

[Acessar minha conta →]    [Ver tutorial de início]
```

**Especificação:**
- Ícone de sucesso: check circle animado (stroke animation)
- Cor: #8DB5A0
- Background: #FAFAF8

---

## 8. Página Contato e FAQ (`/contato`)

---

### 8.1 Hero Contato

```
Como podemos ajudar?

Fale com nossa equipe ou encontre
a resposta que procura.
```

---

### 8.2 Cards de Contato

**Layout:** 3 cards lado a lado

```
Card 1: 💬 Chat / WhatsApp
Resposta em minutos
(horário comercial)

[Abrir WhatsApp →]

Card 2: 📧 E-mail
suporte@presente.com.br
Resposta em até 8h úteis

[Enviar e-mail →]

Card 3: 📅 Demo
Agende uma demonstração
gratuita de 30 minutos

[Agendar demo →]
```

---

### 8.3 Formulário de Contato

**Layout:** 2 colunas — esquerda formulário, direita informações

**Formulário:**

```
Nome completo *
[_________________________________]

E-mail *
[_________________________________]

Escola *
[_________________________________]

Número de alunos
[○ Até 100  ○ 101-400  ○ 401-1000  ○ Acima de 1000]

Assunto
[○ Quero conhecer o Presente
 ○ Já sou cliente — preciso de suporte
 ○ Dúvida sobre preços
 ○ Outro]

Mensagem *
[_________________________________]
[_________________________________]
[_________________________________]

[Enviar mensagem →]
```

**Lado direito — informações:**

```
Atendimento

Segunda a sexta
9h às 18h (horário de Brasília)

suporte@presente.com.br
(21) 9 0000-0000

─────────────────────

Sede
Rio de Janeiro, RJ — Brasil

─────────────────────

Tempo médio de resposta
< 4 horas úteis
```

---

### 8.4 FAQ Completo (acordeão)

**Categorias com acordeão por categoria:**

```
GERAL
▼ O que é o Presente?
▼ Para que tipo de escola o Presente foi criado?
▼ O Presente substitui o sistema de gestão escolar (ERP)?
▼ Preciso de infraestrutura técnica para usar?

FUNCIONALIDADES
▼ Como funciona a confirmação de leitura?
▼ O que é o modo "Autorização" em um comunicado?
▼ Os responsáveis podem enviar mensagens para a escola?
▼ Como funciona a importação de alunos?
▼ O app funciona sem internet?
▼ Quantos responsáveis posso vincular por aluno?

SEGURANÇA E PRIVACIDADE
▼ O Presente está em conformidade com a LGPD?
▼ Onde os dados são armazenados?
▼ Os dados dos alunos são compartilhados com terceiros?
▼ Como revogar o acesso de um responsável?

PREÇOS E PLANOS
▼ Como funciona o período de 30 dias grátis?
▼ Posso mudar de plano a qualquer momento?
▼ Os responsáveis pagam alguma coisa?
▼ Quais formas de pagamento são aceitas?
▼ Existe contrato de fidelidade?

IMPLEMENTAÇÃO
▼ Quanto tempo leva para configurar o Presente?
▼ Preciso de treinamento para usar?
▼ Como faço a importação dos meus alunos?
▼ E se minha escola já usa outro sistema?
```

**Especificação do acordeão:**
- Borda: 1px #E0D8CC
- Ícone: ChevronDown, rotaciona 180deg ao abrir
- Animação: height transition suave (300ms)
- Pergunta ativa: cor #3D5166, bold
- Resposta: DM Sans 400, 15px, #6B8299, padding 16px 0

---

### 8.5 CTA Contato

```
Ainda tem dúvidas?
Nossa equipe responde em menos de 4 horas.

[Falar com especialista →]
```

---

## 9. Animações e Interações

### Scroll Animations (Framer Motion)

```javascript
// Padrão para todas as seções ao scrollar
const fadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
  }
}

// Uso com viewport trigger
<motion.div
  variants={fadeUpVariants}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, margin: "-80px" }}
>
```

### Stagger para listas de cards

```javascript
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 }
  }
}
```

### Hover em cards

```css
.card {
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(61, 81, 102, 0.12);
  border-color: #7BAFD4;
}
```

### Float animation (mockup do celular)

```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
}
.phone-mockup {
  animation: float 4s ease-in-out infinite;
}
```

---

## 10. Responsividade

### Breakpoints

```css
sm:  640px   /* Tablet pequeno */
md:  768px   /* Tablet */
lg:  1024px  /* Desktop pequeno */
xl:  1280px  /* Desktop */
2xl: 1536px  /* Desktop grande */
```

### Regras Gerais

```
Desktop (lg+):
  - Grid 2-3 colunas
  - Navbar horizontal completa
  - Hero com elemento visual à direita
  - Cards pricing lado a lado
  - Checkout 2 colunas

Tablet (md):
  - Grid 2 colunas
  - Navbar com links e CTA
  - Cards pricing 2+1 ou scroll horizontal

Mobile (sm e abaixo):
  - Grid 1 coluna
  - Hamburger menu
  - Hero empilhado verticalmente
  - Cards pricing em carrossel horizontal
  - Checkout coluna única (resumo colapsável no topo)
  - FAQ acordeão full-width
```

---

## 11. SEO e Metadados

```typescript
// app/layout.tsx
export const metadata = {
  title: {
    template: '%s | Presente',
    default: 'Presente — Escola e família, sempre conectadas'
  },
  description: 'Plataforma de comunicação oficial entre escola e família. Substitua o WhatsApp por um canal profissional com confirmação de leitura, agenda e formulários integrados.',
  keywords: ['comunicação escolar', 'app escola família', 'aviso escolar', 'agenda escolar digital'],
  openGraph: {
    title: 'Presente — Escola e família, sempre conectadas',
    description: 'Comunicação escola-família profissional, rastreável e sem WhatsApp.',
    url: 'https://presente.com.br',
    siteName: 'Presente',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Presente',
    description: 'Comunicação escola-família profissional.',
  }
}

// Por página:
// /produto    → "Funcionalidades | Presente"
// /precos     → "Planos e Preços | Presente"
// /contato    → "Contato e FAQ | Presente"
// /checkout   → "Assinar | Presente"
```

---

## 12. Performance

```
✅ Next.js Image (next/image) para todas as imagens
✅ Lazy loading em seções abaixo do fold
✅ Font display: swap para Google Fonts
✅ Componentes de animação carregados com dynamic import
✅ Lighthouse score alvo: 90+ em todas as métricas
✅ Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
```

---

## 13. Dependências do Site

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.383.0",
    "tailwindcss": "^3.0.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

---

## 14. Checklist de Entrega

```
□ Todas as 5 páginas implementadas e responsivas
□ Navbar com scroll behavior
□ Footer completo
□ Animações de scroll em todas as seções
□ Toggle mensal/anual funcional nos preços
□ Calculadora de ROI com slider interativo
□ Checkout com 3 etapas e estados visuais
□ Estado de loading e sucesso no checkout
□ FAQ com acordeão animado
□ Formulário de contato com validação visual
□ SEO metadata em todas as páginas
□ Mobile responsivo testado em 375px, 768px, 1280px
□ Brand guide respeitado em 100% dos componentes
□ Sem cores, fontes ou componentes fora do brand guide
□ Comentários TODO onde há funcionalidade fake
□ Seção de funcionalidades implementada como componente
   dinâmico pronto para receber dados do PRD
```

---

## 15. Instrução Final para o Claude Code

```
Ordem de implementação recomendada:

Sprint 1: Fundação
  - Setup Next.js + Tailwind + Framer Motion
  - Tokens de design (CSS variables do brand guide)
  - Componentes base: Button, Badge, Card, Input
  - Navbar e Footer

Sprint 2: Home
  - Todas as seções da home em ordem
  - Animações de scroll
  - Responsividade mobile

Sprint 3: Produto e Preços
  - Página de produto com layout de features
  - Seção de comparação
  - Página de preços com cards e toggle
  - Calculadora de ROI

Sprint 4: Checkout e Contato
  - Fluxo de checkout 3 etapas (tudo fake)
  - Estados de loading e sucesso
  - Página de contato
  - FAQ com acordeão

IMPORTANTE:
- A seção de funcionalidades (/produto) deve ser implementada
  como componente que recebe dados via props/array
  para facilitar atualização conforme o PRD evolui
- Todo formulário deve ter validação visual mas sem submissão real
- Checkout: comentar claramente // TODO: integrar pagamento
- Usar o brand guide (presente-brand-guide.md) como lei
```

# Presente — Brand Guide
# Guia de Identidade Visual Oficial
# Versão 1.0 — Para uso no desenvolvimento do app

---

## 1. Sobre a Marca

**Nome:** Presente  
**Tagline:** Escola e família, sempre conectadas.  
**Conceito:** A escola abraçando a família. O P da logo representa uma escola (haste vertical = prédio com telhado) cujo arco envolve e protege figuras familiares dentro — presença, cuidado e comunicação em uma única forma.

---

## 2. Paleta de Cores

### Cores Primárias

```css
/* PRIMARY — Dusty Steel Blue */
--color-primary:        #7BAFD4;  /* Escola, ações principais, P stem */
--color-primary-dark:   #5A96BE;  /* Hover, pressed states */
--color-primary-light:  #A8CAE0;  /* Backgrounds suaves, badges */
--color-primary-pale:   #EBF4FA;  /* Card backgrounds, highlights */

/* SECONDARY — Muted Sage Green */
--color-secondary:      #8DB5A0;  /* Abraço, sucesso, elementos de suporte */
--color-secondary-dark: #6E9B87;  /* Hover em elementos secundários */
--color-secondary-light:#B3CEC3;  /* Dividers, bordas suaves */
--color-secondary-pale: #EDF5F1;  /* Success backgrounds */

/* NEUTRAL WARM — Cream */
--color-cream:          #F2EDE4;  /* Família, fundo de cards, neutral */
--color-cream-dark:     #E0D8CC;  /* Bordas, separadores */

/* DARK TEXT — Deep Slate */
--color-text-primary:   #3D5166;  /* Textos principais */
--color-text-secondary: #6B8299;  /* Textos secundários, labels */
--color-text-muted:     #9AAFC0;  /* Placeholders, textos desabilitados */

/* ACCENT — Pale Teal */
--color-accent:         #A8C9C0;  /* Highlights, links, interactive */

/* BACKGROUND */
--color-bg-app:         #FAFAF8;  /* Background geral do app */
--color-bg-card:        #FFFFFF;  /* Cards e modais */
--color-bg-overlay:     rgba(61, 81, 102, 0.4); /* Overlays e modais */
```

### Cores de Estado

```css
/* SUCCESS */
--color-success:        #8DB5A0;  /* Same as secondary — sage green */
--color-success-bg:     #EDF5F1;
--color-success-text:   #4A7A63;

/* ERROR */
--color-error:          #C4826A;  /* Muted terracotta — never harsh red */
--color-error-bg:       #FAF0EC;
--color-error-text:     #8B4D35;

/* WARNING */
--color-warning:        #D4A96A;  /* Warm amber — muted */
--color-warning-bg:     #FDF6EC;
--color-warning-text:   #8B6035;

/* INFO */
--color-info:           #7BAFD4;  /* Same as primary */
--color-info-bg:        #EBF4FA;
--color-info-text:      #3D5166;
```

### Uso por Contexto

| Contexto | Cor |
|---|---|
| Botão primário | `#7BAFD4` |
| Botão secundário | `#8DB5A0` |
| Link / interativo | `#7BAFD4` |
| Texto principal | `#3D5166` |
| Texto secundário | `#6B8299` |
| Background app | `#FAFAF8` |
| Card background | `#FFFFFF` |
| Borda de card | `#E0D8CC` |
| Success | `#8DB5A0` |
| Error | `#C4826A` |
| Badge não lido | `#7BAFD4` bg, `#FFFFFF` text |
| Urgente | `#C4826A` bg, `#FFFFFF` text |

---

## 3. Tipografia

### Fontes

```css
/* DISPLAY — Headlines emocionais, momentos de marca */
font-family: 'Fraunces', 'Playfair Display', Georgia, serif;
/* Usar em: títulos de onboarding, taglines, nome da escola no header */
/* Peso: 300 (light italic) para emoção, 700 para impacto */

/* UI — Toda a interface */
font-family: 'DM Sans', 'Plus Jakarta Sans', -apple-system, sans-serif;
/* Usar em: tudo que é interface — botões, labels, body, nav */
/* Pesos disponíveis: 300, 400, 500, 600, 700 */
```

### Google Fonts import

```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,700;1,300;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Escala Tipográfica

```css
/* DISPLAY */
--text-display-xl: 48px;  /* Fraunces italic 300 — Onboarding hero */
--text-display-lg: 36px;  /* Fraunces italic 300 — Títulos de seção */
--text-display-md: 28px;  /* Fraunces 700 — Page titles */

/* UI HEADINGS */
--text-h1:  24px;  /* DM Sans 700 */
--text-h2:  20px;  /* DM Sans 700 */
--text-h3:  17px;  /* DM Sans 600 */
--text-h4:  15px;  /* DM Sans 600 */

/* BODY */
--text-body-lg:  16px;  /* DM Sans 400 — Body principal */
--text-body-md:  14px;  /* DM Sans 400 — Corpo padrão */
--text-body-sm:  13px;  /* DM Sans 400 — Secundário */

/* LABELS E BADGES */
--text-label-lg: 12px;  /* DM Sans 600 uppercase, letter-spacing 0.08em */
--text-label-md: 11px;  /* DM Sans 600 uppercase, letter-spacing 0.10em */
--text-label-sm: 10px;  /* DM Sans 700 uppercase, letter-spacing 0.12em */

/* CAPTION */
--text-caption: 11px;   /* DM Sans 400 — Timestamps, metadados */
--text-micro:   10px;   /* DM Sans 500 — Extremamente pequeno */
```

### Line Height

```css
--leading-tight:  1.2;   /* Headlines */
--leading-snug:   1.35;  /* Subheadings */
--leading-normal: 1.5;   /* Body text */
--leading-relaxed:1.65;  /* Long-form text */
```

---

## 4. Espaçamento

```css
/* ESCALA BASE: 4px */
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
```

---

## 5. Border Radius

```css
/* Tudo é arredondado — nunca cantos a 90 graus */
--radius-sm:   6px;   /* Badges, chips pequenos */
--radius-md:   10px;  /* Cards, inputs, botões pequenos */
--radius-lg:   14px;  /* Cards grandes, modais */
--radius-xl:   20px;  /* Botões principais, containers */
--radius-pill: 9999px; /* Botões full-round, tags */
--radius-icon: 12px;  /* App icons, avatar */
```

---

## 6. Sombras

```css
/* Sombras suaves — nunca duras ou escuras */
--shadow-xs: 0 1px 2px rgba(61, 81, 102, 0.06);
--shadow-sm: 0 2px 6px rgba(61, 81, 102, 0.08);
--shadow-md: 0 4px 16px rgba(61, 81, 102, 0.10);
--shadow-lg: 0 8px 32px rgba(61, 81, 102, 0.12);
--shadow-xl: 0 16px 48px rgba(61, 81, 102, 0.14);

/* Para cards e componentes flutuantes */
--shadow-card:   0 2px 8px rgba(61, 81, 102, 0.08), 0 1px 2px rgba(61, 81, 102, 0.04);
--shadow-modal:  0 8px 32px rgba(61, 81, 102, 0.16), 0 2px 8px rgba(61, 81, 102, 0.08);
--shadow-button: 0 2px 8px rgba(123, 175, 212, 0.30);  /* Primary button glow */
```

---

## 7. Componentes de UI

### Botões

```css
/* PRIMARY BUTTON */
.btn-primary {
  background: #7BAFD4;
  color: #FFFFFF;
  border-radius: 9999px;        /* Pill shape */
  padding: 12px 24px;
  font-family: 'DM Sans';
  font-size: 15px;
  font-weight: 600;
  border: none;
  box-shadow: 0 2px 8px rgba(123, 175, 212, 0.30);
  transition: all 0.15s ease;
}

.btn-primary:hover {
  background: #5A96BE;
  box-shadow: 0 4px 16px rgba(123, 175, 212, 0.40);
  transform: translateY(-1px);
}

.btn-primary:active {
  background: #4A87AF;
  transform: translateY(0);
  box-shadow: none;
}

/* SECONDARY BUTTON */
.btn-secondary {
  background: #EDF5F1;
  color: #4A7A63;
  border-radius: 9999px;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  border: 1.5px solid #8DB5A0;
}

.btn-secondary:hover {
  background: #D5EAE2;
}

/* GHOST BUTTON */
.btn-ghost {
  background: transparent;
  color: #7BAFD4;
  border-radius: 9999px;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  border: 1.5px solid #7BAFD4;
}

/* DANGER BUTTON */
.btn-danger {
  background: #FAF0EC;
  color: #8B4D35;
  border-radius: 9999px;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  border: 1.5px solid #C4826A;
}
```

### Cards

```css
.card {
  background: #FFFFFF;
  border-radius: 14px;
  border: 1px solid #E0D8CC;
  box-shadow: 0 2px 8px rgba(61, 81, 102, 0.08);
  padding: 18px 20px;
}

/* Card com acento colorido (comunicados) */
.card-accent-primary { border-left: 3px solid #7BAFD4; }
.card-accent-secondary { border-left: 3px solid #8DB5A0; }
.card-accent-error { border-left: 3px solid #C4826A; }

/* Card de comunicado não lido */
.card-unread {
  border-left: 3px solid #7BAFD4;
  background: #F5F9FD;
}
```

### Inputs

```css
.input {
  background: #FFFFFF;
  border: 1.5px solid #E0D8CC;
  border-radius: 10px;
  padding: 12px 14px;
  font-family: 'DM Sans';
  font-size: 15px;
  color: #3D5166;
  width: 100%;
  transition: border-color 0.15s ease;
}

.input::placeholder {
  color: #9AAFC0;
}

.input:focus {
  outline: none;
  border-color: #7BAFD4;
  box-shadow: 0 0 0 3px rgba(123, 175, 212, 0.15);
}

.input:disabled {
  background: #F5F5F3;
  color: #9AAFC0;
  cursor: not-allowed;
}
```

### Badges e Pills

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.badge-primary   { background: #EBF4FA; color: #3D7FAA; }
.badge-secondary { background: #EDF5F1; color: #4A7A63; }
.badge-error     { background: #FAF0EC; color: #8B4D35; }
.badge-warning   { background: #FDF6EC; color: #8B6035; }
.badge-neutral   { background: #F2EDE4; color: #6B8299; }

/* Badge de contagem não lida */
.badge-unread {
  background: #7BAFD4;
  color: #FFFFFF;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 700;
}
```

### Toggle / Switch

```css
.toggle {
  width: 44px;
  height: 24px;
  background: #E0D8CC;
  border-radius: 9999px;
  position: relative;
  transition: background 0.2s ease;
  cursor: pointer;
}

.toggle.active { background: #7BAFD4; }

.toggle-thumb {
  width: 20px;
  height: 20px;
  background: #FFFFFF;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.toggle.active .toggle-thumb { transform: translateX(20px); }
```

### Bottom Navigation (Mobile)

```css
.bottom-nav {
  background: #FFFFFF;
  border-top: 1px solid #E0D8CC;
  display: flex;
  padding: 8px 0 env(safe-area-inset-bottom, 16px);
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 600;
  color: #9AAFC0;
  letter-spacing: 0.04em;
}

.bottom-nav-item.active { color: #7BAFD4; }

.bottom-nav-icon {
  width: 24px;
  height: 24px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
```

---

## 8. Ícones

### Estilo de Ícones

```
Estilo: Single-stroke, rounded caps e joins
Stroke width: 1.8px (pequeno), 2px (médio), 2.2px (grande)
Cor padrão: #6B8299 (muted) — ativo: #7BAFD4 (primary)
Tamanhos: 16px, 20px, 24px, 28px, 32px
Pack recomendado: Lucide Icons (já disponível no projeto React)
Nunca usar ícones filled/solid — sempre outlined
```

### Ícones por Funcionalidade

```
Comunicados:    MessageSquare, Bell, Send, Inbox
Agenda:         Calendar, Clock, CalendarDays
Formulários:    FileText, ClipboardList, Upload
Responsável:    User, Users, Heart, Baby
Professor:      BookOpen, GraduationCap, Pencil
Escola:         Building2, Home, MapPin
Confirmação:    CheckCircle, Check, ShieldCheck
Urgente:        AlertCircle, Zap, AlertTriangle
Fotos:          Camera, Image, Images
Configurações:  Settings, Sliders, ChevronRight
Logout:         LogOut, ArrowLeft
```

### Mapeamento Categoria → Ícone + Cor

```
NOTICE       → MessageSquare  + #7BAFD4
URGENT       → AlertCircle    + #C4826A (error color)
INFORMATIVE  → Info           + #6B8299
DOCUMENT     → FileText       + #8DB5A0
PHOTO        → Camera         + #A8C9C0
EXAM         → BookOpen       + #D4A96A (warning)
MEETING      → Users          + #7BAFD4
AUTHORIZATION→ ShieldCheck    + #8DB5A0
```

---

## 9. Animações e Transições

```css
/* DURATIONS */
--duration-instant: 80ms;
--duration-fast:    150ms;
--duration-normal:  250ms;
--duration-slow:    400ms;

/* EASINGS */
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);   /* Material Standard */
--ease-enter:   cubic-bezier(0, 0, 0.2, 1);      /* Decelerate — elementos entrando */
--ease-exit:    cubic-bezier(0.4, 0, 1, 1);      /* Accelerate — elementos saindo */
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1); /* Spring — botões, feedback */

/* USO PADRÃO */
/* Hover states:         150ms ease-default */
/* Card hover:           200ms ease-default */
/* Modal open/close:     300ms ease-enter/exit */
/* Page transitions:     250ms ease-enter */
/* Micro-interactions:   150ms ease-spring */
```

---

## 10. Regras de Design

### O que SEMPRE fazer

```
✅ Cantos arredondados em tudo — nunca 90 graus
✅ Sombras suaves e quentes — nunca duras ou pretas
✅ Espaço generoso — padding mínimo de 16px em cards
✅ Hierarquia tipográfica clara — display serif para emoção, sans para interface
✅ Estados de loading/empty sempre pensados — nunca telas em branco
✅ Feedback visual em toda interação — hover, active, focus
✅ Cores de estado sempre em versão suave (bg + text)
✅ Ícones always outlined, never filled
```

### O que NUNCA fazer

```
❌ Cantos a 90 graus
❌ Cores saturadas ou "neon"
❌ Preto puro (#000000) — usar #3D5166
❌ Branco puro para backgrounds — usar #FAFAF8
❌ Vermelho puro para erros — usar #C4826A
❌ Sombras duras ou escuras
❌ Ícones filled/solid
❌ Texto em caixa alta desnecessariamente (só labels e badges)
❌ Gradientes com contraste alto
❌ Borders de 1px sem cor suave
❌ Fonte menor que 10px
❌ Contraste de cor inferior ao WCAG AA
```

---

## 11. Tom de Voz

```
PERSONALIDADE DA MARCA:
Como uma boa diretora de escola — séria quando necessário,
mas sempre humana e acolhedora.

PALAVRAS QUE DEFINEM O TOM:
Presente, próximo, claro, confiável, cuidadoso, profissional, humano

EXEMPLOS DE COPY:
✅ "Escola e família, sempre conectadas."
✅ "Você foi avisado. Sem dúvidas."
✅ "Tudo que acontece na escola, você acompanha."
✅ "Li e estou ciente" — ação de confirmação
✅ "Nenhum aviso por enquanto. Fique tranquilo."

❌ "Turbine sua comunicação!" — muito startup
❌ "Woohoo! Tudo certo!" — muito infantil
❌ "Erro ao processar sua solicitação." — muito técnico
✅ "Algo deu errado. Tente novamente em alguns instantes."
```

---

## 12. Tokens CSS Completos (para usar no projeto)

```css
:root {
  /* COLORS */
  --color-primary:          #7BAFD4;
  --color-primary-dark:     #5A96BE;
  --color-primary-light:    #A8CAE0;
  --color-primary-pale:     #EBF4FA;
  --color-secondary:        #8DB5A0;
  --color-secondary-dark:   #6E9B87;
  --color-secondary-light:  #B3CEC3;
  --color-secondary-pale:   #EDF5F1;
  --color-cream:            #F2EDE4;
  --color-cream-dark:       #E0D8CC;
  --color-accent:           #A8C9C0;
  --color-text-primary:     #3D5166;
  --color-text-secondary:   #6B8299;
  --color-text-muted:       #9AAFC0;
  --color-bg-app:           #FAFAF8;
  --color-bg-card:          #FFFFFF;
  --color-success:          #8DB5A0;
  --color-success-bg:       #EDF5F1;
  --color-success-text:     #4A7A63;
  --color-error:            #C4826A;
  --color-error-bg:         #FAF0EC;
  --color-error-text:       #8B4D35;
  --color-warning:          #D4A96A;
  --color-warning-bg:       #FDF6EC;
  --color-warning-text:     #8B6035;

  /* TYPOGRAPHY */
  --font-display: 'Fraunces', 'Playfair Display', Georgia, serif;
  --font-ui:      'DM Sans', 'Plus Jakarta Sans', -apple-system, sans-serif;
  --text-display-xl: 48px;
  --text-display-lg: 36px;
  --text-display-md: 28px;
  --text-h1:  24px;
  --text-h2:  20px;
  --text-h3:  17px;
  --text-h4:  15px;
  --text-body-lg:  16px;
  --text-body-md:  14px;
  --text-body-sm:  13px;
  --text-label-lg: 12px;
  --text-label-md: 11px;
  --text-caption:  11px;

  /* SPACING */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* RADIUS */
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   14px;
  --radius-xl:   20px;
  --radius-pill: 9999px;
  --radius-icon: 12px;

  /* SHADOWS */
  --shadow-xs:     0 1px 2px rgba(61, 81, 102, 0.06);
  --shadow-sm:     0 2px 6px rgba(61, 81, 102, 0.08);
  --shadow-md:     0 4px 16px rgba(61, 81, 102, 0.10);
  --shadow-lg:     0 8px 32px rgba(61, 81, 102, 0.12);
  --shadow-card:   0 2px 8px rgba(61, 81, 102, 0.08), 0 1px 2px rgba(61, 81, 102, 0.04);
  --shadow-modal:  0 8px 32px rgba(61, 81, 102, 0.16);
  --shadow-button: 0 2px 8px rgba(123, 175, 212, 0.30);

  /* TRANSITIONS */
  --duration-fast:   150ms;
  --duration-normal: 250ms;
  --duration-slow:   400ms;
  --ease-default:    cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## 13. Tailwind Config (se usar Tailwind no projeto)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: '#7BAFD4', dark: '#5A96BE', light: '#A8CAE0', pale: '#EBF4FA' },
        secondary: { DEFAULT: '#8DB5A0', dark: '#6E9B87', light: '#B3CEC3', pale: '#EDF5F1' },
        cream:     { DEFAULT: '#F2EDE4', dark: '#E0D8CC' },
        accent:    '#A8C9C0',
        slate:     { DEFAULT: '#3D5166', mid: '#6B8299', muted: '#9AAFC0' },
        success:   { DEFAULT: '#8DB5A0', bg: '#EDF5F1', text: '#4A7A63' },
        error:     { DEFAULT: '#C4826A', bg: '#FAF0EC', text: '#8B4D35' },
        warning:   { DEFAULT: '#D4A96A', bg: '#FDF6EC', text: '#8B6035' },
      },
      fontFamily: {
        display: ['Fraunces', 'Playfair Display', 'Georgia', 'serif'],
        sans:    ['DM Sans', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'sm':   '6px',
        'md':   '10px',
        'lg':   '14px',
        'xl':   '20px',
        'pill': '9999px',
        'icon': '12px',
      },
      boxShadow: {
        'card':   '0 2px 8px rgba(61, 81, 102, 0.08), 0 1px 2px rgba(61, 81, 102, 0.04)',
        'modal':  '0 8px 32px rgba(61, 81, 102, 0.16)',
        'button': '0 2px 8px rgba(123, 175, 212, 0.30)',
      },
    },
  },
}
```

---

## 14. React Native StyleSheet Base

```javascript
// theme.ts
export const theme = {
  colors: {
    primary:        '#7BAFD4',
    primaryDark:    '#5A96BE',
    primaryLight:   '#A8CAE0',
    primaryPale:    '#EBF4FA',
    secondary:      '#8DB5A0',
    secondaryDark:  '#6E9B87',
    secondaryPale:  '#EDF5F1',
    cream:          '#F2EDE4',
    creamDark:      '#E0D8CC',
    accent:         '#A8C9C0',
    textPrimary:    '#3D5166',
    textSecondary:  '#6B8299',
    textMuted:      '#9AAFC0',
    bgApp:          '#FAFAF8',
    bgCard:         '#FFFFFF',
    success:        '#8DB5A0',
    successBg:      '#EDF5F1',
    successText:    '#4A7A63',
    error:          '#C4826A',
    errorBg:        '#FAF0EC',
    errorText:      '#8B4D35',
    warning:        '#D4A96A',
    warningBg:      '#FDF6EC',
  },
  fonts: {
    display: 'Fraunces-Italic',
    displayBold: 'Fraunces-Bold',
    sans: 'DMSans-Regular',
    sansMedium: 'DMSans-Medium',
    sansSemiBold: 'DMSans-SemiBold',
    sansBold: 'DMSans-Bold',
  },
  spacing: {
    1: 4, 2: 8, 3: 12, 4: 16, 5: 20,
    6: 24, 8: 32, 10: 40, 12: 48, 16: 64,
  },
  radius: {
    sm: 6, md: 10, lg: 14, xl: 20, pill: 9999, icon: 12,
  },
  shadow: {
    card: {
      shadowColor: '#3D5166',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    modal: {
      shadowColor: '#3D5166',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 32,
      elevation: 8,
    },
  },
} as const;

export type Theme = typeof theme;
```

---

## 15. Instruções para o Claude Code

```
INSTRUÇÃO IMPORTANTE — Leia antes de escrever qualquer linha de UI:

1. NUNCA usar cores fora da paleta definida acima
2. NUNCA usar border-radius abaixo de 6px
3. NUNCA usar preto puro (#000) — sempre #3D5166
4. NUNCA usar vermelho puro para erros — sempre #C4826A
5. SEMPRE importar DM Sans e Fraunces do Google Fonts
6. SEMPRE usar os CSS custom properties definidos na seção 12
7. Ícones: usar Lucide Icons, sempre outlined, stroke-width 1.8-2px
8. Botões primários: sempre pill shape (border-radius: 9999px)
9. Cards: sempre border-radius 14px + shadow-card + border 1px #E0D8CC
10. Inputs: sempre border-radius 10px + focus ring #7BAFD4 com 15% opacity
11. Bottom nav mobile: sempre com safe-area-inset-bottom
12. Feedback de toque: sempre implementar pressed state com opacity 0.85

O produto se chama PRESENTE. A marca transmite:
calor humano, confiança institucional, proximidade e cuidado.
Nunca parecer startup agressiva. Nunca parecer app infantil.
Sempre: uma boa diretora de escola — séria quando necessário, humana sempre.
```

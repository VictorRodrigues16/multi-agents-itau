# Identidade visual Itaú — agent-itau

Paleta baseada no manual de marca público do Itaú. Combina laranja vibrante (primária), azul institucional, amarelo quente e bege.

## Cores primárias

| Token | Hex | Uso |
|-------|-----|-----|
| `--itau-orange` | `#EC7000` | Cor primária, CTAs, headers, destaque |
| `--itau-orange-dark` | `#C75300` | Hover, active, headings em destaque |
| `--itau-orange-vibrant` | `#FF8410` | Acentos especiais, gradient highlight |
| `--itau-orange-soft` | `#FFB068` | Tints secundários |
| `--itau-orange-light` | `#FFE8D2` | Background suave |
| `--itau-orange-50` | `#FFF6EC` | Background mais sutil |

## Azul Itaú (institucional)

| Token | Hex | Uso |
|-------|-----|-----|
| `--itau-blue` | `#003C8F` | Cor institucional, blocos formais, capa |
| `--itau-blue-dark` | `#002A66` | Variante escura |
| `--itau-blue-light` | `#1E5BB8` | Variante clara, links |
| `--itau-blue-soft` | `#E5EEFA` | Background azul muito sutil |

## Amarelo Itaú

| Token | Hex | Uso |
|-------|-----|-----|
| `--itau-yellow` | `#F8C300` | Destaques, warnings, badges quentes |
| `--itau-yellow-soft` | `#FFF4C2` | Background amarelo claro |

## Vermelho Itaú

| Token | Hex | Uso |
|-------|-----|-----|
| `--itau-red` | `#DA3127` | Alertas, erros, FAIL |
| `--itau-red-soft` | `#FBE3E1` | Background vermelho claro |

## Neutros (bege quente, em vez de cinza frio)

| Token | Hex | Uso |
|-------|-----|-----|
| `--bg-paper` | `#FBF6EE` | Background do PDF (papel quente, não branco) |
| `--bg-warm` | `#F4ECE3` | Bege institucional Itaú |
| `--bg-warm-deep` | `#E8DCC9` | Bege com mais peso |
| `--itau-black` | `#1A1A1A` | Texto principal |
| `--itau-white` | `#FFFFFF` | Background sobre cor |
| `--gray-50` | `#F7F4EE` | Cinza quente claro |
| `--gray-100` | `#EDE7DD` | Cinza quente |
| `--gray-200` | `#D9CFC1` | Bordas |
| `--gray-300` | `#B0A89A` | Bordas com mais peso |
| `--gray-500` | `#6E665A` | Texto secundário |
| `--gray-700` | `#3D3830` | Texto enfase |

## Cores funcionais

| Token | Hex | Uso |
|-------|-----|-----|
| `--success` | `#2D9D78` | Sucesso, aprovado, PASS |
| `--success-bg` | `#DCEDE3` | Background sucesso |
| `--warning` | `#F8C300` | Aviso, WARN (amarelo Itaú) |
| `--warning-bg` | `#FFF4C2` | Background aviso |
| `--error` | `#DA3127` | Erro, FAIL, bloqueante (vermelho Itaú) |
| `--error-bg` | `#FBE3E1` | Background erro |
| `--info` | `#003C8F` | Informativo (azul Itaú) |
| `--info-bg` | `#E5EEFA` | Background informativo |

## Tipografia

- **Fonte primária**: Inter, system-ui, sans-serif
- **Fallback web**: Helvetica Neue, Helvetica, Arial
- **Código**: JetBrains Mono, Menlo, Consolas

### Escalas

| Nível | Tamanho | Peso | Uso |
|-------|---------|------|-----|
| Display | 48px / 56px | 800 | Capa de relatório |
| H1 | 32px / 40px | 700 | Título de página |
| H2 | 24px / 32px | 600 | Seção |
| H3 | 18px / 28px | 600 | Subseção |
| Body | 14px / 22px | 400 | Texto corrido |
| Small | 12px / 18px | 400 | Caption, label |
| Mono | 13px / 20px | 400 | Código, IDs |

## Border radius

| Token | px | Uso |
|-------|-----|-----|
| `--radius-sm` | 4 | Inputs pequenos, badges |
| `--radius-md` | 8 | Cards, botões |
| `--radius-lg` | 12 | Cards grandes |
| `--radius-xl` | 16 | Modais |
| `--radius-pill` | 999 | Tags, chips |

## Sombras

```css
--shadow-sm: 0 1px 2px rgba(26, 26, 26, 0.08);
--shadow-md: 0 4px 12px rgba(26, 26, 26, 0.10);
--shadow-lg: 0 8px 24px rgba(26, 26, 26, 0.14);
--shadow-orange: 0 6px 16px rgba(236, 112, 0, 0.30);
--shadow-blue: 0 6px 16px rgba(0, 60, 143, 0.25);
```

## Regras de uso

1. **Laranja** é a cor de marca primária — use generosamente em headers, CTAs e destaques.
2. **Azul Itaú** é a institucional — use em blocos formais, sumários executivos e dados serios.
3. **Amarelo** é warm spot — use com parcimônia para chamar atenção (warning, score alto).
4. **Bege** substitui o branco como background neutro — dá calor sem sobrecarregar.
5. **Contraste mínimo** AA (WCAG): texto preto sobre branco/bege; texto branco sobre laranja-escuro/azul/preto.
6. **Logo** sempre em laranja sobre fundo claro, OU branco sobre fundo laranja/azul/preto.
7. **Combinação proibida**: vermelho + laranja muito próximos (use o vermelho APENAS para erro).

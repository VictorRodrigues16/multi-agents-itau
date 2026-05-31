# Testes — agent-itau

## Framework

- **Vue/Nuxt**: Vitest + @vue/test-utils
- **React/Next**: Vitest ou Jest + React Testing Library
- **NestJS**: Jest + Supertest
- **e2e**: Playwright (preferencial) ou Cypress

## Padrão obrigatorio

- Nomenclatura: `describe("NomeUnidade")` -> `it("should comportamento")` ou `it("deve comportamento")`
- Padrão AAA: Arrange -> Act -> Assert (separados por linha em branco)
- Cada teste testa UMA coisa
- Testes independentes (sem dependencia de ordem)
- Sem `setTimeout` ou `sleep` em testes (use mocks de timer)

## Cobertura mínima

| Tipo de codigo | Cobertura |
|----------------|-----------|
| Composables / Hooks / Services | 80%+ |
| Controllers / API routes | 70%+ |
| Componentes com lógica | 60%+ |
| Utils / funcoes puras | 90%+ |
| Componentes presentational | 30%+ (apenas snapshot e props) |

## Cenarios obrigatorios

- **Happy path** — caminho feliz com dados válidos
- **Edge cases** — null, undefined, array vazio, string vazia, limites numericos
- **Error cases** — API erro, timeout, dados invalidos, falha de rede
- **Permissoes** — quando aplicavel (usuario sem acesso, token expirado)

## Mocks

- `vi.mock()` para Vitest, `jest.mock()` para Jest
- NAO mockar demais — prefira testar comportamento real
- Mock apenas dependencias externas (APIs HTTP, banco, servicos de terceiros)
- Date.now / timers sempre mockados em testes que dependem de tempo

## Camadas de teste (piramide)

1. **Unitario** (base da piramide) — funcoes/classes isoladas, rápido, muitos
2. **Integração** — módulo + dependencias diretas (controller + service + mock de banco)
3. **e2e** (topo) — fluxos completos via UI ou API, poucos e criticos

## Proibido

- Testes que dependem de ordem de execução
- Testes que acessam rede/banco real (exceto e2e)
- `test.skip` ou `describe.skip` sem justificativa em comentario
- Snapshots gigantes (>100 linhas) — quebrar em testes específicos
- Asserts vazios (`expect(true).toBe(true)`)

## Convencoes de nomenclatura de arquivo

- Vitest/Jest: `*.spec.ts` ou `*.test.ts`
- e2e: `*.e2e.ts` ou em pasta `e2e/`
- Co-localizar testes com o codigo (ex: `useTransferencia.ts` + `useTransferencia.spec.ts` na mesma pasta)

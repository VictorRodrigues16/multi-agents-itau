# TypeScript Strict — agent-itau

## Proibido (zero tolerancia)

- `any` — use tipos específicos ou `unknown`
- `@ts-ignore` — corrija o erro de tipo
- `@ts-nocheck` — nunca desabilite checagem
- `as any` — use type assertion especifica ou type guard
- `var` — use `const` ou `let`

## Componentes Vue (se aplicavel)

- Sempre `<script setup lang="ts">`
- Props: `defineProps<T>()` com tipo explicito
- Emits: `defineEmits<T>()` com tipo explicito
- Componentes < 200 linhas (sugerir split se ultrapassar)

## Componentes React (se aplicavel)

- Componentes funcionais com hooks
- Props tipadas com interface dedicada
- Children tipados com `ReactNode`
- Sem `React.FC` (preferir tipagem direta de props)

## NestJS / backend (se aplicavel)

- DTOs com `class-validator` OU `zod`
- Exception filters para erros, nunca `throw` generico
- Guards para autorizacao
- DI via constructor
- Services finos, controllers magros, regra de negócio em use cases

## Geral

- Preferir `const` sobre `let`
- Nao deixar variáveis sem tipo quando o tipo nao e inferivel
- Imports com `import type` para tipos puros
- Funcoes < 50 linhas (sugerir split)
- Sem `console.log` em codigo de producao (use logger)
- Tratamento explicito de erros (try/catch com catch que age)

# Recuperação automática dos emails — plano de implementação

> Execução nesta conversa, pelo agente principal; revisão independente no fim.

**Objetivo:** recuperar emails persistidos sem depender de visitas ou da execução
do `after()`, preservando idempotência, ordem e limites do emissor #141.

**Arquitetura:** rota autenticada, sem cache, chamada uma vez por hora. Reutiliza
o emissor e a fila Postgres existentes. Não acrescenta fornecedor nem esquema.
O pedido do Tomás é implementar autonomamente; a ativação operacional e a
exceção à regra 6 ficam explícitas para revisão, sem mexer em produção aqui.

**Tecnologias:** Next.js 16, TypeScript, Vercel Cron, Neon HTTP, Vitest/PGlite.
**Contrato:** `docs/loja/pedidos.md` e `robustez.md`, secções do emissor.

## Decisões e alternativas

- Só `after()`/cache não recuperam a morte entre commit e agendamento.
- Despertadores duráveis externos exigem ainda resolver essa fronteira entre
  dois sistemas; acrescentá-los agora aumenta dependências e não elimina a
  necessidade de reconciliação. Ficam para quando a latência o justificar.
- Uma verificação horária é a proposta escolhida pelo implementador para este
  volume. É uma exceção operacional proposta: até 24 verificações
  por dia, mesmo vazias (duas consultas em cada execução vazia). Sem tráfego, cerca de duas horas acordada/dia se cada
  consulta causar cinco minutos de atividade; é uma estimativa, não medição.
- O primeiro envio continua a cargo do helper após commit, quando a compra/#139
  o ligarem. A recuperação pode acrescentar até cerca de uma hora a cada tentativa;
  2/4/8/16 minutos continuam mínimos, não promessas de cadência exata.
- A tarefa não cria lembretes nem expira pedidos; cadência e regras dessas
  operações continuam a exigir decisão própria. Pode recuperar os seus emails
  futuros depois de entrarem na mesma fila, sem distinguir o produtor.

## Limites e riscos a verificar

- Sem autorização, ativação explícita, BD, remetente ou chave, nenhuma consulta.
- Em modo de teste, até Production exige caixa de desvio válida.
- Não consultar a fila em Previews por agendamento, nem tratar uma cache como
  prova de que está vazia. Não usar o pedido HTTP para escolher BD/destinatário.
- No máximo 12 lotes de 10 e 180 s antes de iniciar outro lote; rota com 300 s.
  Uma falha interrompe novos lotes; não martelar fornecedor/BD numa só chamada.
- Reservas/idempotência/ordem são sempre as do adaptador real; nenhuma marca
  apagada. Uma morte deixa a reserva recuperável na chamada horária seguinte.
- Execuções sobrepostas não têm exclusão global: reservas protegem emails;
  429 continua recuperável. Falhas definitivas e as 24 h nunca são contornadas.
- Falha, bloqueio ou limite produz HTTP não bem-sucedido e resumo seguro, sem
  objetos de erro. Um monitor externo de ausência de execuções é condição da
  ativação para uso real; logs sozinhos não detetam uma tarefa que não correu.
- Não há garantia absoluta sob indisponibilidade prolongada. Cinco tentativas,
  quota ou janela expirada continuam a precisar de intervenção; documentar.

## Etapas

- [x] Testes primeiro para autenticação e configuração antes de efeitos, lotes,
  tempo monotónico, exceções e resultados HTTP; observar a falha inicial.
- [x] Implementar orquestração pura e rota com importação tardia do emissor.
- [x] Integração com PGlite/emissor real: 503, passagem de uma hora sem visitas,
  reserva abandonada, backlog superior a dez, esgotamento e janela de 24 h.
- [x] Configurar a expressão horária, variáveis de exemplo e runbook de ativação,
  monitorização, pausa, recuperação e rollback. Atualizar contratos no mesmo PR.
- [x] Executar lint/build/test numa cópia sem `.env`; revisão independente;
  corrigir achados; guardar commits sem atribuições a ferramentas.

## Critério de entrega

Branch normal, alterações e testes verificáveis, sem ligar a compra nem mudar
produção. Distinguir testes automáticos da prova real do agendamento: a Vercel
só agenda Cron em Production; esse ensaio controlado e o monitor têm de ser
confirmados antes de declarar a operação pronta para clientes.

## Registo de execução e revisão

- Implementados guardas HTTP, lotes limitados e leitura tardia dos dados.
- Revisão independente encontrou falso sucesso depois de falha terminal.
  Corrigido com leitura booleana SQL antes do limite, excluindo saltados e
  reservados ativos; testes de regressão viram falha antes da implementação.
- Acrescentada prova de que os guardas impedem a própria importação do módulo
  dos dados, não só a chamada do emissor.
- Decisão do implementador: verificação horária proposta, sujeita a revisão
  antes de integrar. Se a demora não servir, rever cadência/arquitetura.
- Os cenários novos de recuperação não fizeram envios reais nem consultaram
  a Neon; usam PGlite e HTTP Resend simulado. O build de Preview pode ler o
  catálogo da Neon desenvolvimento, como os builds normais do projeto.

## Verificações finais

- Cópia limpa em `/private/tmp/damira-recuperacao-emails`, sem ficheiros `.env`.
- `npm run lint`: passou.
- `npm run build` com Turbopack: passou, com `/api/tarefas/emails` dinâmica.
- `npm test`: 54 ficheiros, 1.274 passaram e 39 saltados.
- `tsc --noEmit`: passou, também incluído no build final.
- Revisão independente: um achado importante corrigido; nenhum minor adiado.
- A ativação na Vercel e o monitor externo continuam pendentes, não se inferem
  do sucesso dos testes. Não ligar a compra antes da confirmação operacional.

- Rota do build servida localmente sem configuração: HTTP 401 com
  `Cache-Control: no-store`, sem redirecionamento de idioma. Servidor parado
  após a verificação.

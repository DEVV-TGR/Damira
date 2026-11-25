# Textos legais — respostas da casa e revisão

Atualizado a 25/11/2026. Parte da #52 e do PR #136 (`feat/textos-legais`).
**São minutas para revisão. O PR continua em rascunho: a resposta da casa às
perguntas não substitui a aprovação da advogada nem a implementação das
garantias que os textos prometem.**

## Onde se completa cada resposta

Os comentários da Andreia de 16/11, na pergunta «RGPD: política de privacidade
e cookies», fecham os dados abaixo. A fonte é o
[Notion — Precisamos de vocês](https://app.notion.com/p/Precisamos-de-voc-s-3ee9f31cdeb881df8370efd06becb2f9).

| Resposta | Onde fica | Estado |
|---|---|---|
| NIPC **503600725** | «Quem vende» das condições e secção 1 da privacidade | Preenchido |
| Os preços já incluem IVA | «Preços» das condições | Confirmado; o texto já o dizia |
| `encomendas@damira.pt` existe e está operacional | Contactos das duas páginas | Confirmado; mantém-se o endereço |
| A casa assegura a limpeza dos emails e pretende automatizá-la | Secção 6 da privacidade | Responsabilidade registada; automação da caixa de correio ainda por comprovar |
| Dúvida sobre 30 dias para imagens e 12 meses para dados do cliente | Secção 6 e revisão da advogada | Mantidos como proposta; não aprovados nem alargados por nós |
| A advogada confirma a entidade de resolução de litígios; a Andreia menciona a ASAE como dúvida | Última secção das condições | CICAP mantido na minuta, por validar; não se substitui pela ASAE com base numa pergunta |
| Link do Livro de Reclamações no rodapé | `src/components/Rodape.tsx` | Já existe no PR, em todas as páginas; ainda não publicado |
| Texto completo ou link para enviar à advogada | As duas minutas abaixo | PDFs e cópias em Markdown gerados integralmente a 18/11, para entrega pelo Tomás |

As condições vivem em `src/lib/legal/condicoes.ts` e a privacidade em
`src/lib/legal/privacidade.ts`. São a fonte das páginas `/condicoes` e
`/privacidade` e das cópias para revisão. Os pontos 1 a 7 da política de
encomendas da Andreia mantêm-se. A secção «Preços» admite o preço base por
tamanho dos bolos personalizados, com preço final sob orçamento e aceite do
cliente, como ficou combinado.

## O que a advogada ainda revê

- O texto integral das duas minutas, incluindo as partes acrescentadas por nós
  (marcadas `nossa: true` no código).
- A necessidade e a justificação dos prazos: fotografias e informações de
  alergias são finalidades diferentes, mesmo que ambas proponham 30 dias;
  fotografias de pedidos recusados ou cancelados saem após o encerramento.
  Os 12 meses são para dados operacionais; a documentação fiscal e os dados
  necessários a reclamações ou litígios têm tratamento próprio.
- O prazo da prova de consentimento e dos registos mínimos para respeitar
  cancelamentos de marketing, que o texto original deixava por definir.
- O CICAP como entidade a indicar e a redação sobre livre resolução, sem
  confundir esse direito com o cancelamento gratuito até 24 horas oferecido
  pela casa.

O artigo 5.º, n.º 1, alínea e), do
[RGPD](https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32016R0679)
exige conservar os dados apenas enquanto forem necessários à finalidade;
não fixa estes prazos de 30 dias ou 12 meses. Por isso, a dúvida da Andreia não
se fecha dizendo que são prazos impostos pelo RGPD.
O [plano de atividades de 2026 do CICAP](https://cicap.pt/wp-content/uploads/2025/12/Plano-de-Atividades-e-Orcamento-2026-Vfinal-CORRIGIDA-signed.pdf)
inclui Valongo no seu âmbito territorial. Esta referência fundamenta a
proposta existente, sem dar como recebida a confirmação que a advogada ainda
vai prestar.

## O que depende de nós antes de publicar

São pendentes do PR #136, não perguntas que a Andreia deixou sem resposta:

- Implementar e testar a eliminação das fotografias e das observações e a
  anonimização dos dados do cliente nos prazos aprovados. As fotografias de
  pedidos recusados ou cancelados têm o prazo próprio indicado acima.
  **Essa rotina não existe nesta branch**; a minuta já não afirma que corre
  diariamente. Anonimizar dados pessoais não é apagar a encomenda: o contrato
  em `pedidos.md` e a fronteira de dados têm de acompanhar a implementação,
  num PR próprio e com a revisão exigida.
- Confirmar com a casa como se eliminam os dados nos emails, anexos,
  exportações e talões, e como se cumprem os prazos após recuperar uma cópia
  de segurança. A resposta «a minha ideia é automatizar» não prova que a
  automação esteja ligada.
- Revalidar os 7 dias de cópias de segurança contra o plano e a configuração
  efetivos da Neon; não dar o plano Launch como contratado.
- Confirmar a região do Vercel Blob, o prazo efetivo dos registos da Vercel,
  os destinatários e as garantias de transferências de dados.
- Ligar o Sentry, a conta de cliente e a entrada por código, ou ajustar a
  minuta ao que estiver efetivamente disponível no lançamento.
- Implementar o consentimento explícito para dados de alergias e a proteção
  das fotografias dos bolos no painel.
- Confirmar os alergénios nas fichas dos produtos e o funcionamento do pedido,
  dos emails, das entregas e do aceite de orçamentos antes de publicar as
  condições que os descrevem.

## Enviado à Andreia — aguarda a advogada

O Tomás confirmou a 25/11 que os textos já foram enviados à Andreia e que ela
disse que os enviaria à advogada. Aguarda-se a revisão e aprovação jurídica;
não está confirmado que a advogada já os tenha recebido.

As duas versões integrais estão datadas de 18/11/2026 e identificadas como
minutas para revisão. Os prazos e o CICAP continuam por validar.
A revisão das minutas pode avançar enquanto a implementação termina; a
aprovação jurídica e as verificações técnicas são ambas necessárias para
publicar. Não marcar a tarefa como concluída nem o texto como já disponível
no site público enquanto o PR não estiver integrado e publicado.

## Verificação desta atualização

A 25/11, antes de publicar estas alterações no PR #136, `npm run lint`,
`npm run build` (Turbopack, 237 páginas) e `npm test` passaram nesta branch:
687 testes aprovados e 38 ignorados. O PR mantém-se em rascunho.

A 18/11, `npm run lint` passou; `npm test` passou com 687 testes e 38
ignorados; `npm run build -- --webpack` passou, incluindo TypeScript e as
237 páginas estáticas. O build normal com Turbopack ficou impedido pelas
restrições do ambiente (primeiro acesso às fontes, depois abertura de uma
porta local). Não se alterou a configuração de build do projeto.

Os dois PDFs foram gerados diretamente dos mesmos módulos que alimentam as
páginas. Conferidos por extração integral do texto e inspeção visual de todas
as páginas: 3 nas condições e 6 na privacidade. Esta verificação não é a
aprovação jurídica nem comprova as funcionalidades ainda pendentes.

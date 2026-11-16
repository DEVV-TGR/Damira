/**
 * A política de privacidade, como texto e não como página.
 *
 * ## De quem é cada parte
 *
 * O texto é **da casa**: a Andreia mandou-o a 10/11/2026 (Notion, «Precisamos
 * de vocês» › RGPD), com as partes técnicas marcadas «PROGRAMADORES». Essas são
 * nossas, e dizem o que o site faz **de facto** — quem as mudar tem de mudar o
 * site primeiro, ou a política passa a afirmar uma coisa que não acontece.
 * As que escrevemos levam `nossa: true`, para a advogada saber o que rever.
 *
 * ⚠️ **Os prazos da secção 6 são promessas que o código tem de cumprir**: a
 * tarefa diária que apaga as fotografias e as observações aos 30 dias e anonimiza
 * os pedidos aos 12 meses. Se ela não existir, a política está errada.
 *
 * ## Porque é um ficheiro de dados e não JSX
 *
 * A advogada e a casa vão pedir mudanças de uma palavra. Num ficheiro só de
 * texto, cada mudança é uma linha de diff que se lê sem saber React.
 *
 * Só em português: é o texto que a advogada aprova, e uma tradução nossa seria
 * um segundo texto legal que ninguém aprovou. A `/en` diz isso por cima.
 */

export type Bloco = string | { lista: string[] };

export type Seccao = {
  id: string;
  titulo: string;
  /** Escrita por nós (as partes «PROGRAMADORES» da casa), não pela casa. */
  nossa?: boolean;
  blocos: Bloco[];
  subseccoes?: { titulo: string; nossa?: boolean; blocos: Bloco[] }[];
};

/** A data que a secção 13 promete mostrar. Muda-se com cada alteração ao texto. */
export const ATUALIZADA_EM = "2026-11-16";

export const EMAIL_PRIVACIDADE = "encomendas@damira.pt";

export const POLITICA: Seccao[] = [
  {
    id: "responsavel",
    titulo: "1. Responsável pelo tratamento",
    blocos: [
      "A Confeitaria e Pão Quente Damira Lda., com morada na R. Dom António Castro Meireles 155, 4445-397 Ermesinde, é responsável pelo tratamento dos dados pessoais recolhidos através do site damira.pt.",
      `Para questões relacionadas com a proteção dos seus dados pessoais ou para exercer os seus direitos, contacte-nos através de ${EMAIL_PRIVACIDADE}.`,
    ],
  },
  {
    id: "dados",
    titulo: "2. Dados pessoais recolhidos",
    blocos: [
      "Recolhemos os dados necessários para receber e gerir as encomendas e responder aos pedidos dos clientes.",
      "Para efetuar uma encomenda, são obrigatórios o nome, o contacto telefónico e o endereço de e-mail. Sem estes dados, não é possível concluir o pedido através do site.",
      "Consoante a encomenda e as opções escolhidas, podemos também recolher os seguintes dados.",
      {
        lista: [
          "NIF, de preenchimento facultativo, para faturação.",
          "Morada de entrega, quando a entrega ao domicílio estiver disponível e for selecionada.",
          "Produtos, quantidades, personalizações, datas e modalidade de levantamento ou entrega.",
          "Observações e fotografias enviadas para preparar produtos personalizados.",
          "Informações sobre alergias ou intolerâncias comunicadas pelo cliente.",
          "A escolha relativa à receção de marketing e os elementos necessários para comprovar essa escolha.",
        ],
      },
    ],
    subseccoes: [
      {
        titulo: "Conta de cliente",
        nossa: true,
        blocos: [
          "É possível efetuar encomendas sem criar uma conta. A conta é facultativa e serve para não ter de voltar a escrever os seus dados.",
          "Se entrar com o Google ou com o Facebook, recebemos deles apenas o seu nome, o seu endereço de e-mail e a sua fotografia de perfil. Se entrar com um código enviado por e-mail, recebemos apenas o endereço de e-mail. Não publicamos nada em seu nome.",
          "A sessão fica guardada num cookie no seu dispositivo durante 30 dias, ou até sair da conta. A lista das suas encomendas anteriores fica guardada no seu navegador, e não nos nossos sistemas: apaga-se quando limpar os dados do site no navegador.",
        ],
      },
      {
        titulo: "Dados técnicos",
        nossa: true,
        blocos: [
          "Quando visita o site, o nosso fornecedor de alojamento regista, como qualquer servidor, o endereço IP, a página pedida, a data e hora e o tipo de navegador. Estes registos servem para o site funcionar e para detetar falhas e abusos, e são apagados automaticamente ao fim de, no máximo, um dia.",
          "Quando faz uma encomenda, guardamos com ela o endereço IP de onde foi feita, para limitar o número de encomendas em curso a partir do mesmo endereço e assim proteger a loja de pedidos falsos. É conservado com a encomenda, nos prazos da secção 6.",
          "Quando o site encontra um erro, é enviado um relatório ao nosso serviço de monitorização de erros, que pode incluir o endereço IP, a página e o tipo de navegador. Estes relatórios são apagados ao fim de 30 dias.",
          "Medimos o número de visitas de forma agregada, sem cookies e sem identificar quem visita: cada visitante é contado através de um código calculado no momento, que muda todos os dias e não permite seguir ninguém de um dia para o outro nem entre sites.",
          "Sobre os cookies e o armazenamento no navegador, ver a secção 11.",
        ],
      },
    ],
  },
  {
    id: "finalidades",
    titulo: "3. Finalidades e fundamentos do tratamento",
    blocos: [],
    subseccoes: [
      {
        titulo: "Gestão de encomendas",
        blocos: [
          "Utilizamos os dados necessários para receber, avaliar, preparar e acompanhar encomendas, comunicar com o cliente e organizar o levantamento ou a entrega.",
          "O fundamento deste tratamento é a execução do contrato ou a realização de diligências pré-contratuais solicitadas pelo cliente.",
        ],
      },
      {
        titulo: "Cumprimento de obrigações legais",
        blocos: [
          "Tratamos os dados necessários à faturação e ao cumprimento de obrigações fiscais e contabilísticas com fundamento nas obrigações legais aplicáveis.",
        ],
      },
      {
        titulo: "Alergias e intolerâncias",
        blocos: [
          "Quando o cliente comunicar informações sobre alergias ou intolerâncias associadas a uma pessoa identificável, esses dados serão tratados para avaliar os requisitos do pedido, verificar a possibilidade de o satisfazer e orientar a preparação e o acompanhamento da encomenda.",
          "O tratamento destes dados de saúde depende de consentimento explícito, solicitado especificamente para esta finalidade.",
        ],
      },
      {
        titulo: "Marketing por e-mail",
        blocos: [
          "Quando o cliente der o seu consentimento, utilizaremos o nome e o endereço de e-mail para enviar novidades, promoções e campanhas sazonais da Damira.",
          "A adesão é facultativa e independente da realização de encomendas.",
          `O cliente pode retirar o consentimento a qualquer momento através da opção de cancelamento disponibilizada nas mensagens ou contactando ${EMAIL_PRIVACIDADE}. A retirada do consentimento não afeta a licitude do tratamento anteriormente efetuado.`,
        ],
      },
    ],
  },
  {
    id: "fotografias",
    titulo: "4. Fotografias e observações",
    blocos: [
      "As fotografias e observações enviadas pelo cliente destinam-se à análise, preparação e acompanhamento da encomenda.",
      "Solicitamos que envie apenas as informações e imagens necessárias ao pedido. Quando as fotografias incluam outras pessoas, deve assegurar que dispõe de legitimidade para as partilhar com a Damira para esta finalidade.",
      "A utilização de imagens para divulgação pública ou publicidade depende de autorização própria e do cumprimento das condições legais aplicáveis.",
    ],
  },
  {
    id: "alergias",
    titulo: "5. Tratamento de informações sobre alergias e intolerâncias",
    blocos: [
      "O cliente pode comunicar nas observações as alergias ou intolerâncias relevantes para a encomenda, devendo limitar a informação ao necessário para avaliar e preparar o pedido.",
      "O acesso a estes dados é limitado às pessoas autorizadas que deles necessitem para gerir e preparar a encomenda. Estes dados são utilizados exclusivamente no contexto do pedido a que respeitam.",
      "Se a informação disser respeito a outra pessoa, deve ser assegurado o consentimento dessa pessoa ou de quem tenha legitimidade para a representar.",
      `O consentimento pode ser retirado através de ${EMAIL_PRIVACIDADE}. Nesse caso, a Damira avaliará com o cliente se continua a ser possível satisfazer os requisitos da encomenda.`,
      "A comunicação de uma alergia ou intolerância será avaliada pela equipa. A possibilidade de satisfazer o pedido depende das características dos produtos e das condições de preparação, incluindo os riscos de contaminação cruzada.",
      "A informação sobre os alergénios dos produtos está disponível nas respetivas fichas.",
    ],
  },
  {
    id: "prazos",
    titulo: "6. Prazos de conservação",
    blocos: [
      "Conservamos os dados pessoais durante o período necessário às finalidades para as quais foram recolhidos e ao cumprimento das obrigações legais aplicáveis.",
    ],
    subseccoes: [
      {
        titulo: "Contactos de marketing",
        blocos: [
          "Os dados utilizados para marketing são conservados durante dois anos a contar da adesão, ou até à retirada do consentimento, se ocorrer primeiro.",
          "Terminado esse período, o contacto deixa de integrar a lista ativa de marketing, salvo renovação do consentimento. Uma nova encomenda não renova automaticamente esse prazo.",
        ],
      },
      {
        titulo: "Dados operacionais das encomendas",
        blocos: ["Até 12 meses após o levantamento, entrega ou cancelamento."],
      },
      {
        titulo: "Fotografias",
        blocos: [
          "Até 30 dias após o levantamento ou entrega. Nos pedidos recusados ou cancelados, eliminar após o encerramento do pedido.",
        ],
      },
      {
        titulo: "Informações sobre alergias e intolerâncias",
        blocos: [
          "Até 30 dias após o levantamento, entrega ou cancelamento, com eliminação desta informação das observações e das restantes cópias operacionais.",
        ],
      },
      {
        titulo: "Reclamações e litígios",
        blocos: [
          "Os dados necessários à resolução de reclamações ou ao exercício ou defesa de direitos podem ser conservados durante o período justificado para esse efeito.",
        ],
      },
      {
        titulo: "Documentação fiscal",
        blocos: [
          "Os dados e documentos sujeitos a obrigações fiscais e contabilísticas são conservados durante os prazos legalmente aplicáveis.",
        ],
      },
      {
        titulo: "Como os prazos se cumprem",
        nossa: true,
        blocos: [
          "Uma tarefa automática corre uma vez por dia e, sem intervenção de ninguém, apaga as fotografias e as observações (onde ficam as alergias e intolerâncias) 30 dias após o levantamento, a entrega ou o cancelamento, e apaga de cada encomenda o nome, o telefone, o e-mail, o NIF, a morada e o endereço IP 12 meses após o levantamento, a entrega ou o cancelamento. Fica apenas o que não identifica ninguém (os produtos, as quantidades e as datas), para as contas da loja.",
          "As cópias de segurança da base de dados guardam o estado dos últimos 7 dias, e por isso um dado apagado desaparece também delas ao fim de 7 dias. As fotografias não têm cópias de segurança.",
          "As encomendas chegam também à caixa de correio da loja, por e-mail, para a equipa as ver. Essas mensagens seguem os mesmos prazos.",
        ],
      },
    ],
  },
  {
    id: "destinatarios",
    titulo: "7. Acesso aos dados e destinatários",
    blocos: [
      "Os dados podem ser consultados pelas pessoas autorizadas pela Damira que deles necessitem para desempenhar as suas funções.",
      "Podem também ser tratados por prestadores que apoiem o alojamento, o funcionamento e a manutenção do site, o armazenamento de fotografias e o envio de e-mails, de acordo com as condições legais e contratuais aplicáveis.",
      "Quando exista entrega ao domicílio, os dados necessários à sua realização podem ser disponibilizados às pessoas ou entidades responsáveis pela entrega.",
      "Os dados podem ainda ser comunicados às autoridades competentes quando exista uma obrigação legal.",
    ],
    subseccoes: [
      {
        titulo: "Os prestadores que usamos",
        nossa: true,
        blocos: [
          {
            lista: [
              "Vercel Inc. — alojamento do site, armazenamento das fotografias, medição agregada de visitas.",
              "Neon (Databricks, Inc.) — base de dados onde ficam as encomendas.",
              "Resend (Plus Five Five, Inc.) — envio dos e-mails das encomendas.",
              "Sentry (Functional Software, Inc.) — monitorização de erros do site.",
              "Google — caixa de correio da loja; e a entrada na conta, se o cliente a escolher.",
              "Meta Platforms — a entrada na conta com o Facebook, se o cliente a escolher.",
              "DevPlus — desenvolvimento e manutenção do site, por conta da Damira.",
            ],
          },
          "Todos atuam como subcontratantes da Damira, só para estas finalidades, com exceção do Google e da Meta na entrada na conta, que tratam os dados da conta que o cliente lá tem segundo as suas próprias políticas.",
        ],
      },
    ],
  },
  {
    id: "transferencias",
    titulo: "8. Transferências internacionais",
    nossa: true,
    blocos: [
      "A base de dados e o processamento do site estão alojados em Londres, no Reino Unido, que beneficia de uma decisão de adequação da Comissão Europeia: os dados podem lá estar com o mesmo nível de proteção que no Espaço Económico Europeu.",
      "Os prestadores da secção 7 são empresas dos Estados Unidos, e alguns guardam ou podem aceder a dados nos Estados Unidos (é o caso do envio de e-mails e do armazenamento das fotografias). Essas transferências fazem-se ao abrigo do Quadro de Privacidade de Dados UE-EUA, quando o prestador está certificado, e das cláusulas contratuais-tipo aprovadas pela Comissão Europeia, que constam dos acordos de tratamento de dados de cada prestador.",
      `Pode pedir informação sobre estas garantias, ou uma cópia, através de ${EMAIL_PRIVACIDADE}.`,
    ],
  },
  {
    id: "seguranca",
    titulo: "9. Segurança dos dados",
    blocos: [
      "A Damira adota medidas técnicas e organizativas adequadas aos riscos do tratamento, destinadas a proteger os dados contra o acesso não autorizado, a utilização indevida, a perda, a alteração ou a divulgação.",
    ],
    subseccoes: [
      {
        titulo: "As medidas, em concreto",
        nossa: true,
        blocos: [
          {
            lista: [
              "Todas as ligações ao site e entre os seus serviços são cifradas (HTTPS e TLS).",
              "As encomendas só se veem no painel da loja, que exige um código: a gerente entra com um código de uso único enviado por e-mail, e a equipa com um código da loja, bloqueado ao fim de várias tentativas erradas.",
              "Cada ação de gestão é verificada no servidor, e não só no ecrã.",
              "As fotografias enviadas pelos clientes não estão publicadas em lado nenhum do site e só se abrem a partir do painel da loja.",
              "As observações, onde podem constar dados de saúde, só se mostram no painel e no talão da encomenda, e apagam-se nos prazos da secção 6.",
              "O acesso aos sistemas é limitado às contas da Damira e da DevPlus, e a base de dados guarda um histórico contínuo dos últimos 7 dias, de onde se pode repor.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "direitos",
    titulo: "10. Direitos dos titulares",
    blocos: [
      "Nos termos e condições previstos na lei, pode exercer os direitos de acesso, retificação, apagamento, limitação do tratamento, portabilidade e oposição, quando aplicáveis.",
      "Quando o tratamento se baseie no consentimento, pode retirá-lo a qualquer momento.",
      `Para exercer os seus direitos, contacte ${EMAIL_PRIVACIDADE}. Quando necessário, poderemos solicitar informação adicional para confirmar a sua identidade.`,
      "Os pedidos serão respondidos, em regra, no prazo de um mês. Quando a lei permita a prorrogação desse prazo, o titular será informado da prorrogação e dos respetivos motivos.",
      "Pode também apresentar uma reclamação à Comissão Nacional de Proteção de Dados, através de www.cnpd.pt.",
    ],
  },
  {
    id: "cookies",
    titulo: "11. Cookies e tecnologias semelhantes",
    nossa: true,
    blocos: [
      "Este site usa apenas os cookies e o armazenamento no navegador estritamente necessários para funcionar ou para fazer o que o próprio visitante pediu. Por isso não pedimos consentimento: a lei dispensa-o nestes casos. Não usamos cookies de publicidade, de redes sociais nem de análise.",
      {
        lista: [
          "Sessão da conta de cliente (authjs.session-token e cookies auxiliares do início de sessão) — mantém a sessão de quem entrou na conta. Nossa. Dura 30 dias, ou até sair da conta.",
          "Sessão do painel da loja — só para a equipa da Damira, no painel. Nossa. Dura até fechar o navegador, ou até ao fim da sessão se a equipa pedir para ser lembrada.",
          "Cesto (armazenamento no navegador) — guarda os produtos escolhidos até concluir a encomenda. Não sai do seu dispositivo. Fica até esvaziar o cesto ou limpar os dados do site.",
          "Histórico e dados da conta (armazenamento no navegador) — a lista das encomendas anteriores, para quem a quiser. Não sai do seu dispositivo.",
        ],
      },
      "A medição de visitas (secção 2) não usa cookies nem guarda nada no seu dispositivo.",
      "Pode apagar os cookies e o armazenamento deste site a qualquer momento nas definições do seu navegador. Se o fizer, sai da conta e perde o conteúdo do cesto.",
    ],
  },
  {
    id: "decisoes",
    titulo: "12. Decisões automatizadas e definição de perfis",
    nossa: true,
    blocos: [
      "O site não toma decisões exclusivamente automatizadas com efeitos jurídicos ou com impacto significativo para o cliente, nem define perfis. O site calcula sozinho as datas e horas de levantamento possíveis, a partir dos tempos de produção e das vagas da loja; aceitar ou recusar uma encomenda que precise de confirmação é sempre uma decisão da equipa da Damira.",
      "A eventual utilização futura do histórico de compras ou de preferências para personalizar campanhas será precedida da informação ao cliente e da obtenção dos consentimentos aplicáveis.",
    ],
  },
  {
    id: "atualizacoes",
    titulo: "13. Atualizações",
    blocos: [
      "Esta política pode ser atualizada para refletir alterações no funcionamento do site ou no tratamento de dados pessoais.",
      "A versão em vigor estará disponível nesta página, com indicação da data da última atualização.",
    ],
  },
];

/**
 * Regenera o `skills-lock.json` — o inventário das skills em `.agents/skills`.
 *
 *   npm run skills:lock
 *
 * O `sha256` é do conteúdo de cada pasta (caminhos e bytes, por ordem). Serve
 * para uma coisa só: dar por que uma skill mudou. São 21 pastas de terceiros que
 * ninguém volta a ler, e sem um resumo por pasta uma alteração passa despercebida
 * no `git diff` no meio de centenas de linhas de markdown.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

const RAIZ = ".agents/skills";

async function ficheirosDe(dir) {
  const saida = [];
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) saida.push(...(await ficheirosDe(caminho)));
    else if (entrada.isFile()) saida.push(caminho);
  }
  return saida.sort();
}

/* O `description:` tanto vem numa linha como num bloco YAML *folded* (`>`) ou
   literal (`|`) — a scrollcraft usa o primeiro. Sem juntar as linhas seguintes,
   o inventário guardava ">" como descrição e não dizia nada a ninguém. */
function descricaoDoFrontmatter(md) {
  const linhas = md.split(/\r?\n/);
  const i = linhas.findIndex((linha) => /^description:/.test(linha));
  if (i === -1) return null;

  const primeira = linhas[i].slice("description:".length).trim();
  if (!/^[|>][+-]?$/.test(primeira)) return primeira || null;

  /* O bloco acaba na primeira linha não indentada — outra chave, ou o `---`. */
  const corpo = [];
  for (const linha of linhas.slice(i + 1)) {
    if (linha.trim() !== "" && !/^\s/.test(linha)) break;
    corpo.push(linha.trim());
  }
  return corpo.join(" ").replace(/\s+/g, " ").trim() || null;
}

const nomes = (await readdir(RAIZ, { withFileTypes: true }))
  .filter((entrada) => entrada.isDirectory())
  .map((entrada) => entrada.name)
  .sort();

const skills = [];
for (const nome of nomes) {
  const dir = join(RAIZ, nome);
  const lista = await ficheirosDe(dir);

  const hash = createHash("sha256");
  for (const ficheiro of lista) hash.update(ficheiro).update(await readFile(ficheiro));

  /* A descrição sai do frontmatter do SKILL.md — é o que distingue as skills
     umas das outras sem abrir 21 ficheiros. */
  let descricao = null;
  try {
    const md = await readFile(join(dir, "SKILL.md"), "utf8");
    descricao = descricaoDoFrontmatter(md);
    if (descricao && descricao.length > 160) descricao = `${descricao.slice(0, 157)}...`;
  } catch {
    /* uma skill sem SKILL.md entra na mesma no inventário, sem descrição */
  }

  skills.push({
    nome,
    descricao,
    ficheiros: lista.length,
    sha256: hash.digest("hex").slice(0, 16),
  });
}

const lock = {
  _comentario:
    "Inventário das skills em .agents/skills, copiadas para o projeto para que qualquer agente ou máquina o encontre auto-contido. Os symlinks em .claude/skills apontam para cá. O sha256 é do conteúdo de cada pasta (caminhos + bytes, por ordem): serve para detetar que uma skill mudou sem ninguém dizer. Regenerar com `npm run skills:lock`.",
  origem: "~/.agents/skills",
  copiadoEm: new Date().toISOString().slice(0, 10),
  total: skills.length,
  skills,
};

await writeFile("skills-lock.json", `${JSON.stringify(lock, null, 2)}\n`);
console.log(`skills-lock.json regenerado — ${skills.length} skills.`);

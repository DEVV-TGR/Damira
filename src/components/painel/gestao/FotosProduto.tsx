"use client";

import { useId, useState } from "react";
import { enviarFoto } from "@/lib/fotos-envio";
import { FotoIlegivel, reduzirFoto } from "@/lib/reduzir-foto";
import { BOTAO_SECUNDARIO } from "../balcao/comum";

/**
 * # As fotos de um produto, no editor (#40, #32)
 *
 * A gerente tira a foto no telemóvel (ou escolhe-a da galeria). A foto é reduzida
 * aqui (`reduzirFoto`) e vai diretamente para o Blob (`enviarFoto`), sem passar
 * pelo nosso servidor. O endereço entra na lista, e **só fica no produto quando
 * ela grava**: é o `gravarProduto` que guarda a lista e apaga do Blob as que saíram.
 *
 * ⚠️ **A primeira é a que o site mostra** (`fotoDe`, em `vista.ts`). Por isso há
 * «Principal», e não setas: ordenar seis fotos num telemóvel ninguém o faz, mas
 * escolher a da capa faz-se.
 *
 * ⚠️ **Uma foto enviada e não gravada fica esquecida no Blob** (cancelar, ou tirá-la
 * antes de gravar). O browser não a pode apagar — o token só deixa enviar — e o
 * servidor só apaga as que o produto tinha. Custa uns cêntimos; é a mesma troca
 * do `apagarFotos`, que prefere uma foto órfã a um produto a apontar para o vazio.
 */
export function FotosProduto({
  fotos,
  onMudar,
  onOcupado,
}: {
  fotos: string[];
  onMudar: (fotos: string[]) => void;
  /** Enquanto envia, o editor não grava: gravava a lista sem a foto que está a chegar. */
  onOcupado: (ocupado: boolean) => void;
}) {
  const id = useId();
  const [estado, setEstado] = useState<{ fase: "a-reduzir" | "a-enviar"; n: number; de: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const juntar = async (ficheiros: File[]) => {
    if (ficheiros.length === 0) return;
    setErro(null);
    onOcupado(true);
    /* Uma a uma, e cada uma entra na lista assim que chega: se a terceira falhar,
       as duas primeiras não se perdem. */
    let lista = fotos;
    try {
      for (const [i, ficheiro] of ficheiros.entries()) {
        setEstado({ fase: "a-reduzir", n: i + 1, de: ficheiros.length });
        const { foto } = await reduzirFoto(ficheiro);
        setEstado({ fase: "a-enviar", n: i + 1, de: ficheiros.length });
        const endereco = await enviarFoto(foto);
        lista = [...lista, endereco];
        onMudar(lista);
      }
    } catch (falha) {
      setErro(mensagemDe(falha));
    } finally {
      setEstado(null);
      onOcupado(false);
    }
  };

  const ocupado = estado !== null;

  return (
    <div className="mt-3">
      {fotos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotos.map((foto, i) => (
            <li key={foto} className="min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura no painel, sem otimizador */}
              <img src={foto} alt={`Foto ${i + 1}`} className="aspect-[4/3] w-full rounded-xl object-cover" />
              {i === 0 ? (
                <p className="mt-1 text-xs font-semibold">Principal — é a que o site mostra</p>
              ) : (
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => onMudar([foto, ...fotos.filter((f) => f !== foto)])}
                  className="mt-1 min-h-11 text-sm underline underline-offset-4 disabled:opacity-50"
                >
                  Pôr como principal
                </button>
              )}
              <button
                type="button"
                disabled={ocupado}
                aria-label={`Tirar a foto ${i + 1}`}
                onClick={() => onMudar(fotos.filter((f) => f !== foto))}
                className="block min-h-11 text-sm text-tijolo underline underline-offset-4 disabled:opacity-50"
              >
                Tirar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-tinta-suave">
          Sem fotos. O site guarda o espaço e diz que a fotografia está por chegar — nunca põe lá outra.
        </p>
      )}

      <label
        htmlFor={id}
        className={`${BOTAO_SECUNDARIO} mt-3 cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-tijolo ${ocupado ? "pointer-events-none opacity-50" : ""}`}
      >
        + Juntar foto
        <input
          id={id}
          type="file"
          /* Sem `capture`: assim o telemóvel deixa escolher entre a câmara e a galeria. */
          accept="image/*"
          multiple
          disabled={ocupado}
          className="sr-only"
          onChange={(ev) => {
            const ficheiros = [...(ev.target.files ?? [])];
            /* Sem isto, escolher a mesma foto outra vez não fazia nada. */
            ev.target.value = "";
            void juntar(ficheiros);
          }}
        />
      </label>

      <p aria-live="polite" className="mt-2 text-sm text-tinta-suave">
        {estado
          ? `${estado.fase === "a-reduzir" ? "A preparar" : "A enviar"} a foto${estado.de > 1 ? ` ${estado.n} de ${estado.de}` : ""}…`
          : "Só a foto deste produto — nunca uma da loja ou de outro artigo. Fica no site quando gravar."}
      </p>
      {erro && (
        <p role="alert" className="mt-2 font-semibold text-tijolo">
          {erro}
        </p>
      )}
    </div>
  );
}

/* O SDK do Blob não diz o código da resposta do servidor (403 ou 503 dão o mesmo
   erro), por isso a mensagem cobre os dois. */
function mensagemDe(falha: unknown): string {
  if (falha instanceof FotoIlegivel) return "Não foi possível abrir esta foto. Experimente outra, ou tire-a de novo.";
  if (falha instanceof Error && /client token/i.test(falha.message)) {
    return "O envio não foi autorizado: só a gerente envia fotos, e o envio de fotos tem de estar ligado. Se a sessão terminou, entre de novo.";
  }
  return "A foto não chegou. Verifique a rede e tente outra vez.";
}

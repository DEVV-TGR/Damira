-- O `de_teste` de um pedido não muda depois de ele nascer.
--
-- É por ele que o lançamento tira das contas os pedidos feitos com
-- `LOJA_EM_TESTE=1` (`pagamentos.md` › Ambientes): um pedido de teste que
-- passasse a verdadeiro ocupava uma vaga a sério, e um verdadeiro que passasse a
-- teste desaparecia das vendas. Um `CHECK` só vê a linha nova, por isso é um
-- gatilho que compara as duas.
--
-- O `drizzle-kit` não gera gatilhos: esta migração foi escrita à mão
-- (`drizzle-kit generate --custom`).
CREATE FUNCTION "pedidos_de_teste_imutavel"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	IF NEW."de_teste" IS DISTINCT FROM OLD."de_teste" THEN
		RAISE EXCEPTION 'o de_teste de um pedido não muda depois de ele nascer'
			USING ERRCODE = 'check_violation', CONSTRAINT = 'pedidos_de_teste_imutavel';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "pedidos_de_teste_imutavel"
	BEFORE UPDATE OF "de_teste" ON "pedidos"
	FOR EACH ROW EXECUTE FUNCTION "pedidos_de_teste_imutavel"();

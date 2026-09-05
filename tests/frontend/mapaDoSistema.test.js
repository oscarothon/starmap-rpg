import { describe, expect, it } from "vitest";

import { montarLinhas } from "../../static/js/modules/systems/mapaDoSistema.js";

const estrela = (id, nome, filhos = []) => ({
  id,
  name: nome,
  body_type: "star",
  star_class: "G",
  children: filhos,
});
const planeta = (id, nome, filhos = []) => ({
  id,
  name: nome,
  body_type: "planet",
  children: filhos,
});

describe("montagem das linhas de órbita", () => {
  it("põe as estrelas e os corpos sem órbita na linha do centro", () => {
    const linhas = montarLinhas({
      bodies: [estrela(1, "Sol"), planeta(2, "Terra"), planeta(3, "Marte")],
    });

    expect(linhas).toHaveLength(1);
    expect(linhas[0].tipo).toBe("centro");
    expect(linhas[0].estrelas.map((e) => e.name)).toEqual(["Sol"]);
    expect(linhas[0].corpos.map((c) => c.name)).toEqual(["Terra", "Marte"]);
  });

  it("dá uma linha própria para a estrela que tem corpos orbitando", () => {
    const linhas = montarLinhas({
      bodies: [
        estrela(1, "Alfa A", [planeta(3, "Alfa A I")]),
        estrela(2, "Alfa B"),
        planeta(4, "Circumbinário"),
      ],
    });

    expect(linhas).toHaveLength(2);
    expect(linhas[0].corpos.map((c) => c.name)).toEqual(["Circumbinário"]);
    expect(linhas[1].tipo).toBe("estrela");
    expect(linhas[1].estrelas[0].name).toBe("Alfa A");
    expect(linhas[1].corpos.map((c) => c.name)).toEqual(["Alfa A I"]);
  });

  it("mantém todas as estrelas na âncora do centro, mesmo as com filhos", () => {
    const linhas = montarLinhas({
      bodies: [estrela(1, "A", [planeta(3, "A I")]), estrela(2, "B")],
    });

    expect(linhas[0].estrelas.map((e) => e.name)).toEqual(["A", "B"]);
  });

  it("lida com sistema sem nenhum corpo", () => {
    const linhas = montarLinhas({ bodies: [] });

    expect(linhas).toHaveLength(1);
    expect(linhas[0].estrelas).toEqual([]);
    expect(linhas[0].corpos).toEqual([]);
  });

  it("lida com sistema sem estrela registrada", () => {
    const linhas = montarLinhas({ bodies: [planeta(1, "Órfão")] });

    expect(linhas[0].estrelas).toEqual([]);
    expect(linhas[0].corpos.map((c) => c.name)).toEqual(["Órfão"]);
  });
});

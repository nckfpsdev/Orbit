import type { Business, Channel, OrgSettings, WebsiteContent } from "./types";
import { normalizeText } from "./geo";
export function nicheKind(category: string): WebsiteContent["style"] {
  const n = normalizeText(category);
  if (/restaur|pizz|hamburg|hotel|pousada/.test(n)) return "editorial";
  if (/academia|oficina|construc/.test(n)) return "bold";
  if (/barbear|estet|salao|advog|imobil/.test(n)) return "elegant";
  return "clinic";
}
export function websiteDraft(b: Business): WebsiteContent {
  const style = nicheKind(b.category);
  const headlines = {
    clinic: "Cuidado que começa com atenção.",
    editorial: "Um bom encontro começa aqui.",
    bold: "Seu próximo passo começa agora.",
    elegant: "Cada detalhe faz a diferença.",
  };
  const ctas = {
    clinic: "Conheça o atendimento",
    editorial: "Fale com nossa equipe",
    bold: "Comece sua experiência",
    elegant: "Entre em contato",
  };
  return {
    name: b.business_name,
    category: b.category,
    city: b.city,
    address: b.address,
    phone: b.phone ?? "",
    whatsapp: b.public_whatsapp ?? "",
    hours: b.opening_hours ?? "",
    instagram: b.instagram ?? "",
    headline: headlines[style],
    subtitle: `Conheça ${b.business_name} em ${b.city}. Informações claras para você escolher seu próximo passo.`,
    about: `${b.business_name} reúne informações sobre ${b.category.toLocaleLowerCase("pt-BR")} em ${b.city}. Converse com a equipe para confirmar serviços, disponibilidade e condições de atendimento.`,
    cta: ctas[style],
    services: b.services.map((title) => ({
      title,
      description:
        "Entre em contato com a equipe para conhecer os detalhes e a disponibilidade.",
    })),
    sections: [
      "services",
      "about",
      "process",
      "location",
      "contact",
      ...(b.opening_hours ? ["hours"] : []),
    ].filter((s) => s !== "services" || b.services.length > 0),
    color:
      style === "clinic"
        ? "#19635c"
        : style === "editorial"
          ? "#8b382c"
          : style === "bold"
            ? "#b9e34b"
            : "#a17d46",
    style,
    image_url: b.photos[0]?.url ?? "",
    image_attribution: b.photos[0]?.attribution ?? "",
  };
}
export function nicheValue(category: string) {
  const n = normalizeText(category);
  if (/restaur|pizz|hamburg/.test(n))
    return "reunir cardápio, localização, horários e contato para reservas em um só lugar";
  if (/academia/.test(n))
    return "apresentar modalidades, estrutura e o contato para uma aula experimental, quando disponível";
  if (/clinica|odont|psicolog|fisioter|nutri/.test(n))
    return "apresentar os serviços confirmados, informações de atendimento e localização com clareza";
  if (/advog/.test(n))
    return "organizar a apresentação institucional, áreas de atuação informadas e os canais de contato, respeitando as regras profissionais";
  if (/barbear|estet|salao/.test(n))
    return "apresentar serviços, estilo do espaço e contato para agendamento";
  if (/imobil/.test(n))
    return "apresentar a empresa e facilitar o contato com interessados";
  return "reunir serviços, localização e canais de contato em uma apresentação profissional";
}
export function generateScript(
  b: Business,
  channel: Channel,
  settings: OrgSettings,
  previewUrl: string | undefined,
  kind = "first",
  objection = "",
): string {
  const intro = settings.sender_name ? `Sou ${settings.sender_name}. ` : "";
  const value = nicheValue(b.category);
  const link = previewUrl
    ? ` Preparei uma demonstração comercial para ${b.business_name}: ${previewUrl}. Ela não é um site oficial.`
    : "";
  const reputation =
    b.rating !== null && b.reviews_count !== null
      ? ` Vi a avaliação ${b.rating.toFixed(1).replace(".", ",")} com ${b.reviews_count} avaliações na fonte consultada.`
      : "";
  const gap = [
    "not_identified",
    "social_only",
    "aggregator",
    "directory",
  ].includes(b.website_status)
    ? " Não identifiquei um site próprio nas fontes que consultei; pode ser que ele exista em outro endereço."
    : " Pensei em uma apresentação que deixe as informações comerciais mais fáceis de encontrar.";
  if (kind === "objection") {
    const map: Record<string, string> = {
      "Já uso Instagram.": `Faz sentido, o Instagram ajuda muito na comunicação. A ideia do site é complementar com ${value}. Se quiser, posso mostrar como os dois funcionariam juntos.`,
      "Não preciso de site.":
        "Tudo bem. Só vale avançar se fizer sentido para a rotina do negócio. Se em algum momento vocês precisarem organizar as informações ou os contatos, fico à disposição.",
      "Está caro.":
        "Entendo. Posso detalhar o que está incluído e ajustar o escopo às suas prioridades. Não quero sugerir algo que fique fora do seu orçamento.",
      "Tenho pouco movimento.":
        "Entendo a preocupação. Um site pode organizar a apresentação do negócio, mas não garante novos clientes. Podemos avaliar primeiro se essa é a prioridade agora.",
      "Meu sobrinho faz.":
        "Ótimo, ter alguém de confiança ajuda. Se vocês quiserem comparar escopo, manutenção e prazo, posso mostrar minha proposta sem compromisso.",
      "Já tenho alguém cuidando.":
        "Perfeito. Não quero atrapalhar o trabalho de quem já está com vocês. Se precisarem de apoio em algum ponto específico, podem me chamar.",
      "Não tenho interesse agora.":
        "Tudo bem, obrigado por me avisar. Não vou continuar enviando mensagens. Se fizer sentido no futuro, fico à disposição.",
      "Como você conseguiu meu contato?": `Encontrei este contato comercial em ${b.source === "osm" ? "um cadastro público no OpenStreetMap" : b.source === "mock" ? "dados fictícios desta demonstração" : b.source_url || "uma fonte comercial pública autorizada"}. Posso informar a referência. Se preferir, não entro mais em contato.`,
      "Vou pensar.":
        "Claro, fique à vontade. Se surgir alguma dúvida sobre escopo ou valores, me chame. Prefere combinar um retorno em uma data ou deixar por sua conta?",
    };
    return (
      map[objection] ??
      "Entendo. Podemos conversar sobre o que faz sentido para o negócio, sem compromisso."
    );
  }
  if (kind === "followup1")
    return `Oi, equipe da ${b.business_name}! Conseguiu ver a demonstração que compartilhei? Se fizer sentido, posso explicar o escopo. Sem problema se não for a prioridade agora.`;
  if (kind === "followup2")
    return `Oi! Passando para saber se ficou alguma dúvida sobre a proposta para ${b.business_name}. Se preferirem, deixamos a conversa para outro momento.`;
  if (kind === "last")
    return `Obrigado pelo seu tempo! Vou encerrar meus contatos por aqui. Se quiser retomar a proposta para ${b.business_name}, fico à disposição.`;
  const base = `Oi, equipe da ${b.business_name}! ${intro}Conheci o negócio em ${b.city}.${reputation}${gap} A ideia é ${value}.${link} Posso enviar os detalhes e saber se isso faz sentido para vocês?`;
  if (channel === "Ligação")
    return `Abertura: “Oi! Falo com alguém responsável pela presença digital da ${b.business_name}? ${intro}Posso tomar um minuto?”\n\nContexto: Conheci o negócio em ${b.city}.${gap}\n\nPergunta: Como vocês organizam hoje as informações e o contato de novos clientes?\n\nProposta: ${value[0].toUpperCase() + value.slice(1)}.${link}\n\nPróximo passo: Pergunte se há interesse em receber uma demonstração. Se não houver, agradeça e encerre.`;
  if (channel === "E-mail")
    return `Assunto: Uma apresentação digital para ${b.business_name}\n\n${base}\n\n${settings.sender_name || settings.agency_name}`;
  if (channel === "Instagram DM")
    return `Oi, equipe da ${b.business_name}! ${intro}Vi a apresentação de vocês em ${b.city} e preparei uma ideia para ${value}.${link} Posso compartilhar com a pessoa responsável?`;
  if (channel === "Visita presencial")
    return `“Oi! ${intro}Conheci a ${b.business_name} aqui em ${b.city} e preparei uma ideia de apresentação digital. É um bom momento para conversar com a pessoa responsável?”\n\nSe houver abertura, mostre a demonstração e explique: ${value}.${link}\n\nConfirme interesse antes de pedir contato ou combinar retorno.`;
  return base;
}

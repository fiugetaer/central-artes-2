// ===============================
// INICIALIZAÇÃO
// ===============================


document.addEventListener("DOMContentLoaded", async () => {


    // ── Proteção de rota real (Supabase Auth) ──
    // Páginas protegidas verificam se há sessão ativa
    const paginaProtegida = document.querySelector("meta[name='pagina-protegida']");
    if (paginaProtegida) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = "login.html";
            return; // Para a execução — não carrega mais nada
        }
    }


    // ── Botão do formulário de solicitação ──
    const btnEnviar = document.getElementById("btnEnviar");
    if (btnEnviar) {
        btnEnviar.addEventListener("click", enviarSolicitacao);
    }


    // ── Botão de login ──
    const btnLogin = document.getElementById("btnLogin");
    if (btnLogin) {
        btnLogin.addEventListener("click", fazerLogin);
    }


    // ── Permite Enter no campo senha para logar ──
    const campoSenha = document.getElementById("senha");
    if (campoSenha) {
        campoSenha.addEventListener("keydown", (e) => {
            if (e.key === "Enter") fazerLogin();
        });
    }


    // ── Carrega dados de cada página ──
    atualizarDashboard();
    atualizarHome();
    atualizarResumo();


});




// ===============================
// LOGIN — Supabase Auth real
// ===============================


async function fazerLogin() {


    const email   = document.getElementById("email").value.trim();
    const senha   = document.getElementById("senha").value.trim();
    const msgErro = document.getElementById("msgErro");
    const btnLogin = document.getElementById("btnLogin");


    if (msgErro) msgErro.textContent = "";


    if (!email || !senha) {
        if (msgErro) msgErro.textContent = "Preencha e-mail e senha.";
        return;
    }


    // Feedback visual no botão
    if (btnLogin) {
        btnLogin.disabled = true;
        btnLogin.textContent = "Entrando...";
    }


    // Autentica com o Supabase Auth
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: senha
    });


    if (error) {
        if (msgErro) msgErro.textContent = "E-mail ou senha incorretos.";
        if (btnLogin) {
            btnLogin.disabled = false;
            btnLogin.textContent = "Entrar";
        }
        return;
    }


    // Login OK — redireciona para o dashboard
    window.location.href = "dashboard.html";


}




// ===============================
// LOGOUT — Supabase Auth real
// ===============================


async function fazerLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
}




// ===============================
// ENVIAR SOLICITAÇÃO
// ===============================


async function enviarSolicitacao() {


    const nome             = document.getElementById("nome").value.trim();
    const setor            = document.getElementById("setor").value.trim();
    const tipo             = document.getElementById("tipoPeca").value;
    const objetivo         = document.getElementById("objetivo").value.trim();
    const prioridade       = document.getElementById("prioridade").value;
    const entrega          = document.getElementById("dataEntrega").value;
    const whatsapp         = document.getElementById("whatsapp")?.value.trim()         || "";
    const emailSolicitante = document.getElementById("emailSolicitante")?.value.trim() || "";
    const campanha         = document.getElementById("campanha")?.value.trim()         || "";
    const textoObrigatorio = document.getElementById("textoObrigatorio")?.value.trim() || "";
    const publicoAlvo      = document.getElementById("publicoAlvo")?.value.trim()      || "";
    const linkReferencia   = document.getElementById("linkReferencia")?.value.trim()   || "";
    const observacoes      = document.getElementById("observacoes")?.value.trim()      || "";


    if (!nome || !setor || tipo === "Selecione" || !objetivo || !entrega) {
        alert("Preencha todos os campos obrigatórios: Nome, Setor, Tipo da Peça, Objetivo e Data de Entrega.");
        return;
    }


    const btnEnviar = document.getElementById("btnEnviar");
    if (btnEnviar) {
        btnEnviar.disabled = true;
        btnEnviar.textContent = "Enviando...";
    }


    // ── Upload de arquivo (se selecionado) ──────────────────────────────────
    let arquivoUrl = "";
    const inputArquivo = document.getElementById("arquivoReferencia");


    if (inputArquivo && inputArquivo.files.length > 0) {
        const arquivo = inputArquivo.files[0];


        // Valida tamanho: máximo 20MB
        if (arquivo.size > 20 * 1024 * 1024) {
            alert("O arquivo é muito grande. O tamanho máximo permitido é 20MB.");
            if (btnEnviar) {
                btnEnviar.disabled = false;
                btnEnviar.textContent = "Enviar Solicitação";
            }
            return;
        }


        // Valida tipo: só imagens e vídeos
        const tiposPermitidos = ["image/jpeg","image/png","image/gif","image/webp","video/mp4","video/quicktime","video/webm","application/pdf"];
        if (!tiposPermitidos.includes(arquivo.type)) {
            alert("Tipo de arquivo não permitido. Envie uma imagem (JPG, PNG, GIF, WEBP), vídeo (MP4, MOV, WEBM) ou PDF.");
            if (btnEnviar) {
                btnEnviar.disabled = false;
                btnEnviar.textContent = "Enviar Solicitação";
            }
            return;
        }


        if (btnEnviar) btnEnviar.textContent = "Enviando arquivo...";


        // Gera nome único para evitar conflito entre arquivos com o mesmo nome
        const extensao    = arquivo.name.split(".").pop();
        const nomeUnico   = `${Date.now()}_${nome.replace(/\s+/g, "_")}.${extensao}`;
        const caminho     = `solicitacoes/${nomeUnico}`;


        const { error: erroUpload } = await supabaseClient
            .storage
            .from("referencias")
            .upload(caminho, arquivo);


        if (erroUpload) {
            console.error("Erro no upload:", erroUpload);
            alert("Erro ao enviar o arquivo. Verifique sua conexão e tente novamente.");
            if (btnEnviar) {
                btnEnviar.disabled = false;
                btnEnviar.textContent = "Enviar Solicitação";
            }
            return;
        }


        // Gera URL pública do arquivo
        const { data: urlData } = supabaseClient
            .storage
            .from("referencias")
            .getPublicUrl(caminho);


        arquivoUrl = urlData.publicUrl;
    }


    // ── Salva no banco ───────────────────────────────────────────────────────
    if (btnEnviar) btnEnviar.textContent = "Salvando...";


    const solicitacao = {
        nome, setor, tipo, objetivo, prioridade, entrega,
        whatsapp, email_solicitante: emailSolicitante,
        campanha, texto_obrigatorio: textoObrigatorio,
        publico_alvo: publicoAlvo, link_referencia: linkReferencia,
        observacoes,
        arquivo_url: arquivoUrl,
        status: "Nova",
        responsavel: ""
    };


    const { error } = await supabaseClient
        .from("Solicitacoes")
        .insert([solicitacao]);


    if (error) {
        console.error(error);
        alert("Erro ao salvar a solicitação. Tente novamente.");
        if (btnEnviar) {
            btnEnviar.disabled = false;
            btnEnviar.textContent = "Enviar Solicitação";
        }
        return;
    }


    window.location.href = "index.html?enviado=true";


}




// ===============================
// CONTADORES DA HOME
// ===============================


async function atualizarHome() {


    if (!document.getElementById("homeNovas")) return;


    const { data, error } = await supabaseClient
        .from("Solicitacoes")
        .select("status");


    if (error || !data) return;


    setText("homeNovas",    data.filter(i => i.status === "Nova").length);
    setText("homeAnalise",  data.filter(i => i.status === "Analise").length);
    setText("homeCriacao",  data.filter(i => i.status === "Criacao").length);
    setText("homeEntregue", data.filter(i => i.status === "Entregue").length);


}




// ===============================
// CONTADORES DO DASHBOARD
// ===============================


async function atualizarDashboard() {


    if (!document.getElementById("totalNovas")) return;


    const { data, error } = await supabaseClient
        .from("Solicitacoes")
        .select("*")
        .order("id", { ascending: false });


    if (error || !data) return;


    setText("totalNovas",    data.filter(i => i.status === "Nova").length);
    setText("totalAnalise",  data.filter(i => i.status === "Analise").length);
    setText("totalCriacao",  data.filter(i => i.status === "Criacao").length);
    setText("totalEntregue", data.filter(i => i.status === "Entregue").length);


    preencherTabelaRecentes(data.slice(0, 10));


}




// ===============================
// TABELA DE SOLICITAÇÕES RECENTES
// ===============================


function preencherTabelaRecentes(data) {


    const tbody = document.getElementById("tabelaCorpo");
    if (!tbody) return;


    tbody.innerHTML = "";


    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#888;padding:30px;">Nenhuma solicitação encontrada.</td></tr>`;
        return;
    }


    const statusLabel = {
        Nova:      { texto: "Nova",       classe: "status-nova"      },
        Analise:   { texto: "Em análise", classe: "status-analise"   },
        Criacao:   { texto: "Em criação", classe: "status-criacao"   },
        Aprovacao: { texto: "Aprovação",  classe: "status-aprovacao" },
        Entregue:  { texto: "Entregue",   classe: "status-entregue"  }
    };


    const prioridadeLabel = {
        Alta:  { texto: "Alta",  classe: "alta"  },
        Média: { texto: "Média", classe: "media" },
        Baixa: { texto: "Baixa", classe: "baixa" }
    };


    data.forEach(item => {


        const s = statusLabel[item.status]         || { texto: item.status,      classe: "" };
        const p = prioridadeLabel[item.prioridade]  || { texto: item.prioridade,  classe: "" };


        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.title = "Clique para ver o briefing completo";


        tr.innerHTML = `
            <td>#${String(item.id).padStart(3, "0")}</td>
            <td>${item.nome}</td>
            <td>${item.setor}</td>
            <td><span class="status ${s.classe}">${s.texto}</span></td>
            <td><span class="priority ${p.classe}">${p.texto}</span></td>
            <td>${formatarData(item.entrega)}</td>
        `;


        // Clique na linha abre o modal de detalhe
        tr.addEventListener("click", () => abrirModalDetalhe(item));


        tbody.appendChild(tr);


    });


}




// ===============================
// RESUMO DO DASHBOARD
// ===============================


async function atualizarResumo() {


    if (!document.getElementById("totalDemandas")) return;


    const { data, error } = await supabaseClient
        .from("Solicitacoes")
        .select("*")
        .order("id", { ascending: false });


    if (error || !data) return;


    const total    = data.length;
    const entregue = data.filter(i => i.status === "Entregue").length;
    const alta     = data.filter(i => i.prioridade === "Alta").length;
    const media    = data.filter(i => i.prioridade === "Média").length;
    const baixa    = data.filter(i => i.prioridade === "Baixa").length;
    const pct      = total > 0 ? Math.round((entregue / total) * 100) : 0;


    setText("totalDemandas", total);
    setText("totalAlta",     alta);
    setText("totalMedia",    media);
    setText("totalBaixa",    baixa);


    const barra = document.getElementById("barraConclusao");
    if (barra) barra.style.width = pct + "%";
    setText("textoConclusao", pct + "% concluído");


    const lista = document.getElementById("ultimasSolicitacoes");
    if (lista) {
        lista.innerHTML = "";
        data.slice(0, 5).forEach(item => {
            const li = document.createElement("li");
            li.textContent = `${item.tipo} — ${item.nome} (${item.setor})`;
            lista.appendChild(li);
        });
    }


}




// ===============================
// MODAL DE DETALHE DA SOLICITAÇÃO
// Usado no dashboard (tabela) e no kanban (cards)
// ===============================


function abrirModalDetalhe(item) {


    const anterior = document.getElementById("modalDetalhe");
    if (anterior) anterior.remove();


    const statusLabel = {
        Nova: "Nova", Analise: "Em análise",
        Criacao: "Em criação", Aprovacao: "Aprovação", Entregue: "Entregue"
    };
    const prioridadeCor = { Alta: "#c92a2a", Média: "#e67700", Baixa: "#2b8a3e" };
    const cor = prioridadeCor[item.prioridade] || "#555";


    // Seção com título fixo — sempre aparece
    const secao = (titulo, campos) => `
        <div style="margin-bottom:22px;">
            <div style="font-size:11px;font-weight:700;color:#007c80;text-transform:uppercase;
                letter-spacing:.08em;padding-bottom:8px;border-bottom:2px solid #eaf4f2;margin-bottom:14px;">
                ${titulo}
            </div>
            ${campos}
        </div>`;


    // Campo individual — mostra "—" se vazio, para o designer saber que não foi preenchido
    const campo = (label, valor) => `
        <div style="margin-bottom:14px;">
            <div style="font-size:11px;font-weight:600;color:#637381;text-transform:uppercase;
                letter-spacing:.06em;margin-bottom:4px;">${label}</div>
            <div style="font-size:15px;color:${valor ? "#173042" : "#bbb"};line-height:1.6;">
                ${valor || "—"}
            </div>
        </div>`;


    // Campo link — só aparece se tiver valor
    const campoLink = (label, valor) => {
        if (!valor) return campo(label, null);
        return `<div style="margin-bottom:14px;">
            <div style="font-size:11px;font-weight:600;color:#637381;text-transform:uppercase;
                letter-spacing:.06em;margin-bottom:4px;">${label}</div>
            <a href="${valor}" target="_blank"
                style="font-size:14px;color:#007c80;word-break:break-all;">${valor}</a>
        </div>`;
    };


    const modal = document.createElement("div");
    modal.id = "modalDetalhe";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;";


    modal.innerHTML = `
        <div style="background:white;border-radius:24px;padding:36px;max-width:660px;width:100%;
            max-height:90vh;overflow-y:auto;position:relative;box-shadow:0 24px 60px rgba(0,0,0,.18);">


            <button onclick="document.getElementById('modalDetalhe').remove()" style="
                position:absolute;top:20px;right:20px;background:#f4f4f4;border:none;
                border-radius:50%;width:36px;height:36px;font-size:22px;cursor:pointer;color:#555;">×</button>


            <!-- Cabeçalho -->
            <div style="margin-bottom:20px;">
                <span style="display:inline-block;background:#eaf4f2;color:#007c80;font-size:12px;
                    font-weight:700;padding:4px 12px;border-radius:999px;margin-bottom:10px;">
                    #${String(item.id).padStart(3,"0")} · ${statusLabel[item.status] || item.status}
                </span>
                <h2 style="font-family:'Playfair Display',serif;font-size:26px;margin:0 0 8px;color:#173042;">
                    ${item.tipo}
                </h2>
                <span style="display:inline-block;font-size:12px;font-weight:700;padding:3px 10px;
                    border-radius:999px;background:${cor}22;color:${cor};">
                    Prioridade ${item.prioridade}
                </span>
            </div>


            <hr style="border:none;border-top:1px solid #eee;margin:0 0 20px;">


            ${secao("👤 Dados do Solicitante",
                campo("Nome",     item.nome) +
                campo("Setor",    item.setor) +
                campo("WhatsApp", item.whatsapp) +
                campo("E-mail",   item.email_solicitante)
            )}


            ${secao("🎨 Informações da Arte",
                campo("Tipo da Peça",      item.tipo) +
                campo("Campanha",          item.campanha) +
                campo("Objetivo da Arte",  item.objetivo) +
                campo("Texto Obrigatório", item.texto_obrigatorio) +
                campo("Público-Alvo",      item.publico_alvo)
            )}


            ${secao("📅 Prazo",
                campo("Data Desejada", formatarData(item.entrega)) +
                campo("Prioridade",    item.prioridade)
            )}


            ${secao("📎 Referências",
                campo(item.arquivo_url ? "Arquivo Enviado" : "Arquivo Enviado", item.arquivo_url ? `<a href="${item.arquivo_url}" target="_blank" style="color:#007c80;">Ver arquivo</a>` : null) +
                campoLink("Link de Referência", item.link_referencia)
            )}


            ${secao("📝 Observações Finais",
                campo("Observações", item.observacoes)
            )}


            <div style="text-align:right;margin-top:16px;">
                <button onclick="document.getElementById('modalDetalhe').remove()" style="
                    background:#007c80;color:white;border:none;padding:12px 28px;
                    border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;">Fechar</button>
            </div>
        </div>`;


    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);


}


// Helper legado — mantido para compatibilidade
function campoDetalhe(label, valor) {
    if (!valor) return "";
    return `
        <div style="margin-bottom:18px;">
            <div style="font-size:12px;font-weight:600;color:#637381;margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em;">
                ${label}
            </div>
            <div style="font-size:15px;color:#173042;line-height:1.6;">${valor}</div>
        </div>
    `;
}




// ===============================
// LIMPAR DADOS
// ===============================


async function limparDados() {


    const confirmar = confirm("Tem certeza que deseja apagar TODAS as solicitações? Essa ação não pode ser desfeita.");
    if (!confirmar) return;


    const { error } = await supabaseClient
        .from("Solicitacoes")
        .delete()
        .neq("id", 0);


    if (error) {
        console.error("Erro ao limpar dados:", error);
        alert("Erro ao limpar os dados.");
        return;
    }


    window.location.reload();


}




// ===============================
// UTILITÁRIOS
// ===============================


function setText(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
}


function formatarData(dataISO) {
    if (!dataISO) return "—";
    const partes = dataISO.split("-");
    if (partes.length < 3) return dataISO;
    return `${partes[2]}/${partes[1]}`;
}


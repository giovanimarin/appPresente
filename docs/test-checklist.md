# Presente — Checklist de Testes Manuais

> **Legenda:** ✅ OK · ❌ Falhou · ⚠️ Parcial · ⏭️ Pulado

---

## AMBIENTES DISPONÍVEIS

### Staging (preferencial para testes)

| Serviço | URL |
|---------|-----|
| Web (dashboard + guardian) | https://staging.apppresente.com.br |
| API health check | https://staging-api.apppresente.com.br/health |
| App Android | APK disponível no painel Expo — perfil `preview` |

> Staging é atualizado automaticamente a cada push no branch `staging`.  
> Banco de dados de staging é **independente** do de produção.

### Local (desenvolvimento)

| Serviço | URL |
|---------|-----|
| Web | https://staging.apppresente.com.br |
| API health check | https://staging-api.apppresente.com.br/health |

**Pré-requisito local:**
- [ ] Docker Desktop aberto (baleia verde na bandeja)
- [ ] `./dev.sh --reset` executado sem erros
- [ ] https://staging-api.apppresente.com.br/health retorna `{"status":"ok"}`

---

## PRÉ-REQUISITO: Banco populado

Antes de iniciar os testes em staging, crie a escola e os dados base seguindo o **Módulo 1** e **Módulo 2** em ordem. Todos os módulos seguintes dependem desses dados.

---

## MÓDULO 1 — Plataforma (Admin SaaS)

**URL:** `/platform`  
**Credenciais:** `admin@presente.com.br` / `Platform@2026`

### 1.1 Login na plataforma
- [ ] Tela de login da plataforma aparece
- [ ] Login com credenciais incorretas mostra erro
- [ ] Login correto redireciona para o painel

### 1.2 Criação de escola
- [ ] Clicar em "Nova Escola"
- [ ] Preencher:
  - Nome: `Escola Girassol`
  - E-mail: `admin@girassol.com.br`
  - Plano: Starter
  - Nome do admin: `Diretor Teste`
  - E-mail do admin: `diretor@girassol.com.br`
- [ ] Submeter — tela de sucesso aparece com credenciais temporárias
- [ ] **Anotar a senha temporária gerada** (mostrada apenas uma vez)
- [ ] Escola aparece na listagem da plataforma

### 1.3 Gestão de escolas
- [ ] Clicar na escola criada — abre página de detalhes
- [ ] Detalhes mostram: nome, e-mail, plano, data de criação
- [ ] Logout da plataforma funciona

---

## MÓDULO 2 — Dashboard Escola (Admin/Diretor)

**URL:** `/login`  
**Credenciais:** `diretor@girassol.com.br` / `<senha temporária do passo 1.2>`

### 2.1 Primeiro acesso
- [ ] Login com e-mail e senha temporária
- [ ] Redireciona para `/dashboard`
- [ ] Painel inicial carrega com KPIs zerados

### 2.2 Configurações da escola
- [ ] Ir em **Configurações** (menu lateral → Escola)
- [ ] Dados da escola aparecem preenchidos
- [ ] Campo CEP: digitar um CEP válido → endereço preenchido automaticamente via ViaCEP
- [ ] Editar nome ou telefone → Salvar sem erro

### 2.3 Cadastro de usuários (equipe)
Ir em **Equipe** → criar cada um:

#### Secretária
- [ ] Criar: Nome `Secretária Ana`, E-mail `secretaria@girassol.com.br`, Função `SECRETARY`, CPF `111.444.777-35`, Senha `Teste@2026`
- [ ] Usuário aparece na lista com CPF formatado

#### Coordenadora
- [ ] Criar: Nome `Coordenadora Bia`, E-mail `coord@girassol.com.br`, Função `COORDINATOR`, Senha `Teste@2026`

#### Professor
- [ ] Criar: Nome `Prof. Carlos`, E-mail `prof@girassol.com.br`, Função `TEACHER`, Senha `Teste@2026`

#### CPF em equipe
- [ ] Ao editar um usuário existente, campo CPF aparece com máscara automática ao digitar
- [ ] Salvar com CPF → aparece no perfil

#### Integridade referencial — usuário
- [ ] Vincular o professor a uma turma (passo 2.5 deve ser feito antes)
- [ ] Tentar excluir o professor permanentemente → deve bloquear com mensagem de erro
- [ ] Desvincular o professor da turma → excluir permanente deve funcionar

### 2.4 Cadastro de salas
Ir em **Salas** (menu lateral → Escola):

- [ ] Página lista salas (vazia no início)
- [ ] Criar: Nome `Sala 1`, Capacidade `30` → aparece na lista
- [ ] Criar: Nome `Laboratório`, Capacidade `20` → aparece na lista
- [ ] Criar: Nome `Sala 2`, Capacidade `35`
- [ ] Editar nome de uma sala → salvar → atualiza na lista
- [ ] Desativar sala → badge muda para "Inativo"
- [ ] Marcar "Ver desativadas" → sala desativada aparece
- [ ] Reativar sala → volta para ativo
- [ ] Tentar criar sala com nome duplicado → erro "já existe uma sala com esse nome"
- [ ] Sala vinculada a turma: tentar excluir → bloqueado com mensagem de erro
- [ ] Sala sem turma: excluir → removida da lista

### 2.5 Cadastro de turmas
Ir em **Turmas** → criar:

- [ ] Turma 1: Nome `1º Ano A`, Série `1º Ano`, Turno `Matutino`, Sala `Sala 1`
- [ ] Turma 2: Nome `3º Ano B`, Série `3º Ano`, Turno `Vespertino`, Sala `Sala 2`
- [ ] Ambas aparecem na listagem

#### Conflito de sala por turno
- [ ] Tentar criar Turma 3 com Sala `Sala 1` e Turno `Matutino` → erro "Sala já ocupada neste turno por 1º Ano A"
- [ ] Criar Turma 3 com Sala `Sala 1` e Turno `Vespertino` → **deve funcionar** (turno diferente)
- [ ] Editar `1º Ano A` para mudar a sala para `Laboratório` → salvar → sem conflito
- [ ] Editar `1º Ano A` para mudar para a mesma sala e turno de outra turma → erro de conflito

#### Integridade referencial — turma
- [ ] Adicionar aluno à turma (passo 2.6)
- [ ] Tentar excluir a turma permanentemente → deve bloquear (turma tem alunos)
- [ ] Tentar excluir com professor vinculado → deve bloquear

### 2.6 Cadastro de alunos
Ir em **Alunos** → adicionar:

- [ ] Aluno 1: Nome `Lucas Silva`, Matrícula `2026001`, Turma `1º Ano A`, CPF `529.982.247-25`
- [ ] Aluno 2: Nome `Maria Souza`, Matrícula `2026002`, Turma `1º Ano A`
- [ ] Aluno 3: Nome `Pedro Lima`, Matrícula `2026003`, Turma `3º Ano B`
- [ ] CPF do Lucas aparece formatado `529.982.247-25` na tela de detalhe
- [ ] Campo CPF no formulário mascara automaticamente ao digitar

#### Integridade referencial — aluno
- [ ] Vincular responsável ao Lucas (passo 2.8)
- [ ] Tentar excluir o Lucas permanentemente → deve bloquear (tem responsável vinculado)

### 2.7 Importação CSV
- [ ] Em **Alunos**, clicar em "Importar CSV"
- [ ] Baixar o modelo CSV
- [ ] Preencher 3 linhas com dados novos (turma `5º Ano A`), incluindo CPF no formato `XXX.XXX.XXX-XX`
- [ ] Upload do CSV preenchido
- [ ] Prévia mostra coluna CPF formatada
- [ ] Clicar em "Importar" — contadores corretos (alunos, turmas, responsáveis criados)
- [ ] Turma `5º Ano A` aparece em **Turmas** com os alunos importados

### 2.8 Cadastro manual de responsáveis
Ir em **Responsáveis**:

- [ ] Clicar em "Novo responsável"
- [ ] Preencher: Nome `Responsável Teste`, Telefone `(11) 99999-0001`, E-mail `giovanimarin@gmail.com`, CPF `123.456.789-09`
- [ ] Responsável aparece na lista com CPF `123.456.789-09`
- [ ] Tentar criar outro responsável com o mesmo CPF → erro "CPF já em uso"
- [ ] Tentar criar com mesmo telefone → erro "Telefone já em uso"

### 2.9 Vinculação responsável ↔ aluno (com campos de vínculo)
Na tela do aluno `Lucas Silva`:

- [ ] Ir em **Alunos** → clicar em Lucas Silva
- [ ] Seção "Responsáveis" aparece
- [ ] Clicar em "Vincular responsável existente"
- [ ] Buscar por nome/e-mail → Responsável Teste encontrado
- [ ] Preencher:
  - Parentesco: `Pai`
  - Marcar "Responsável Legal" ✅
  - Marcar "Responsável Financeiro" ✅
- [ ] Vincular → responsável aparece na lista com badges **Legal** (azul) e **Financeiro** (âmbar)
- [ ] Badge de parentesco exibe `Pai`

#### Novo responsável inline (sem cadastro prévio)
- [ ] Na tela do aluno, aba "Novo responsável"
- [ ] Preencher: Nome, E-mail, Telefone, CPF `987.654.321-00`
- [ ] Campos de vínculo: Parentesco `Mãe`, Legal ✅, Financeiro ❌
- [ ] Criar e vincular → responsável criado e aparece com badge **Legal** apenas
- [ ] Responsável criado aparece em **Responsáveis** com CPF formatado

#### Editar vínculo existente
- [ ] Clicar em vínculo existente → editar campos de parentesco/legal/financeiro
- [ ] Salvar → badges atualizados na tela do aluno

Na tela do responsável:
- [ ] Ir em **Responsáveis** → clicar em Responsável Teste
- [ ] Seção "Alunos vinculados" mostra Lucas Silva com parentesco e badges

---

## MÓDULO 3 — Comunicados (Admin)

### 3.1 Criar comunicado rascunho
Ir em **Comunicados** → "Novo comunicado":

- [ ] Tipo: `Aviso`, Título: `Reunião de pais — Maio`
- [ ] Mensagem: `Reunião no dia 15/05 às 19h no auditório.`
- [ ] Escopo: `Por turma` → selecionar `1º Ano A`
- [ ] **Público-alvo:** `Todos os responsáveis`
- [ ] Opção "Exigir confirmação de leitura": marcada
- [ ] **Não** marcar "Enviar imediatamente"
- [ ] Clicar em "Salvar rascunho" → status `Rascunho`

### 3.2 Criar comunicado urgente com filtro de público
- [ ] Tipo `Urgente`, Título `Aviso financeiro`
- [ ] Turma `1º Ano A`, **Público-alvo:** `Responsável Financeiro`
- [ ] Enviar imediatamente → status `Enviado`
- [ ] Somente responsáveis marcados como financeiros devem receber

### 3.3 Comunicado para responsáveis legais
- [ ] Tipo `Informativo`, Título `Autorização de viagem`
- [ ] Escopo por turma, **Público-alvo:** `Responsável Legal`
- [ ] Enviar → status `Enviado`

### 3.4 Criar comunicado por aluno
- [ ] Tipo `Informativo`, Título `Nota de matemática`, escopo por aluno → `Lucas Silva`
- [ ] Público-alvo: `Todos os responsáveis`
- [ ] Enviar imediatamente → status `Enviado`

### 3.5 Enviar rascunho manualmente
- [ ] Localizar "Reunião de pais" (rascunho) → clicar no ícone de envio → status `Enviado`

### 3.6 Cancelar comunicado
- [ ] Localizar comunicado enviado → cancelar → status `Cancelado`

### 3.7 Exportar relatório de leitura
- [ ] Comunicado com status `Enviado` → download CSV → colunas: Responsável, Aluno, Lido, Data/Hora

---

## MÓDULO 4 — Agenda (Admin)

Ir em **Agenda**:

### 4.1 Criar evento
- [ ] Tipo `Reunião de pais`, Título `Reunião maio`, data futura, local `Auditório`, turma `1º Ano A`
- [ ] Marcar como "Importante" → salvar → aparece na lista

### 4.2 Criar prova
- [ ] Tipo `Prova`, Título `Prova de Português`, data futura → salvar

### 4.3 Cancelar evento
- [ ] Localizar evento → cancelar → status muda para cancelado

---

## MÓDULO 5 — Formulários (Admin)

Ir em **Formulários**:

### 5.1 Criar formulário personalizado
- [ ] Clicar em "Novo formulário"
- [ ] Título: `Autorização Festa Junina`
- [ ] Adicionar campo Texto: `Nome do responsável`
- [ ] Adicionar campo Seleção: `Seu filho participará?`, opções `Sim / Não`
- [ ] Data de expiração 30 dias à frente, status `Aberto` → Salvar

### 5.2 Templates pré-definidos
- [ ] Seção de templates aparece com botões (Justificativa de Falta, Atestado Médico, Saída Antecipada)
- [ ] Clicar em "Criar" para `Justificativa de Falta` → formulário criado
- [ ] Botão "Justificativa de Falta" desaparece da seção de templates
- [ ] Criar os outros dois templates → seção de templates some completamente

### 5.3 Ver submissões
- [ ] Clicar no formulário → lista de submissões (preenchida no módulo 8)

---

## MÓDULO 6 — Controle de acesso por papel

### 6.1 Login como Secretária
**Credenciais:** `secretaria@girassol.com.br / Teste@2026`

- [ ] Login funciona → dashboard carrega
- [ ] Menu lateral **não** exibe "Equipe" nem "Configurações"
- [ ] Menu lateral **exibe** "Salas" (Secretária tem acesso)
- [ ] Exibe: Painel, Turmas, Alunos, Responsáveis, Salas, Comunicados, Agenda, Agendamentos, Formulários
- [ ] Pode criar comunicados
- [ ] Pode gerenciar salas

### 6.2 Login como Coordenadora
**Credenciais:** `coord@girassol.com.br / Teste@2026`

- [ ] Login funciona → dashboard carrega
- [ ] Menu **não** exibe "Equipe", "Configurações", "Salas" nem "Formulários"
- [ ] Exibe: Painel, Turmas, Alunos, Responsáveis, Comunicados, Agenda, Agendamentos
- [ ] Pode criar comunicados

### 6.3 Login como Professor
**Credenciais:** `prof@girassol.com.br / Teste@2026`

- [ ] Login funciona → dashboard carrega
- [ ] Header mostra aviso "Visualizando apenas suas turmas"
- [ ] Menu **não** exibe "Equipe", "Configurações", "Salas" nem "Formulários"
- [ ] **Turmas:** exibe apenas turmas vinculadas ao professor
- [ ] **Alunos:** exibe apenas alunos dessas turmas
- [ ] **Responsáveis:** exibe apenas responsáveis desses alunos
- [ ] Tentar acessar `/dashboard/users` diretamente → redireciona ou nega acesso
- [ ] Tentar acessar `/dashboard/settings` diretamente → redireciona ou nega acesso
- [ ] Tentar acessar `/dashboard/rooms` diretamente → redireciona ou nega acesso

### 6.4 Vincular professor à turma (como Admin)
- [ ] Voltar para o Admin → ir em **Turmas** → `1º Ano A` → aba "Professores"
- [ ] Vincular `Prof. Carlos`
- [ ] Fazer login como professor novamente
- [ ] Agora vê `1º Ano A` e seus alunos/responsáveis

---

## MÓDULO 7 — Agendamentos (Staff)

Ir em **Agendamentos** (logado como Admin ou Professor):

### 7.1 Criar horário avulso
- [ ] Clicar em "Novo Horário"
- [ ] Preencher: Título `Atendimento — Semana de Provas`, data futura, duração 30 min, `Todos os responsáveis`
- [ ] Criar → slot aparece com badge `Disponível`

### 7.2 Criar horário por turma
- [ ] Novo Horário, Título `Reunião 1º Ano A`, `Responsáveis de uma turma` → `1º Ano A`
- [ ] Criar → slot aparece com nome da turma

### 7.3 Criar série recorrente semanal
- [ ] Novo Horário, Título `Atendimento Semanal`
- [ ] Ativar toggle "Horário recorrente", Tipo `Semanal`
- [ ] Selecionar dias: `Qua` e `Sex`, Horário `16:00`, período de 4 semanas
- [ ] Preview exibe as datas
- [ ] Clicar em "Criar Série" → múltiplos slots com badge `Recorrente`

### 7.4 Criar série quinzenal
- [ ] Novo Horário, Título `Reunião Quinzenal`, Recorrente `Quinzenal`, dia `Ter`, horário `10:00`, 2 meses
- [ ] Criar → slots a cada 2 semanas nas terças

### 7.5 Cancelar horário avulso
- [ ] Localizar slot avulso disponível → cancelar → status `Cancelado`

### 7.6 Cancelar horário recorrente
- [ ] Localizar slot da série → cancelar → modal com 3 opções
- [ ] Selecionar "Este e os próximos" → confirmar
- [ ] Slots a partir dessa data: `Cancelado`; anteriores: `Disponível`

### 7.7 Excluir horário disponível
- [ ] Slot sem reserva → lixeira → confirmar → removido
- [ ] Slot com reserva → botão de lixeira não aparece

### 7.8 Filtros
- [ ] Filtrar por status `Reservado` → mostra apenas reservados
- [ ] Filtrar por data → mostra apenas slots a partir da data
- [ ] Limpar filtros → volta a mostrar tudo

---

## MÓDULO 8 — App do Responsável

> **Pré-requisito:** Responsável `giovanimarin@gmail.com` criado e vinculado ao Lucas Silva (passo 2.8/2.9)

**URL:** `/guardian`

### 8.1 Login via OTP
- [ ] Digitar `giovanimarin@gmail.com` → "Enviar código"
- [ ] Checar e-mail — código de 6 dígitos recebido
- [ ] Digitar código → login → redireciona para `/guardian/feed`

### 8.2 Feed de avisos
- [ ] Comunicados enviados para Lucas Silva aparecem
- [ ] Comunicado com público-alvo `Legal` aparece (responsável é legal)
- [ ] Tipo urgente tem destaque visual diferente
- [ ] Ponto vermelho indica não lido
- [ ] Clicar em "Confirmar leitura" → botão some, aparece checkmark verde

### 8.3 Agenda
- [ ] Aba **Agenda** → eventos dos passos 4.1/4.2 aparecem agrupados por data

### 8.4 Agendamentos — ver horários disponíveis
- [ ] Aba **Reuniões** na barra inferior
- [ ] Slots criados no módulo 7 aparecem (avulso + série)
- [ ] Apenas slots com `scope=ALL` ou da turma do Lucas (`1º Ano A`) devem aparecer

### 8.5 Reservar horário
- [ ] Clicar em um horário disponível → modal de confirmação
- [ ] Selecionar aluno `Lucas Silva`
- [ ] Adicionar observação → Confirmar → banner verde
- [ ] Slot some da lista de disponíveis

### 8.6 Ver meus agendamentos
- [ ] Aba "Meus Agendamentos"
- [ ] Reserva aparece com status `Confirmado`, data/hora, aluno, observação

### 8.7 Cancelar agendamento
- [ ] Clicar em "Cancelar agendamento" → confirmar
- [ ] Status muda para `Cancelado`
- [ ] Slot volta a aparecer em disponíveis

### 8.8 Cancelamento pelo staff
- [ ] Como Admin → **Agendamentos** → slot `Reservado` → cancelar
- [ ] Slot volta para `Disponível`
- [ ] No app do responsável, reserva aparece como `Cancelado`

### 8.9 Pedidos (formulários)
- [ ] Aba **Pedidos** → "Novo pedido"
- [ ] Selecionar `Justificativa de Falta`, aluno `Lucas Silva`
- [ ] Preencher e enviar → protocolo gerado, status `Enviado`

### 8.10 Perfil
- [ ] Aba **Perfil** → nome e e-mail corretos
- [ ] Editar nome → salvar → atualizado
- [ ] Botão "Sair" → redireciona para `/guardian`

---

## MÓDULO 9 — Verificação cruzada staff × responsável

- [ ] Como responsável: confirmar leitura de comunicado
- [ ] Como admin: download CSV do comunicado → linha do responsável mostra `Lido = Sim`
- [ ] Como admin: slot reservado mostra nome do responsável e aluno
- [ ] Como responsável: formulário enviado aparece no admin em **Formulários**
- [ ] Admin resolve formulário → responsável vê status `Resolvido`

---

## MÓDULO 10 — Integridade referencial

### 10.1 Responsável vinculado
- [ ] Tentar excluir responsável com aluno vinculado → erro "vinculado a X aluno(s)"
- [ ] Desvincular aluno → exclusão funciona

### 10.2 Aluno com responsável
- [ ] Tentar excluir aluno com responsável vinculado → erro bloqueando
- [ ] Desvincular responsável → exclusão funciona

### 10.3 Turma com alunos ou professores
- [ ] Turma com alunos: exclusão bloqueada
- [ ] Turma com professor vinculado: exclusão bloqueada
- [ ] Remover alunos e professor → exclusão funciona

### 10.4 Sala vinculada a turma
- [ ] Tentar excluir sala em uso por uma turma → bloqueado com mensagem de erro
- [ ] Remover sala da turma (editar turma) → exclusão da sala funciona

### 10.5 Usuário professor vinculado a turma
- [ ] Tentar excluir professor vinculado a turma → bloqueado
- [ ] Remover da turma → exclusão funciona

---

## MÓDULO 11 — CPF (Equipe e Alunos)

### 11.1 CPF em equipe
- [ ] Cadastrar usuário com CPF → aparece formatado `XXX.XXX.XXX-XX` na lista/perfil
- [ ] Campo CPF mascara automaticamente ao digitar
- [ ] Editar usuário existente → campo CPF aparece preenchido com máscara

### 11.2 CPF em alunos
- [ ] Cadastrar aluno com CPF → aparece formatado na tela de detalhe
- [ ] Campo CPF mascara automaticamente ao digitar
- [ ] Editar aluno existente → campo CPF aparece preenchido com máscara

---

## MÓDULO 12 — CPF do Responsável

- [ ] Cadastrar responsável com CPF → aparece formatado `XXX.XXX.XXX-XX` na lista
- [ ] Tentar cadastrar segundo responsável com mesmo CPF → erro "CPF já em uso"
- [ ] Editar CPF de um responsável → campo mascara automaticamente
- [ ] Importação CSV com CPF: responsável encontrado pelo CPF (não cria duplicata)
- [ ] Importação CSV sem CPF: responsável encontrado pelo telefone (comportamento anterior)
- [ ] Na tela de detalhe do responsável: CPF editável com máscara
- [ ] Novo responsável inline (tela do aluno): campo CPF com máscara

---

## MÓDULO 13 — Testes de borda

### 13.1 Validações
- [ ] Criar comunicado sem turma → erro inline
- [ ] OTP com e-mail inválido → erro
- [ ] Código OTP errado → erro
- [ ] Código OTP expirado (após 10 min) → erro adequado
- [ ] Criar horário de agendamento sem título → erro inline
- [ ] Criar série recorrente sem selecionar dia → erro inline
- [ ] Reservar horário sem selecionar aluno (multi-filhos) → erro inline
- [ ] Criar sala com nome duplicado → erro inline
- [ ] Criar turma com sala e turno já ocupados → erro com nome da turma conflitante

### 13.2 Permissões de acesso direto por URL
- [ ] Professor: acessar `/dashboard/users` → redireciona ou nega
- [ ] Professor: acessar `/dashboard/settings` → redireciona ou nega
- [ ] Professor: acessar `/dashboard/forms` → redireciona ou nega
- [ ] Professor: acessar `/dashboard/rooms` → redireciona ou nega
- [ ] Responsável: acessar `/dashboard` → redireciona para `/guardian`
- [ ] Token expirado → redireciona para login automaticamente

### 13.3 Estados vazios
- [ ] Agenda sem eventos → "Sem eventos próximos"
- [ ] Feed sem comunicados → "Tudo em dia!"
- [ ] Agendamentos sem horários disponíveis → mensagem adequada
- [ ] Meus agendamentos vazio → mensagem adequada
- [ ] Salas: lista vazia → estado vazio adequado

### 13.4 Rede (staging — app mobile)
- [ ] Instalar APK do perfil `preview` disponível no painel Expo
- [ ] Login do responsável funciona
- [ ] Aba Reuniões carrega e permite reservar

---

## RESUMO FINAL

| Módulo | Status | Observações |
|--------|--------|-------------|
| 1. Plataforma SaaS | | |
| 2. Dashboard Admin | | |
| 3. Comunicados | | |
| 4. Agenda | | |
| 5. Formulários | | |
| 6. Controle de acesso por papel | | |
| 7. Agendamentos (Staff) | | |
| 8. App Responsável | | |
| 9. Verificação cruzada | | |
| 10. Integridade referencial | | |
| 11. CPF (Equipe e Alunos) | | |
| 12. CPF do Responsável | | |
| 13. Testes de borda | | |

---

## Credenciais de referência

| Papel | E-mail | Senha |
|-------|--------|-------|
| Admin Plataforma | admin@presente.com.br | Platform@2026 |
| Diretor | diretor@girassol.com.br | `<senha temporária>` |
| Secretária | secretaria@girassol.com.br | Teste@2026 |
| Coordenadora | coord@girassol.com.br | Teste@2026 |
| Professor | prof@girassol.com.br | Teste@2026 |
| Responsável | giovanimarin@gmail.com | OTP por e-mail |

---

*Atualizado em 12/05/2026 — Presente v1.6*

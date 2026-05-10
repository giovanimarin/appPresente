# Presente — Checklist de Testes Manuais

> **Base URL:** http://192.168.2.59:3000  
> **Banco zerado:** rode `./dev.sh --reset` antes de começar  
> **Legenda:** ✅ OK · ❌ Falhou · ⚠️ Parcial · ⏭️ Pulado

---

## PRÉ-REQUISITO: Ambiente rodando

- [ ] Docker Desktop aberto (baleia verde na bandeja)
- [ ] `./dev.sh --reset` executado sem erros
- [ ] Terminal mostra "Presente rodando!" com o IP da rede
- [ ] http://192.168.2.59:3000 carrega a tela inicial
- [ ] http://192.168.2.59:3001/health retorna `{"status":"ok"}`

---

## MÓDULO 1 — Plataforma (Admin SaaS)

**URL:** http://192.168.2.59:3000/platform  
**Credenciais:** `admin@presente.com.br` / `Platform@2026`

### 1.1 Login na plataforma
- [ ] Acessar http://192.168.2.59:3000/platform
- [ ] Tela de login da plataforma aparece
- [ ] Login com credenciais incorretas mostra erro
- [ ] Login com `admin@presente.com.br / Platform@2026` redireciona para o painel

### 1.2 Criação de escola
- [ ] Painel lista escolas (vazio no início)
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

**URL:** http://192.168.2.59:3000/login  
**Credenciais:** `diretor@girassol.com.br` / `<senha temporária do passo 1.2>`

### 2.1 Primeiro acesso
- [ ] Acessar http://192.168.2.59:3000/login
- [ ] Login com e-mail e senha temporária
- [ ] Redireciona para `/dashboard`
- [ ] Painel inicial carrega com KPIs zerados

### 2.2 Configurações da escola
- [ ] Ir em **Escola** (menu lateral)
- [ ] Dados da escola aparecem preenchidos
- [ ] Editar nome ou telefone → Salvar sem erro

### 2.3 Cadastro de usuários (equipe)
Ir em **Equipe** → criar cada um:

#### Secretária
- [ ] Criar: Nome `Secretária Ana`, E-mail `secretaria@girassol.com.br`, Função `SECRETARY`, Senha `Teste@2026`
- [ ] Usuário aparece na lista

#### Coordenadora
- [ ] Criar: Nome `Coordenadora Bia`, E-mail `coord@girassol.com.br`, Função `COORDINATOR`, Senha `Teste@2026`

#### Professor
- [ ] Criar: Nome `Prof. Carlos`, E-mail `prof@girassol.com.br`, Função `TEACHER`, Senha `Teste@2026`

#### Integridade referencial — usuário
- [ ] Vincular o professor a uma turma (passo 2.5 deve ser feito antes)
- [ ] Tentar excluir o professor permanentemente → deve bloquear com mensagem de erro
- [ ] Desvincular o professor da turma → excluir permanente deve funcionar

### 2.4 Cadastro de turmas
Ir em **Turmas** → criar:

- [ ] Turma 1: Nome `1º Ano A`, Série `1º Ano`, Turno `Manhã`
- [ ] Turma 2: Nome `3º Ano B`, Série `3º Ano`, Turno `Tarde`
- [ ] Ambas aparecem na listagem

#### Integridade referencial — turma
- [ ] Adicionar aluno à turma (passo 2.5)
- [ ] Tentar excluir a turma permanentemente → deve bloquear (turma tem alunos)
- [ ] Tentar excluir com professor vinculado → deve bloquear

### 2.5 Cadastro de alunos
Ir em **Alunos** → adicionar:

- [ ] Aluno 1: Nome `Lucas Silva`, Matrícula `2026001`, Turma `1º Ano A`
- [ ] Aluno 2: Nome `Maria Souza`, Matrícula `2026002`, Turma `1º Ano A`
- [ ] Aluno 3: Nome `Pedro Lima`, Matrícula `2026003`, Turma `3º Ano B`

#### Integridade referencial — aluno
- [ ] Vincular responsável ao Lucas (passo 2.7)
- [ ] Tentar excluir o Lucas permanentemente → deve bloquear (tem responsável vinculado)

### 2.6 Importação CSV (com CPF)
- [ ] Em **Alunos**, clicar em "Importar CSV"
- [ ] Baixar o modelo CSV
- [ ] Verificar colunas: Nome do Aluno, Turma, Série, Matrícula, Responsável, E-mail, Telefone, **CPF Responsável**, Parentesco
- [ ] Preencher 3 linhas com dados novos (turma `5º Ano A`), incluindo CPF no formato `XXX.XXX.XXX-XX`
- [ ] Upload do CSV preenchido
- [ ] Prévia mostra coluna CPF formatada em `font-mono`
- [ ] Clicar em "Importar" — contadores corretos (alunos, turmas, responsáveis criados)
- [ ] Turma `5º Ano A` aparece em **Turmas** com os alunos importados
- [ ] Em **Responsáveis**, responsáveis importados exibem CPF formatado

### 2.7 Cadastro manual de responsáveis
Ir em **Responsáveis**:

- [ ] Clicar em "Novo responsável"
- [ ] Preencher: Nome `Responsável Teste`, Telefone `(11) 99999-0001`, E-mail `giovanimarin@gmail.com`, CPF `123.456.789-00`
- [ ] Responsável aparece na lista com CPF `123.456.789-00`
- [ ] Tentar criar outro responsável com o mesmo CPF → erro "CPF já em uso"
- [ ] Tentar criar com mesmo telefone → erro "Telefone já em uso"

### 2.8 Vinculação responsável ↔ aluno
Na tela do aluno `Lucas Silva`:

- [ ] Ir em **Alunos** → clicar em Lucas Silva
- [ ] Seção "Responsáveis" aparece
- [ ] Clicar em "Vincular responsável"
- [ ] Buscar por CPF ou telefone → Responsável Teste encontrado
- [ ] Selecionar parentesco → Vincular
- [ ] Lucas aparece com o responsável listado

Na tela do responsável:
- [ ] Ir em **Responsáveis** → clicar em Responsável Teste
- [ ] Seção "Alunos vinculados" mostra Lucas Silva

---

## MÓDULO 3 — Comunicados (Admin)

### 3.1 Criar comunicado rascunho
Ir em **Comunicados** → "Novo comunicado":

- [ ] Tipo: `Aviso`, Título: `Reunião de pais — Maio`
- [ ] Mensagem: `Reunião no dia 15/05 às 19h no auditório.`
- [ ] Escopo: `Por turma` → selecionar `1º Ano A`
- [ ] Opção "Exigir confirmação de leitura": marcada
- [ ] **Não** marcar "Enviar imediatamente"
- [ ] Clicar em "Salvar rascunho" → status `Rascunho`

### 3.2 Criar e enviar comunicado urgente
- [ ] Tipo `Urgente`, Título `Aulas suspensas amanhã`
- [ ] Turmas `1º Ano A` e `3º Ano B`, enviar imediatamente
- [ ] Status `Enviado` na lista

### 3.3 Criar comunicado por aluno
- [ ] Tipo `Informativo`, Título `Nota de matemática`, escopo por aluno → `Lucas Silva`
- [ ] Enviar imediatamente → status `Enviado`

### 3.4 Enviar rascunho manualmente
- [ ] Localizar "Reunião de pais" (rascunho) → clicar no ícone de envio → status `Enviado`

### 3.5 Cancelar comunicado
- [ ] Localizar comunicado enviado → cancelar → status `Cancelado`

### 3.6 Exportar relatório de leitura
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
- [ ] **Botão "Justificativa de Falta" desaparece** da seção de templates (não permite duplicata)
- [ ] Criar os outros dois templates → seção de templates some completamente quando todos criados

### 5.3 Ver submissões
- [ ] Clicar no formulário → lista de submissões (preenchida no módulo 7)

---

## MÓDULO 6 — Controle de acesso por papel

### 6.1 Login como Secretária
**Credenciais:** `secretaria@girassol.com.br / Teste@2026`

- [ ] Login funciona → dashboard carrega
- [ ] Menu lateral **não** exibe "Equipe"
- [ ] Menu lateral **não** exibe "Escola"
- [ ] Exibe: Painel, Comunicados, Agenda, Agendamentos, Formulários, Turmas, Alunos, Responsáveis
- [ ] Pode criar comunicados
- [ ] Pode ver e gerenciar responsáveis

### 6.2 Login como Coordenadora
**Credenciais:** `coord@girassol.com.br / Teste@2026`

- [ ] Login funciona → dashboard carrega
- [ ] Menu **não** exibe "Equipe", "Escola" nem "Formulários"
- [ ] Exibe: Painel, Comunicados, Agenda, Agendamentos, Turmas, Alunos, Responsáveis
- [ ] Pode criar comunicados
- [ ] Pode ver agendamentos

### 6.3 Login como Professor
**Credenciais:** `prof@girassol.com.br / Teste@2026`

- [ ] Login funciona → dashboard carrega
- [ ] Menu exibe apenas: Painel, Comunicados, Agenda, Agendamentos, Turmas, Alunos, Responsáveis
- [ ] Header mostra aviso "Visualizando apenas suas turmas"
- [ ] **Turmas:** exibe apenas as turmas onde o professor está vinculado
- [ ] **Alunos:** exibe apenas alunos das turmas do professor
- [ ] **Responsáveis:** exibe apenas responsáveis de alunos das turmas do professor
- [ ] Tentar acessar `/dashboard/users` diretamente → redireciona ou nega acesso
- [ ] Tentar acessar `/dashboard/settings` diretamente → redireciona ou nega acesso

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
- [ ] Toggle "Horário recorrente" está desativado por padrão
- [ ] Preencher:
  - Título: `Atendimento — Semana de Provas`
  - Data/Hora: próxima semana às 14h00
  - Duração: 30 min
  - Quem pode reservar: `Todos os responsáveis`
- [ ] Criar → slot aparece na lista com badge `Disponível`

### 7.2 Criar horário por turma
- [ ] Novo Horário, Título `Reunião 1º Ano A`, data futura
- [ ] Quem pode reservar: `Responsáveis de uma turma` → selecionar `1º Ano A`
- [ ] Criar → slot aparece com nome da turma na lista

### 7.3 Criar série recorrente semanal
- [ ] Novo Horário, Título `Atendimento Semanal`
- [ ] Ativar toggle "Horário recorrente"
- [ ] Tipo: `Semanal`
- [ ] Selecionar dias: `Qua` e `Sex`
- [ ] Horário: `16:00`
- [ ] A partir de: hoje, Até: 4 semanas à frente
- [ ] Preview exibe: "Toda semana às 16:00 nas Quartas, Sextas, até ..."
- [ ] Clicar em "Criar Série"
- [ ] Múltiplos slots aparecem na lista, todos com badge `Recorrente`

### 7.4 Criar série quinzenal
- [ ] Novo Horário, Título `Reunião Quinzenal`
- [ ] Recorrente: `Quinzenal`, dia `Ter`, horário `10:00`
- [ ] Período: 2 meses à frente
- [ ] Criar → slots a cada 2 semanas nas terças

### 7.5 Cancelar horário avulso
- [ ] Localizar slot avulso disponível → clicar no ícone de cancelamento (🚫)
- [ ] Confirmar → status muda para `Cancelado`

### 7.6 Cancelar horário recorrente
- [ ] Localizar slot da série "Atendimento Semanal" → clicar em cancelar
- [ ] Modal aparece com 3 opções:
  - `Somente este horário`
  - `Este e os próximos da série`
  - `Todos os horários da série`
- [ ] Selecionar "Este e os próximos" → confirmar
- [ ] Slots a partir da data selecionada mudam para `Cancelado`
- [ ] Slots anteriores permanecem `Disponível`

### 7.7 Excluir horário disponível
- [ ] Localizar slot disponível sem reserva → ícone de lixeira → confirmar
- [ ] Slot removido da lista
- [ ] Tentar excluir slot com reserva (status `Reservado`) → botão de lixeira não aparece

### 7.8 Filtros
- [ ] Filtrar por status `Reservado` → mostra apenas os reservados
- [ ] Filtrar por data → mostra apenas slots a partir da data escolhida
- [ ] Limpar filtros → volta a mostrar tudo

---

## MÓDULO 8 — App do Responsável

> **Pré-requisito:** Responsável `giovanimarin@gmail.com` criado e vinculado ao Lucas Silva (passo 2.7/2.8)

**URL:** http://192.168.2.59:3000/guardian

### 8.1 Login via OTP
- [ ] Acessar http://192.168.2.59:3000/guardian
- [ ] Digitar `giovanimarin@gmail.com` → "Enviar código"
- [ ] Checar e-mail — código de 6 dígitos recebido
- [ ] Digitar código → login → redireciona para `/guardian/feed`

### 8.2 Feed de avisos
- [ ] Comunicados enviados para Lucas Silva aparecem
- [ ] Tipo urgente tem destaque visual diferente
- [ ] Ponto vermelho indica não lido
- [ ] Clicar em "Confirmar leitura" → botão some, aparece checkmark verde

### 8.3 Agenda
- [ ] Aba **Agenda** → eventos dos passos 4.1/4.2 aparecem agrupados por data

### 8.4 Agendamentos — ver horários disponíveis
- [ ] Aba **Reuniões** (CalendarCheck) na barra inferior
- [ ] Aba "Horários Disponíveis" está ativa por padrão
- [ ] Slots criados no módulo 7 aparecem (avulso + série)
  - Apenas slots com `scope=ALL` ou da turma do Lucas (`1º Ano A`) devem aparecer
- [ ] Card mostra: título, data, hora, duração, nome do professor/staff

### 8.5 Reservar horário
- [ ] Clicar em um horário disponível → modal de confirmação abre
- [ ] Se responsável tem mais de 1 filho: seletor de aluno aparece
- [ ] Selecionar aluno `Lucas Silva`
- [ ] Adicionar observação: `Quero conversar sobre as notas`
- [ ] Clicar em "Confirmar" → banner verde "Agendamento confirmado!"
- [ ] Slot some da lista de "Horários Disponíveis"

### 8.6 Ver meus agendamentos
- [ ] Aba "Meus Agendamentos"
- [ ] Reserva aparece com status `Confirmado`, nome do professor, data/hora, aluno
- [ ] Observação aparece em itálico

### 8.7 Cancelar agendamento
- [ ] Na aba "Meus Agendamentos", localizar reserva futura
- [ ] Clicar em "Cancelar agendamento" → confirmar
- [ ] Status muda para `Cancelado`
- [ ] Slot volta a aparecer em "Horários Disponíveis" (disponível novamente)

### 8.8 Cancelamento pelo staff
- [ ] Como Admin, ir em **Agendamentos**
- [ ] Localizar slot com status `Reservado` → expandir → ver dados do responsável e aluno
- [ ] Clicar em "Cancelar agendamento" → confirmar
- [ ] Slot volta para `Disponível` na lista do staff
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

- [ ] Como responsável: confirmar leitura de comunicado com "Confirmar leitura"
- [ ] Como admin: em **Comunicados** → download CSV → linha do responsável mostra `Lido = Sim`
- [ ] Como admin: em **Agendamentos** → slot reservado mostra nome do responsável e aluno
- [ ] Como responsável: formulário enviado aparece no dashboard do admin em **Formulários**
- [ ] Admin resolve formulário com nota → responsável vê status `Resolvido`

---

## MÓDULO 10 — Integridade referencial

### 10.1 Responsável vinculado
- [ ] Tentar excluir permanentemente responsável com aluno vinculado → erro com mensagem "vinculado a X aluno(s)"
- [ ] Desvincular aluno → exclusão funciona

### 10.2 Aluno com responsável
- [ ] Tentar excluir aluno com responsável vinculado → erro bloqueando exclusão
- [ ] Desvincular responsável → exclusão funciona

### 10.3 Turma com alunos ou professores
- [ ] Turma com alunos: exclusão bloqueada
- [ ] Turma com professor vinculado: exclusão bloqueada
- [ ] Remover alunos e professor → exclusão funciona

### 10.4 Usuário professor vinculado a turma
- [ ] Tentar excluir professor vinculado a turma → bloqueado
- [ ] Remover da turma → exclusão funciona

---

## MÓDULO 11 — CPF do Responsável

- [ ] Cadastrar responsável com CPF → aparece formatado `XXX.XXX.XXX-XX` na lista
- [ ] Tentar cadastrar segundo responsável com mesmo CPF → erro "CPF já em uso"
- [ ] Editar CPF de um responsável → campo mascara automaticamente ao digitar
- [ ] Importação CSV com CPF: responsável encontrado pelo CPF (não cria duplicata se CPF já existe)
- [ ] Importação CSV sem CPF: responsável encontrado pelo telefone (comportamento anterior mantido)
- [ ] Na tela de detalhe do responsável: CPF editável com máscara

---

## MÓDULO 12 — Testes de borda

### 12.1 Validações
- [ ] Criar comunicado sem turma → erro inline
- [ ] OTP com e-mail inválido → erro
- [ ] Código OTP errado → erro
- [ ] Código OTP expirado (após 10 min) → erro adequado
- [ ] Criar horário de agendamento sem título → erro inline
- [ ] Criar série recorrente sem selecionar dia da semana → erro inline
- [ ] Reservar horário sem selecionar aluno (multi-filhos) → erro inline

### 12.2 Permissões de acesso direto por URL
- [ ] Professor: acessar `/dashboard/users` → redireciona ou nega
- [ ] Professor: acessar `/dashboard/settings` → redireciona ou nega
- [ ] Professor: acessar `/dashboard/forms` → redireciona ou nega
- [ ] Responsável: acessar `/dashboard` → redireciona para `/guardian`
- [ ] Token expirado → redireciona para login automaticamente

### 12.3 Estados vazios
- [ ] Agenda sem eventos → "Sem eventos próximos"
- [ ] Feed sem comunicados → "Tudo em dia!"
- [ ] Agendamentos sem horários disponíveis → mensagem adequada
- [ ] Meus agendamentos vazio → mensagem adequada
- [ ] Responsáveis sem resultado no filtro → mensagem adequada

### 12.4 Rede (outro dispositivo)
- [ ] Acessar http://192.168.2.59:3000 de celular na mesma rede Wi-Fi
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
| 11. CPF do Responsável | | |
| 12. Testes de borda | | |

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

*Atualizado em 29/04/2026 — Presente v1.5*

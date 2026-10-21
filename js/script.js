/* nexPLM - JavaScript único do projeto.
   Autenticação e páginas internas compartilham este arquivo. */

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.querySelector('#authScreen')) return;
  const $ = s => document.querySelector(s); const $$ = s => [...document.querySelectorAll(s)];
  const usersKey='nexplm-workflow-users-v4', storageKey='nexplm-workflow-records-v4', currentUserKey='nexplm-workflow-session-v4';
  let users=[]; try{users=JSON.parse(localStorage.getItem(usersKey)||'[]')}catch(_){}
  let records={ideias:[],projetos:[],produtos:[],receitas:[],testes:[],compras:[],marketing:[],aprovacoes:[],liberacoes:[],usuarios:[],lixeira:[]};
  try{records={...records,...JSON.parse(localStorage.getItem(storageKey)||'{}')}}catch(_){}
  const today=()=>new Date().toISOString().slice(0,10);
  async function hashPassword(password){if(window.crypto?.subtle){const bytes=new TextEncoder().encode(password);const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}return `demo-${password}`;}
  function save(){localStorage.setItem(usersKey,JSON.stringify(users));localStorage.setItem(storageKey,JSON.stringify(records));}
  async function ensureAdmin(){let a=users.find(u=>u.email==='admin@admin');if(!a){a={username:'admin',name:'Administrador',phone:'',email:'admin@admin',department:'Administrativo',profile:'ADM geral',passwordHash:await hashPassword('123admin'),createdAt:today()};users.push(a)}else{a.department='Administrativo';a.profile='ADM geral';if(!a.passwordHash)a.passwordHash=await hashPassword('123admin')}if(!records.usuarios.some(r=>r.email==='admin@admin'))records.usuarios.push({id:crypto.randomUUID?.()||String(Date.now()),code:'USR-001',username:'admin',name:'Administrador',phone:'',email:'admin@admin',department:'Administrativo',profile:'ADM geral',date:today(),createdByEmail:'admin@admin'});save();}
  await ensureAdmin();
  function msg(t,type='danger'){const e=$('#authMessage');e.textContent=t;e.className=`alert alert-${type} mt-3`}
  function clear(){const e=$('#authMessage');e.textContent='';e.className='alert d-none mt-3'}
  function mode(x){clear();const l=x==='login';$('#loginForm').classList.toggle('d-none',!l);$('#registerForm').classList.toggle('d-none',l);$('#loginTab').classList.toggle('active',l);$('#registerTab').classList.toggle('active',!l)}
  $('#loginTab').onclick=()=>mode('login'); $('#registerTab').onclick=()=>mode('register'); $$('[data-show-register]').forEach(b=>b.onclick=()=>mode('register')); $$('[data-show-login]').forEach(b=>b.onclick=()=>mode('login'));
  $('#registerForm').addEventListener('submit',async e=>{e.preventDefault();clear();const username=$('#registerUsername').value.trim(),name=$('#registerName').value.trim(),phone=$('#registerPhone').value.trim(),email=$('#registerEmail').value.trim().toLowerCase(),department=$('#registerDepartment').value,password=$('#registerPassword').value;if(password.length<8)return msg('A senha precisa ter pelo menos 8 caracteres.');if(!['P&D','Produção'].includes(department))return msg('O cadastro público é destinado a colaboradores de P&D ou Produção.');if(users.some(u=>u.email===email||u.username.toLowerCase()===username.toLowerCase()))return msg('Este e-mail ou nome de usuário já está cadastrado.');const user={username,name,phone,email,department,profile:'Colaborador',passwordHash:await hashPassword(password),createdAt:today()};users.push(user);const nums=records.usuarios.map(r=>Number(String(r.code||'').split('-').at(-1))||0);records.usuarios.push({id:crypto.randomUUID?.()||String(Date.now()),code:`USR-${String(Math.max(0,...nums)+1).padStart(3,'0')}`,username,name,phone,email,department,profile:'Colaborador',date:today(),createdByEmail:email});save();e.target.reset();mode('login');$('#loginEmail').value=email;msg('Conta criada. Entre com seu e-mail e senha.','success')});
  $('#loginForm').addEventListener('submit',async e=>{e.preventDefault();clear();const email=$('#loginEmail').value.trim().toLowerCase(),password=$('#loginPassword').value,user=users.find(u=>u.email===email);if(!user||user.passwordHash!==await hashPassword(password))return msg('E-mail ou senha incorretos. Confira os dados ou crie uma conta.');sessionStorage.setItem(currentUserKey,JSON.stringify({username:user.username,name:user.name,phone:user.phone||'',email:user.email,department:user.department,profile:user.profile}));location.href='pages/ideias.html';});
});

/* nexPLM - protótipo de interface. Dados e permissões no navegador são apenas demonstração.
   Em produção, todas as regras de acesso e transições precisam ser validadas pela API/Java/MySQL. */
document.addEventListener('DOMContentLoaded', async () => {
  if (!document.querySelector('#appShell')) return;
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const modules = ['ideias','projetos','produtos','receitas','testes','compras','marketing','aprovacoes','liberacoes','usuarios','lixeira'];
  const labels = {ideias:'ideia',projetos:'projeto',produtos:'produto',receitas:'receita',testes:'teste',compras:'análise de compras',marketing:'análise de marketing',aprovacoes:'aprovação',liberacoes:'liberação final',usuarios:'usuário',lixeira:'item excluído'};
  const prefixes = {ideias:'IDE',projetos:'PRJ',produtos:'PRO',receitas:'REC',testes:'TES',compras:'COM',marketing:'MKT',aprovacoes:'APR',liberacoes:'LIB',usuarios:'USR'};
  const departments = ['Administrativo','Qualidade','Produção','Marketing','Compras','P&D'];
  const profileDescriptions = {
    'Colaborador':'Executa atividades do departamento: cadastra ideias, desenvolve produtos, registra receitas, realiza testes e envia informações para aprovação conforme suas permissões.',
    'Gerente':'Coordena o próprio departamento, revisa registros da equipe e aprova ou reprova itens dentro de sua competência.',
    'ADM geral':'Administra usuários e a liberação final. Pode visualizar todo o fluxo, mas não altera as etapas operacionais.'
  };
  const storageKey = 'nexplm-workflow-records-v4';
  const usersKey = 'nexplm-workflow-users-v4';
  const currentUserKey = 'nexplm-workflow-session-v4';
  let records = Object.fromEntries(modules.map(m => [m, []]));
  let users = [];
  let currentUser = null;
  let editingRecordId = null;
  try { records = {...records, ...(JSON.parse(localStorage.getItem(storageKey) || '{}'))}; } catch(_) {}
  try { users = JSON.parse(localStorage.getItem(usersKey) || '[]'); } catch(_) {}
  modules.forEach(m => { if (!Array.isArray(records[m])) records[m] = []; });

  // Reconcilia contas existentes com a tabela de usuários. Isso corrige cadastros
  // que foram gravados na lista de login, mas não chegaram a aparecer na tabela.
  if (Array.isArray(users)) {
    let usersReconciled = false;
    let recordsReconciled = false;
    users.forEach(account => {
      if (!account || !account.email) return;
      const email = String(account.email).trim().toLowerCase();
      const username = String(account.username || '').trim().toLowerCase();
      const existing = records.usuarios.some(record =>
        String(record.email || '').trim().toLowerCase() === email ||
        (username && String(record.username || '').trim().toLowerCase() === username)
      );
      if (!existing) {
        const nums = records.usuarios.map(r => Number(String(r.code || '').split('-').at(-1)) || 0);
        records.usuarios.push({
          id: account.id || (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`),
          code: `USR-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`,
          username: account.username || '',
          name: account.name || '',
          phone: account.phone || '',
          email,
          department: account.department || '',
          profile: account.profile || 'Colaborador',
          date: account.createdAt || today(),
          createdByEmail: account.email
        });
        recordsReconciled = true;
      }
      if (account.email !== email) {
        account.email = email;
        usersReconciled = true;
      }
    });
    if (usersReconciled) localStorage.setItem(usersKey, JSON.stringify(users));
    if (recordsReconciled) localStorage.setItem(storageKey, JSON.stringify(records));
  }
  // Migração desta versão: Liberação Final deve iniciar vazia. Registros futuros
  // só são criados quando o ADM clicar em "Nova liberação" e salvar o formulário.
  const releaseInitKey = 'nexplm-release-empty-init-v1';
  if (!localStorage.getItem(releaseInitKey)) {
    records.liberacoes = [];
    localStorage.setItem(storageKey, JSON.stringify(records));
    localStorage.setItem(releaseInitKey, '1');
  }
  const recordModal = bootstrap.Modal.getOrCreateInstance($('#recordModal'));
  const toast = bootstrap.Toast.getOrCreateInstance($('#appToast'), {delay:2800});

  function notify(message){ $('#toastText').textContent = message; toast.show(); }
  function saveRecords(){ localStorage.setItem(storageKey, JSON.stringify(records)); }
  function saveUsers(){ localStorage.setItem(usersKey, JSON.stringify(users)); }
  function safe(value){ return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function today(){ return new Date().toISOString().slice(0,10); }
  function formatDate(value){ if(!value) return '—'; const d=new Date(`${value}T12:00:00`); return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat('pt-BR').format(d); }
  function makeCode(module){ const nums=records[module].map(r=>Number(String(r.code||'').split('-').at(-1))||0); return `${prefixes[module]||'REG'}-${String(Math.max(0,...nums)+1).padStart(3,'0')}`; }
  function isAdmin(){ return currentUser?.profile === 'ADM geral'; }
  function isManager(){ return currentUser?.profile === 'Gerente'; }
  const moduleDepartment={ideias:'P&D',projetos:'P&D',produtos:'Produção',receitas:'Produção',testes:'Qualidade',compras:'Compras',marketing:'Marketing'};
  const operationalModules=['ideias','projetos','produtos','receitas','testes','compras','marketing'];
  const approvalModules=['ideias','projetos','produtos','receitas','testes'];
  const specialistModules=['testes','compras','marketing'];
  function responsibleDepartment(module){ return moduleDepartment[module] || null; }
  function canCreateModule(module){
    if(module==='liberacoes') return isAdmin();
    if(isAdmin()) return false;
    if(!operationalModules.includes(module) || currentUser?.department!==responsibleDepartment(module)) return false;
    if(specialistModules.includes(module)) return isManager();
    return true;
  }
  function isLocked(record){ return ['Aguardando aprovação','Aprovado'].includes(record.approvalStatus); }
  // Ideias reprovadas são registros definitivos: não podem ser editadas nem reenviadas.
  // O colaborador deve cadastrar uma nova ideia, sem criar uma versão 2.0.
  function isRejectedIdea(record){ return (record?._module==='ideias' || record?.type==='ideias' || record?.sourceModule==='ideias') && (record.approvalStatus==='Reprovado' || record.status==='Recusado' || record.status==='Reprovado'); }
  // Regra de segurança: somente o ADM geral pode gerenciar contas, perfis e departamentos.
  // Gerentes administram o fluxo do próprio departamento, mas nunca promovem usuários
  // nem alteram o departamento de qualquer conta.
  function canManageUsers(){ return isAdmin(); }
  function canReview(r){ return isManager() && ['P&D','Produção'].includes(currentUser?.department) && r.department===currentUser.department && r.createdByEmail!==currentUser.email; }
  function canEditRecord(r){ if(isRejectedIdea(r)) return false; if(r?._module==='receitas' && (r.approvalStatus==='Reprovado' || r.status==='Recusado' || r.status==='Reprovado' || r.status==='Necessita ajustes')) return false; if(r?._module==='testes' && (r.approvalStatus==='Reprovado' || r.status==='Reprovado' || r.status==='Recusado')) return false; if(isAdmin()) return false; if(r.department!==currentUser?.department) return false; if(['Aprovado'].includes(r.approvalStatus)||r.status==='Aprovado') return false; if(specialistModules.includes(r._module||'') && r._module!=='testes') return false; if(isLocked(r)) return false; return r.createdByEmail===currentUser.email || isManager(); }
  async function hashPassword(password){
    if(window.crypto?.subtle){const bytes=new TextEncoder().encode(password);const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}
    return `demo-${password}`;
  }
  try { currentUser = JSON.parse(sessionStorage.getItem(currentUserKey) || 'null'); } catch(_) {}
  if(!currentUser){ window.location.replace('../index.html'); return; }
  $('#loggedUserName').textContent=currentUser.name;
  $('#loggedUserRole').textContent=`${currentUser.profile} · ${currentUser.department}`;
  $('#userAvatar').textContent=(currentUser.name||'U').trim().charAt(0).toUpperCase();
  $('#topAvatar').textContent=$('#userAvatar').textContent;
  $('#topUserEmail').textContent=currentUser.email;
  const currentModule=document.querySelector('.page')?.dataset.module || 'ideias';
  $('#breadcrumbTitle').textContent=document.querySelector('.page')?.dataset.title || 'nexPLM';
  $$('[data-page]').forEach(a=>a.classList.toggle('active',a.dataset.page===currentModule));
  $$('[data-page]').forEach(a=>a.addEventListener('click',()=>{}));
  $('#logoutButton').addEventListener('click',()=>{sessionStorage.removeItem(currentUserKey);window.location.href='../index.html';});
  $('#mobileMenu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));

  const initialStatus={ideias:'Em andamento',projetos:'Em andamento',produtos:'Em andamento',receitas:'Em andamento',testes:'Em andamento',compras:'Em andamento',marketing:'Em andamento',liberacoes:'Em andamento'};
  function approved(module,id){ const r=records[module]?.find(x=>x.id===id); return r?.approvalStatus==='Aprovado'; }
  function prerequisites(module){
    if(module==='ideias') return true;
    if(module==='projetos') return records.ideias.some(r=>r.approvalStatus==='Aprovado');
    if(module==='produtos') return records.projetos.some(r=>r.approvalStatus==='Aprovado');
    if(module==='receitas') return records.produtos.some(r=>r.approvalStatus==='Aprovado');
    if(module==='testes') return records.receitas.some(r=>r.approvalStatus==='Aprovado');
    if(module==='compras') return records.testes.some(r=>r.status==='Aprovado');
    if(module==='marketing') return records.compras.some(r=>r.status==='Concluído');
    if(module==='liberacoes') return records.marketing.some(r=>r.status==='Concluído') && records.compras.some(r=>r.status==='Concluído') && records.testes.some(r=>r.status==='Aprovado');
    return true;
  }
  function prerequisiteMessage(module){
    const msg={projetos:'É necessário ter uma ideia aprovada.',produtos:'É necessário ter um projeto aprovado.',receitas:'É necessário ter um produto aprovado.',testes:'É necessário ter uma receita aprovada.',compras:'É necessário ter um teste de Qualidade aprovado.',marketing:'É necessário ter uma análise de Compras concluída.',liberacoes:'Qualidade, Compras e Marketing precisam estar concluídos antes da liberação final.'};
    return msg[module]||'A etapa anterior ainda não foi aprovada.';
  }
  function relationOptions(module){
    if(module==='projetos')return records.ideias.filter(r=>r.approvalStatus==='Aprovado').map(r=>({value:r.id,label:`${r.name} (${r.code})`}));
    if(module==='produtos')return records.projetos.filter(r=>r.approvalStatus==='Aprovado').map(r=>({value:r.id,label:`${r.name} (${r.code})`}));
    if(module==='receitas')return records.produtos.filter(r=>r.approvalStatus==='Aprovado').map(r=>({value:r.id,label:`${r.name} (${r.code})`}));
    if(module==='testes')return records.receitas.filter(r=>r.approvalStatus==='Aprovado').map(r=>({value:r.id,label:`${r.productName||'Receita'} v${r.version||1} (${r.code})`}));
    if(module==='compras')return records.testes.filter(r=>r.status==='Aprovado').map(r=>({value:r.id,label:`${r.productName||'Produto'} - ${r.code}`}));
    if(module==='marketing')return records.compras.filter(r=>r.status==='Concluído').map(r=>({value:r.id,label:`${r.productName||'Produto'} - ${r.code}`}));
    if(module==='liberacoes')return records.marketing.filter(r=>r.status==='Concluído').map(r=>({value:r.id,label:`${r.productName||'Produto'} - ${r.code}`}));
    return [];
  }
  const fieldSets={
    ideias:[['name','Título da ideia','text',true],['description','Descrição','textarea',true]],
    projetos:[['name','Nome do projeto','text',true],['description','Descrição','textarea',true],['ideaId','Ideia relacionada (opcional)','relation:projetos',false]],
    produtos:[['name','Nome do produto','text',true],['description','Descrição','textarea',true],['projectId','Projeto relacionado (opcional)','relation:produtos',false],['launchDate','Data prevista para lançamento','date',true]],
    receitas:[['ingredientsFile','Arquivo de ingredientes','file',true],['preparationFile','Arquivo do modo de preparo','file',true],['measures','Medidas / quantidades','textarea',true],['productId','Produto relacionado (opcional)','relation:receitas',false],['version','Versão','number',true],['observations','Observações','textarea',false]],
    testes:[['recipeId','Receita aprovada','relation:testes',true],['observations','Resultado / o que deu certo ou errado','textarea',true],['qualityResult','Resultado da Qualidade','selectQuality',true]],
    compras:[['testId','Teste de Qualidade aprovado','relation:compras',true],['suppliers','Fornecedores','textarea',true],['materials','Insumos / disponibilidade','textarea',true],['costs','Custos e viabilidade de aquisição','textarea',true]],
    marketing:[['purchaseId','Análise de Compras concluída','relation:marketing',true],['commercialName','Nome / posicionamento comercial','text',true],['targetAudience','Público-alvo','textarea',true],['packaging','Embalagem e informações comerciais','textarea',true]],
    liberacoes:[['marketingId','Produto pronto para liberação','relation:liberacoes',true],['releaseDecision','Decisão final','selectRelease',true],['justification','Justificativa','textarea',true]],
    usuarios:[['username','Nome de usuário','text',true],['name','Nome completo','text',true],['phone','Telefone','tel',true],['email','E-mail','email',true],['department','Departamento','selectDept',true],['profile','Perfil','selectProfileAdmin',true],['newPassword','Senha inicial (mínimo 8 caracteres)','password',true]]
  };
  function getStatusChoices(module, record){
    let opts=[...(statusOptions[module]||[])];
    if(module==='projetos' && !records.produtos.some(p=>p.projectId===record?.id && p.status==='Lançado')) opts=opts.filter(s=>s!=='Concluído');
    if(module==='produtos'){
      const recipeExists=records.receitas.some(r=>r.productId===record?.id);
      const testApproved=records.testes.some(t=>t.productId===record?.id && t.status==='Aprovado');
      if(!recipeExists)opts=opts.filter(s=>s!=='Em desenvolvimento');
      if(!testApproved)opts=opts.filter(s=>s!=='Lançado');
    }
    if(module==='receitas' && !records.testes.some(t=>t.recipeId===record?.id)) opts=opts.filter(s=>s!=='Em teste');
    return opts;
  }
  function fieldMarkup([key,label,type,required], module, record=null){
    const req=required?'required':'';const id=`field-${key}`;let value=record?.[key]??'';
    if(key==='newPassword' && record) return '';
    if(type==='textarea')return `<div><label class="form-label" for="${id}">${label}</label><textarea class="form-control" id="${id}" name="${key}" rows="3" ${req}>${safe(value)}</textarea></div>`;
    if(type==='file'){const existing=record?.[key+'Name'];return `<div><label class="form-label" for="${id}">${label}</label><input class="form-control" id="${id}" name="${key}" type="file" ${existing?'':req}>${existing?`<div class="form-text">Arquivo atual: ${safe(existing)}</div>`:''}</div>`;}
    if(type==='selectQuality')return `<div><label class="form-label" for="${id}">${label}</label><select class="form-select" id="${id}" name="${key}" ${req}>${optionList(['Aprovado','Reprovado'],value,'Selecione o resultado')}</select></div>`;
    if(type==='selectRelease')return `<div><label class="form-label" for="${id}">${label}</label><select class="form-select" id="${id}" name="${key}" ${req}>${optionList(['Liberar produto','Não liberar'],value,'Selecione a decisão')}</select></div>`;
    if(type==='selectDept')return `<div><label class="form-label" for="${id}">${label}</label><select class="form-select" id="${id}" name="${key}" ${req}>${optionList(departments,value,'Selecione um departamento')}</select></div>`;
    if(type==='selectProfileAdmin'){let profiles=['Colaborador','Gerente','ADM geral'];if(users.some(u=>u.profile==='ADM geral' && u.email!==record?.email))profiles=profiles.filter(p=>p!=='ADM geral');return `<div><label class="form-label" for="${id}">${label}</label><select class="form-select" id="${id}" name="${key}" ${req}>${optionList(profiles,value,'Selecione um perfil')}</select></div>`;}
    if(type.startsWith('relation:')){const options=relationOptions(type.slice(9));return `<div><label class="form-label" for="${id}">${label}</label><select class="form-select" id="${id}" name="${key}" ${req}><option value="">Selecione</option>${options.map(o=>`<option value="${safe(o.value)}" ${o.value===value?'selected':''}>${safe(o.label)}</option>`).join('')}</select></div>`;}
    if(type==='number')return `<div><label class="form-label" for="${id}">${label}</label><input class="form-control" id="${id}" name="${key}" type="number" min="1" value="${safe(value||1)}" ${req}></div>`;
    return `<div><label class="form-label" for="${id}">${label}</label><input class="form-control" id="${id}" name="${key}" type="${type}" value="${safe(value)}" ${req}></div>`;
  }
  function optionList(values,selected,placeholder){return `<option value="">${placeholder}</option>${values.map(v=>`<option value="${safe(v)}" ${v===selected?'selected':''}>${safe(v)}</option>`).join('')}`;}
  function syncAdminDepartment(profileSelect, departmentSelect) {
    if (!profileSelect || !departmentSelect) return;
    const profile = profileSelect.value;
    const currentDepartment = departmentSelect.value;
    let allowedDepartments = [...departments];
    if (profile === 'ADM geral') {
      allowedDepartments = ['Administrativo'];
    } else if (profile === 'Colaborador') {
      allowedDepartments = ['P&D', 'Produção'];
    } else if (profile === 'Gerente') {
      allowedDepartments = ['P&D', 'Produção', 'Qualidade', 'Compras', 'Marketing'];
    }
    departmentSelect.innerHTML = optionList(allowedDepartments,
      allowedDepartments.includes(currentDepartment) ? currentDepartment : '',
      'Selecione um departamento');
    if (profile === 'ADM geral') departmentSelect.value = 'Administrativo';
    // Não desabilitar o campo: campos disabled não entram no FormData ao salvar.
    departmentSelect.disabled = false;
  }
  function openAdd(module){
    if(module==='usuarios'&&!canManageUsers()){notify('Somente o ADM geral pode cadastrar usuários por esta página.');return;}
    if(['aprovacoes','perfis','departamentos'].includes(module)){notify('Este módulo é gerenciado pelo fluxo do sistema.');return;}
    if(module!=='usuarios' && !canCreateModule(module)){notify(`Esta etapa é responsabilidade do departamento ${responsibleDepartment(module)||'dos gerentes envolvidos / ADM'}.`);return;}
    if(!prerequisites(module)){notify(prerequisiteMessage(module));return;}
    editingRecordId=null;$('#recordForm').dataset.module=module;$('#recordForm').dataset.mode='add';$('#recordModalTitle').textContent=`Adicionar ${labels[module]}`;$('#recordModalSubtitle').textContent=`Preencha as informações de ${labels[module]}.`;
    const fields=fieldSets[module]||[];$('#recordFields').innerHTML=`<div class="field-stack">${fields.map(f=>fieldMarkup(f,module)).join('')}${module==='testes'?'<p class="form-text mb-0">O produto e a versão serão preenchidos a partir da receita selecionada.</p>':''}<p class="form-text mb-0">Responsável, departamento, perfil e data de criação serão registrados automaticamente com base na sua conta.</p></div>`;
    if(module==='usuarios'){const p=$('#field-profile'),d=$('#field-department');syncAdminDepartment(p,d);p?.addEventListener('change',()=>syncAdminDepartment(p,d));}
    recordModal.show();
  }
  function openEdit(module,id){
    const record=records[module].find(r=>r.id===id);if(!record)return;
    if(module==='usuarios'&&!canManageUsers()){notify('Somente o ADM geral pode alterar perfil ou departamento de usuários.');return;}
    if(module==='aprovacoes'){
      const source=sourceRecord(record);
      if(!canReview(record)){notify('Você não tem permissão para decidir esta aprovação.');return;}
      if(record.status==='Aprovado'){notify('Esta solicitação já foi aprovada.');return;}
      if(source?.createdByEmail===currentUser.email){notify('Você não pode aprovar um item criado por você. A solicitação deve ser encaminhada ao ADM geral.');return;}
      editingRecordId=id;$('#recordForm').dataset.module=module;$('#recordForm').dataset.mode='edit';$('#recordModalTitle').textContent='Analisar solicitação';$('#recordModalSubtitle').textContent=`${record.item} · ${record.code}`;
      $('#recordFields').innerHTML=`<div class="field-stack"><div><label class="form-label">Etapa</label><input class="form-control" value="${safe(record.stageLabel||record.type)}" disabled></div><div><label class="form-label">Produto / ideia</label><input class="form-control" value="${safe(record.productLabel||record.item)}" disabled></div><div><label class="form-label">ID do item</label><input class="form-control" value="${safe(record.sourceCode||record.sourceId)}" disabled></div><div><label class="form-label">Detalhes para análise</label><textarea class="form-control" rows="4" disabled>${safe(record.details||'—')}</textarea></div><div><label class="form-label">Nº solicitação</label><input class="form-control" value="${safe(record.requestNo)}" disabled></div><div><label class="form-label">Departamento</label><input class="form-control" value="${safe(record.department)}" disabled></div><div><label class="form-label" for="field-status">Decisão</label><select class="form-select" id="field-status" name="status" required><option>Aguardando aprovação</option><option>Aprovado</option><option>Reprovado</option></select></div></div>`;recordModal.show();return;
    }
    // Usuários são administrados exclusivamente pelo ADM. Não aplicar aqui as regras
    // de edição das etapas operacionais, pois o ADM deve poder editar as contas.
    if(module==='usuarios'){
      if(!isAdmin()){notify('Somente o ADM geral pode editar usuários.');return;}
    } else if(module==='liberacoes'){
      if(!isAdmin()){notify('Somente o ADM pode alterar a liberação final.');return;}
      if(record.releaseDecision==='Liberar produto'||record.status==='Liberar produto'){notify('A decisão de liberação já foi concluída e não pode ser alterada.');return;}
    } else {
      record._module=module;
      if(!canEditRecord(record)){notify('Você não tem permissão para editar este registro.');return;}
    }
    editingRecordId=id;$('#recordForm').dataset.module=module;$('#recordForm').dataset.mode='edit';$('#recordModalTitle').textContent=`Editar ${labels[module]}`;$('#recordModalSubtitle').textContent=`Atualize os dados permitidos para este registro.`;
    let fields=(fieldSets[module]||[]).filter(f=>f[0]!=='newPassword');
    // Relacionamentos já definidos não devem ser trocados no modo edição; isso preserva o histórico do fluxo.
    fields=fields.filter(f=>!['ideaId','projectId','productId','recipeId'].includes(f[0]));
    if(module==='usuarios') fields=fieldSets.usuarios.filter(f=>f[0]!=='newPassword');
    let html=fields.map(f=>fieldMarkup(f,module,record)).join('');
    const ownRecord=record.createdByEmail===currentUser.email && !isAdmin();
    if(approvalModules.includes(module)) html+=`<div><label class="form-label">Status</label><input class="form-control" value="${safe(record.status||'Em andamento')}" disabled></div><div><label class="form-label">Aprovação</label><input class="form-control" value="${safe(record.approvalStatus||'Pendente')}" disabled></div>`;
    if(module==='usuarios'){
      html=fieldSets.usuarios.filter(f=>f[0]!=='newPassword').map(f=>fieldMarkup(f,module,record)).join('');
      if(!isAdmin()) {notify('Somente o ADM geral pode editar usuários.');return;}
    }
    $('#recordFields').innerHTML=`<div class="field-stack">${html}</div>`;
    if(module==='usuarios'){const p=$('#field-profile'),d=$('#field-department');syncAdminDepartment(p,d);p?.addEventListener('change',()=>syncAdminDepartment(p,d));}
    recordModal.show();
  }
  $$('[data-add]').forEach(button=>button.addEventListener('click',()=>openAdd(button.dataset.add)));
  function createApproval(module,record){
    const stageLabel={ideias:'Ideia',projetos:'Projeto',produtos:'Produto',receitas:'Receita',testes:'Teste de receita',compras:'Análise de compras',marketing:'Análise de marketing'}[module]||labels[module];
    const productLabel=record.productName||record.name||record.ideaName||record.projectName||'Item do fluxo';
    let details=record.description||record.observations||'';
    if(module==='testes')details=`Resultado do teste: ${record.observations||'—'} | Versão do teste: v${record.version||1}`;
    if(module==='compras')details=`Fornecedores: ${record.suppliers||'—'} | Insumos: ${record.materials||'—'} | Custos: ${record.costs||'—'}`;
    if(module==='marketing')details=`Posicionamento: ${record.commercialName||'—'} | Público: ${record.targetAudience||'—'} | Embalagem: ${record.packaging||'—'}`;
    if(module==='receitas')details=`Observações: ${record.observations||'—'} | Versão ${record.version||1} | Medidas: ${record.measures||'—'} | Ingredientes: ${record.ingredientsFileName||'arquivo'} | Preparo: ${record.preparationFileName||'arquivo'}`;
    const approval={id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,code:makeCode('aprovacoes'),requestNo:`SOL-${String(records.aprovacoes.length+1).padStart(4,'0')}`,item:productLabel,productLabel,stageLabel,sourceCode:record.code,details,type:module,sourceModule:module,sourceId:record.id,department:record.department,requesterEmail:record.createdByEmail,status:'Aguardando aprovação',date:today(),responsible:record.responsible};
    records.aprovacoes.push(approval);
  }
  function submitForApproval(module,id){
    const record=records[module]?.find(r=>r.id===id);if(!record)return;
    if(!approvalModules.includes(module)){notify('Esta etapa não passa por aprovação de gerente.');return;}
    if(isLocked(record)){notify('Este registro já foi enviado ou aprovado.');return;}
    if(!isAdmin() && record.department!==currentUser?.department){notify('Você não pode enviar itens de outro departamento.');return;}
    record.status='Concluído';record.approvalStatus='Aguardando aprovação';createApproval(module,record);saveRecords();renderAll();notify('Etapa concluída e enviada ao gerente do departamento para aprovação.');
  }
  function sourceRecord(approval){return records[approval.sourceModule]?.find(r=>r.id===approval.sourceId);}
  function updateRelatedStatuses(module,record){
    if(module==='testes' && record.status==='Aprovado'){
      const product=records.produtos.find(p=>p.id===record.productId);if(product)product.status='Lançado';
    }
    if(module==='aprovacoes' && record.status==='Aprovado'){
      const src=sourceRecord(record);if(src){const map={ideias:'Aprovada',projetos:'Aprovado',produtos:'Aprovado',receitas:'Aprovado',testes:'Aprovado'};if(map[record.sourceModule])src.status=map[record.sourceModule];if(record.sourceModule==='testes')updateRelatedStatuses('testes',src);}
    }
  }
  async function saveRecordForm(e){
    e.preventDefault();const form=e.currentTarget,module=form.dataset.module,mode=form.dataset.mode,fd=new FormData(form),data=Object.fromEntries(fd.entries());Object.keys(data).forEach(k=>{if(typeof data[k]==='string')data[k]=data[k].trim();});
    async function captureFile(key){const file=fd.get(key);if(file instanceof File && file.size){const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});data[key+'Name']=file.name;data[key+'Data']=url;delete data[key];}else delete data[key];}
    if(module==='receitas'){await captureFile('ingredientsFile');await captureFile('preparationFile');}
    if(module==='usuarios' && data.profile==='ADM geral') data.department='Administrativo';
    if(module==='usuarios' && data.profile!=='ADM geral' && data.department==='Administrativo'){notify('Selecione um departamento válido para este perfil.');return;}
    if(module==='usuarios' && ['Qualidade','Compras','Marketing'].includes(data.department) && data.profile!=='Gerente'){notify('Qualidade, Compras e Marketing possuem somente o perfil Gerente.');return;}
    if(mode==='edit'){
      if(module==='aprovacoes'){
        const approval=records.aprovacoes.find(r=>r.id===editingRecordId);if(!approval)return;
        if(['Aprovado','Reprovado'].includes(data.status)){approval.status=data.status;approval.reviewedBy=currentUser.email;approval.reviewedAt=today();const src=sourceRecord(approval);if(src){src.approvalStatus=data.status;src.status=data.status==='Aprovado'?'Aprovado':'Recusado';}}
        saveRecords();renderAll();recordModal.hide();notify(`Solicitação ${data.status.toLowerCase()}.`);return;
      }
      if(module==='usuarios'){
        if(!isAdmin()){notify('Somente o ADM geral pode alterar perfil ou departamento de usuários.');return;}
        const userRecord=records.usuarios.find(r=>r.id===editingRecordId);if(!userRecord)return;
        const oldEmail=userRecord.email;data.email=(data.email||'').toLowerCase();Object.assign(userRecord,data);const account=users.find(u=>u.email===oldEmail);if(account){Object.assign(account,{username:data.username,name:data.name,phone:data.phone,email:data.email,department:data.department,profile:data.profile});saveUsers();}
        saveRecords();renderAll();recordModal.hide();notify('Usuário atualizado.');return;
      }
      const record=records[module].find(r=>r.id===editingRecordId);if(!record)return;
      if(module!=='liberacoes'){record._module=module;if(!canEditRecord(record)){notify('Você não tem permissão para editar este registro.');return;}} else if(!isAdmin()){notify('Somente o ADM pode alterar a liberação final.');return;}
      if(module==='liberacoes' && (record.releaseDecision==='Liberar produto'||record.status==='Liberar produto')){notify('A decisão de liberação já foi concluída e não pode ser alterada.');return;}
      Object.assign(record,data);record.updatedAt=today();
      if(module==='testes'){record.status=record.qualityResult==='Reprovado'?'Reprovado':'Em andamento';record.approvalStatus=record.status==='Reprovado'?'Reprovado':'Pendente';}
      if(module==='liberacoes'){record.status=record.releaseDecision;record.updatedAt=today();}
      saveRecords();renderAll();recordModal.hide();notify('Registro atualizado.');return;
    }
    const record={...data,id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,code:makeCode(module),date:today(),createdByEmail:currentUser.email,responsible:currentUser.name,department:currentUser.department,profile:currentUser.profile};
    if(module==='usuarios'){
      if(!isAdmin()){notify('Somente o ADM geral pode cadastrar usuários.');return;}
      record.department=data.department;record.profile=data.profile;record.responsible=data.name;record.createdByEmail=currentUser.email;
      // Normaliza o e-mail antes de validar e salvar para manter a conta e a tabela sincronizadas.
      record.email=(record.email||'').trim().toLowerCase();
      record.username=(record.username||'').trim();
      if(users.some(u=>(u.email||'').toLowerCase()===record.email||(u.username||'').toLowerCase()===record.username.toLowerCase())){notify('E-mail ou nome de usuário já cadastrado.');return;}
      if(!record.newPassword||record.newPassword.length<8){notify('A senha precisa ter pelo menos 8 caracteres.');return;}
      if(record.profile==='ADM geral' && users.some(u=>u.profile==='ADM geral')){notify('Já existe um ADM geral cadastrado.');return;}
      try {
        const passwordHash=await hashPassword(record.newPassword);
        const account={username:record.username,name:record.name,phone:record.phone,email:record.email,department:record.department,profile:record.profile,passwordHash,createdAt:today()};
        delete record.newPassword;
        // Persiste os dois conjuntos antes de redesenhar a tabela.
        users.push(account);
        records.usuarios.push(record);
        saveUsers();
        saveRecords();
        renderAll();
        recordModal.hide();
        form.reset();
        notify('Usuário cadastrado e exibido na lista.');
      } catch(error) {
        console.error('Erro ao cadastrar usuário:', error);
        notify('Não foi possível salvar o usuário. Confira o console do navegador e tente novamente.');
      }
      return;
    }
    if(module!=='usuarios') record.department=responsibleDepartment(module);
    record.status=initialStatus[module]||'Em andamento';
    record.approvalStatus=approvalModules.includes(module)?'Pendente':'Não se aplica';
    if(module==='projetos') {const idea=records.ideias.find(r=>r.id===record.ideaId);record.ideaName=idea?.name||'';record.ideaCode=idea?.code||'';}
    if(module==='produtos') {const project=records.projetos.find(r=>r.id===record.projectId);record.projectName=project?.name||'';record.projectCode=project?.code||'';}
    if(module==='receitas') {const product=records.produtos.find(r=>r.id===record.productId);record.productName=product?.name||'';record.productCode=product?.code||'';record.version=Number(record.version)||1;}
    if(module==='testes') {const recipe=records.receitas.find(r=>r.id===record.recipeId);record.recipeCode=recipe?.code||'';record.recipeName=recipe?.productName?`${recipe.productName} v${recipe.version||1}`:'Receita';record.productId=recipe?.productId;const product=records.produtos.find(p=>p.id===record.productId);record.productName=product?.name||'';record.version=recipe?.version||1;}
    if(module==='compras'){const test=records.testes.find(t=>t.id===record.testId);record.productId=test?.productId;record.productName=test?.productName||'';record.status='Concluído';}
    if(module==='marketing'){const purchase=records.compras.find(x=>x.id===record.purchaseId);record.productId=purchase?.productId;record.productName=purchase?.productName||'';record.status='Concluído';}
    if(module==='testes'){record.status=record.qualityResult==='Reprovado'?'Reprovado':'Em andamento';record.approvalStatus=record.status==='Reprovado'?'Reprovado':'Pendente';record.version=Number(record.version)||1;const recipe=records.receitas.find(x=>x.id===record.recipeId);if(recipe && record.status==='Reprovado'){recipe.status='Necessita ajustes';recipe.approvalStatus='Reprovado';}}
    if(module==='liberacoes'){const marketing=records.marketing.find(x=>x.id===record.marketingId);record.productId=marketing?.productId;record.productName=marketing?.productName||'';const recipe=[...records.receitas].filter(x=>x.productId===record.productId&&x.approvalStatus==='Aprovado').sort((a,b)=>(b.version||0)-(a.version||0))[0];record.recipeLabel=recipe?`${recipe.code} · v${recipe.version||1}`:'—';record.quality='Aprovado';record.purchases='Concluído';record.marketing='Concluído';record.status=record.releaseDecision;}
        records[module].push(record);saveRecords();renderAll();recordModal.hide();form.reset();notify(`${labels[module][0].toUpperCase()+labels[module].slice(1)} salvo em elaboração.`);
  }
  $('#recordForm').addEventListener('submit',saveRecordForm);

  function canDeleteRecord(module,r){
    // Usuários: o ADM pode excluir qualquer conta, exceto a própria e a do ADM geral.
    if(module==='usuarios') return isAdmin() && r.profile!=='ADM geral' && String(r.email||'').toLowerCase()!==String(currentUser?.email||'').toLowerCase();
    return isAdmin() && module==='ideias' && (r.status==='Recusado' || r.approvalStatus==='Reprovado');
  }
  function deleteButton(module,r){
    return canDeleteRecord(module,r)?`<button class="btn btn-sm btn-outline-danger ms-1" data-delete="${module}" data-id="${safe(r.id)}" title="Mover para a lixeira" aria-label="Excluir">🗑️</button>`:'';
  }
  function deleteRecord(module,id){
    const r=records[module]?.find(x=>x.id===id);if(!r||!canDeleteRecord(module,r)){notify('Somente o administrador pode excluir registros.');return;}
    if(!confirm(`Mover este ${labels[module]} para a lixeira?`))return;
    const trashed={id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,originalModule:module,record:typeof structuredClone==='function'?structuredClone(r):JSON.parse(JSON.stringify(r)),deletedAt:today(),deletedBy:currentUser.name||currentUser.email};
    if(module==='usuarios'){const em=String(r.email||'').toLowerCase();const account=users.find(u=>String(u.email||'').toLowerCase()===em);if(account)trashed.userAccount={...account};users=users.filter(u=>String(u.email||'').toLowerCase()!==em);saveUsers();}
    records.lixeira.push(trashed);records[module]=records[module].filter(x=>x.id!==id);saveRecords();renderAll();notify('Item movido para a lixeira.');
  }
  function restoreTrash(id){
    if(!isAdmin())return;const item=records.lixeira.find(x=>x.id===id);if(!item)return;
    if(!records[item.originalModule]){notify('Não foi possível identificar o módulo original.');return;}
    if(item.originalModule==='usuarios'){
      const em=String(item.record.email||'').toLowerCase(),un=String(item.record.username||'').toLowerCase();
      if(users.some(u=>String(u.email||'').toLowerCase()===em||String(u.username||'').toLowerCase()===un)){notify('Não foi possível restaurar: já existe outro usuário com este e-mail ou nome de usuário.');return;}
    }
    records[item.originalModule].push(item.record);if(item.userAccount){users.push(item.userAccount);saveUsers();}
    records.lixeira=records.lixeira.filter(x=>x.id!==id);saveRecords();renderAll();notify('Item restaurado com sucesso.');
  }

  function emptyTrash(){
    if(!isAdmin()){notify('Somente o administrador pode esvaziar a lixeira.');return;}
    if(!records.lixeira.length){notify('A lixeira já está vazia.');return;}
    if(!confirm('Esvaziar a lixeira? Esta ação excluirá permanentemente todos os itens e não poderá ser desfeita.'))return;
    records.lixeira=[];saveRecords();renderAll();notify('Lixeira esvaziada com sucesso.');
  }


  function createNewRecipeVersion(id){
    const old=records.receitas.find(r=>r.id===id);if(!old||!(old.status==='Necessita ajustes'||old.status==='Recusado'||old.approvalStatus==='Reprovado')||isAdmin()||currentUser?.department!=='Produção')return;
    const versions=records.receitas.filter(r=>r.productId===old.productId).map(r=>Number(r.version)||1);
    const copy={...old,id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,code:makeCode('receitas'),version:Math.max(...versions,0)+1,status:'Em andamento',approvalStatus:'Pendente',date:today(),createdByEmail:currentUser.email,responsible:currentUser.name,profile:currentUser.profile};
    records.receitas.push(copy);saveRecords();renderAll();notify(`Nova versão v${copy.version} criada. Edite-a antes de enviar para aprovação.`);
  }
  function createNewTestVersion(id){
    const old=records.testes.find(t=>t.id===id);if(!old||!(old.status==='Reprovado'||old.approvalStatus==='Reprovado'||old.status==='Recusado')||isAdmin()||currentUser?.department!=='Qualidade')return;
    const versions=records.testes.filter(t=>t.recipeId===old.recipeId).map(t=>Number(t.version)||1);
    const copy={...old,id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,code:makeCode('testes'),version:Math.max(...versions,0)+1,status:'Em andamento',approvalStatus:'Pendente',qualityResult:'',observations:'',date:today(),createdByEmail:currentUser.email,responsible:currentUser.name,profile:currentUser.profile};
    records.testes.push(copy);saveRecords();renderAll();notify(`Nova versão de teste v${copy.version} criada. Edite-a e envie para aprovação.`);
  }
  function actionButtons(module,r){
    if(module==='lixeira')return isAdmin()?`<button class="btn btn-sm btn-outline-dark" data-restore="${safe(r.id)}">↩ Restaurar</button>`:'';
    if(module==='aprovacoes'){
      const analyze=(canReview(r)) && r.status==='Aguardando aprovação' ? `<button class="btn btn-sm btn-outline-dark" data-edit="aprovacoes" data-id="${safe(r.id)}">Analisar</button>` : '';
      return analyze+deleteButton(module,r) || '<span class="text-secondary">—</span>';
    }
    if(module==='liberacoes')return isAdmin() && r.releaseDecision!=='Liberar produto' && r.status!=='Liberar produto'?`<button class="btn btn-sm btn-outline-dark" data-edit="liberacoes" data-id="${safe(r.id)}">Editar decisão</button>`:'<span class="text-secondary">'+(r.releaseDecision==='Liberar produto'||r.status==='Liberar produto'?'Decisão final bloqueada':'Somente visualização')+'</span>'; 
    if(module==='usuarios')return isAdmin()?`<button class="btn btn-sm btn-outline-dark" data-edit="usuarios" data-id="${safe(r.id)}">Editar</button>${deleteButton(module,r)}`:'<span class="text-secondary">Somente ADM</span>';
    if(operationalModules.includes(module)){
      r._module=module;
      const edit=canEditRecord(r)?`<button class="btn btn-sm btn-outline-dark me-1" data-edit="${module}" data-id="${safe(r.id)}">Editar</button>`:'';
      const submit=approvalModules.includes(module) && !isRejectedIdea(r) && (!isManager() || module==='testes') && !isAdmin() && !isLocked(r) && r.approvalStatus!=='Reprovado' && r.status!=='Reprovado' && r.department===currentUser?.department && r.createdByEmail===currentUser.email ? `<button class="btn btn-sm btn-primary" data-submit-approval="${module}" data-id="${safe(r.id)}">Enviar p/ aprovação</button>`:'';
      const files=module==='receitas'?`${r.ingredientsFileData?`<a class="btn btn-sm btn-outline-secondary ms-1" href="${safe(r.ingredientsFileData)}" download="${safe(r.ingredientsFileName||'ingredientes')}">Ingredientes</a>`:''}${r.preparationFileData?`<a class="btn btn-sm btn-outline-secondary ms-1" href="${safe(r.preparationFileData)}" download="${safe(r.preparationFileName||'modo-preparo')}">Preparo</a>`:''}`:'';
      const newVersion=(module==='receitas' && (r.status==='Necessita ajustes'||r.approvalStatus==='Reprovado'||r.status==='Recusado') && currentUser?.department==='Produção' && !isAdmin())?`<button class="btn btn-sm btn-outline-primary ms-1" data-new-version="${safe(r.id)}">Nova versão</button>`:'';
      const newTestVersion=(module==='testes' && (r.status==='Reprovado'||r.approvalStatus==='Reprovado'||r.status==='Recusado') && currentUser?.department==='Qualidade' && !isAdmin())?`<button class="btn btn-sm btn-outline-primary ms-1" data-new-test-version="${safe(r.id)}">Nova versão</button>`:'';
      return edit+submit+newVersion+newTestVersion+files+deleteButton(module,r) || '<span class="text-secondary">Bloqueado</span>';
    }
    const edit=canEditRecord(r)?`<button class="btn btn-sm btn-outline-dark" data-edit="${module}" data-id="${safe(r.id)}">Editar</button>`:'';
    return edit+deleteButton(module,r) || '<span class="text-secondary">—</span>';
  }
  function rowFor(module,r){
    if(module==='ideias')return [r.code,r.name,r.responsible,r.department,r.profile,r.status,r.approvalStatus||'Pendente',formatDate(r.date)];
    if(module==='projetos')return [r.code,r.ideaCode||'—',r.name,r.description||'—',r.responsible,r.department,r.profile,r.status,r.approvalStatus||'Pendente',formatDate(r.date)];
    if(module==='produtos')return [r.code,r.name,r.description,r.projectCode||'—',r.projectName,r.responsible,r.department,r.profile,r.status,r.approvalStatus||'Pendente',formatDate(r.date),formatDate(r.launchDate)];
    if(module==='receitas')return [r.code,r.productCode||'—',r.productName,r.ingredientsFileName||'—',r.preparationFileName||'—',r.measures,r.observations||'—',`v${r.version||1}`,r.responsible,r.profile,r.status,r.approvalStatus||'Pendente',formatDate(r.date)];
    if(module==='testes')return [r.code,r.recipeCode||'—',r.recipeName,r.productName,`v${r.version||1}`,r.responsible,r.profile,r.status,r.observations||'—',formatDate(r.date)];
    if(module==='compras')return [r.code,r.productName,r.suppliers,r.materials,r.costs,r.responsible,r.status,formatDate(r.date)];
    if(module==='marketing')return [r.code,r.productName,r.commercialName,r.targetAudience,r.packaging,r.responsible,r.status,formatDate(r.date)];
    if(module==='liberacoes')return [r.code,r.productName,r.recipeLabel||'—',r.quality||'Aprovado',r.purchases||'Concluído',r.marketing||'Concluído',r.releaseDecision||r.status,r.justification||'—',formatDate(r.date)];
        if(module==='aprovacoes')return [r.stageLabel||r.type,r.productLabel||r.item,r.sourceCode||r.sourceId,r.details||'—',r.requestNo,r.department,formatDate(r.date),r.status];
    if(module==='lixeira'){const x=r.record||{};const processo=labels[r.originalModule]||r.originalModule;const ident=x.name||x.productName||x.recipeName||x.commercialName||x.email||'Registro';return [x.code||'—',ident,processo,formatDate(r.deletedAt),r.deletedBy||'Administrador'];}
    if(module==='usuarios')return [r.name,r.email,r.phone,r.profile,r.department];
    return [];
  }
  // Preenche as colunas pelo NOME do cabeçalho do HTML (não pela posição). Assim, remover ou
  // reordenar colunas na página (ex.: tirar "Departamento") não desloca os valores da tabela.
  function columnValues(module,r){
    const st=r.status, ap=r.approvalStatus||'Pendente', dt=formatDate(r.date);
    const common={'CÓDIGO':r.code,'RESPONSÁVEL':r.responsible,'DEPARTAMENTO':r.department,'PERFIL':r.profile,'STATUS':st,'APROVAÇÃO':ap,'DATA':dt,'DATA DE CRIAÇÃO':dt};
    const maps={
      ideias:{...common,'IDEIA':r.name,'DESCRIÇÃO':r.description},
      projetos:{...common,'IDIDEIA':r.ideaCode||'—','PROJETO':r.name,'DESCRIÇÃO':r.description},
      produtos:{...common,'PRODUTO':r.name,'DESCRIÇÃO':r.description,'IDPROJETO':r.projectCode||'—','PROJETO RELACIONADO':r.projectName,'DATA DE LANÇAMENTO':formatDate(r.launchDate)},
      receitas:{...common,'IDPRODUTO':r.productCode||'—','PRODUTO':r.productName,'INGREDIENTES':r.ingredientsFileName,'MODO DE PREPARO':r.preparationFileName,'MEDIDAS':r.measures,'OBSERVAÇÃO':r.observations,'VERSÃO':`v${r.version||1}`},
      testes:{...common,'IDRECEITA':r.recipeCode||'—','RECEITA':r.recipeName,'PRODUTO':r.productName,'VERSÃO':`v${r.version||1}`,'RESULTADO':st,'OBSERVAÇÕES':r.observations,'DATA DO TESTE':dt},
      compras:{...common,'PRODUTO':r.productName,'FORNECEDORES':r.suppliers,'INSUMOS':r.materials,'CUSTOS':r.costs},
      marketing:{...common,'PRODUTO':r.productName,'POSICIONAMENTO':r.commercialName,'PÚBLICO-ALVO':r.targetAudience,'EMBALAGEM':r.packaging},
      liberacoes:{...common,'PRODUTO':r.productName,'RECEITA/VERSÃO':r.recipeLabel||'—','QUALIDADE':r.quality||'Aprovado','COMPRAS':r.purchases||'Concluído','MARKETING':r.marketing||'Concluído','DECISÃO':r.releaseDecision||st,'JUSTIFICATIVA':r.justification},
      aprovacoes:{'SOLICITAÇÃO':r.requestNo,'ETAPA':r.stageLabel||r.type,'DEPARTAMENTO':r.department,'CÓDIGO':r.sourceCode||r.sourceId,'PRODUTO / IDEIA':r.productLabel||r.item,'DETALHES':r.details,'DATA':formatDate(r.date),'STATUS':st}
    };
    return maps[module]||null;
  }
  function valuesFor(module,r){
    const map=columnValues(module,r);
    const ths=$$(`#page-${module} thead th`).slice(0,-1).map(th=>th.textContent.trim().toLocaleUpperCase('pt-BR'));
    if(map && ths.length && ths.every(h=>h in map)) return ths.map(h=>map[h]);
    return rowFor(module,r); // páginas sem mapa (usuários, lixeira) ou cabeçalho desconhecido
  }
  function renderModule(module){
    const tbody=$(`#tbody-${module}`);if(!tbody)return;tbody.innerHTML='';
    let list=records[module];
    if(module==='aprovacoes') list=list.filter(r=>approvalModules.includes(r.sourceModule));
    if(module==='lixeira') list=list.filter(r=>['ideias','usuarios'].includes(r.originalModule));
    if(module==='usuarios' && !isAdmin()) list=[];
    if(module==='usuarios'&&!isAdmin())list=list.filter(r=>r.email===currentUser.email || r.department===currentUser.department);
    if(!list.length){const tr=document.createElement('tr');tr.className='empty-row';tr.innerHTML=`<td colspan="${$(`#page-${module} thead tr`).children.length}"><div class="empty-state-icon">＋</div><div class="empty-state-title">Nenhum ${labels[module]} cadastrado</div><div class="empty-state-hint">${module==='aprovacoes'?'As solicitações aparecerão quando um item for cadastrado.':`Clique em “Adicionar ${labels[module]}” para começar.`}</div></td>`;tbody.appendChild(tr);return;}
    list.forEach(r=>{if(module==='projetos'){const idea=records.ideias.find(x=>x.id===r.ideaId);r.ideaCode=r.ideaCode||idea?.code||'—';r.ideaName=r.ideaName||idea?.name||'';}if(module==='produtos'){const project=records.projetos.find(x=>x.id===r.projectId);r.projectCode=r.projectCode||project?.code||'—';r.projectName=r.projectName||project?.name||'';}if(module==='receitas'){const product=records.produtos.find(x=>x.id===r.productId);r.productCode=r.productCode||product?.code||'—';r.productName=r.productName||product?.name||'';}if(module==='testes'){const recipe=records.receitas.find(x=>x.id===r.recipeId);r.recipeCode=r.recipeCode||recipe?.code||'—';}const tr=document.createElement('tr');const vals=valuesFor(module,r);tr.innerHTML=vals.map(v=>`<td>${safe(v||'—')}</td>`).join('')+`<td>${actionButtons(module,r)}</td>`;tbody.appendChild(tr);});
  }
  function applyPermissions(){
    $$('[data-add="usuarios"]').forEach(b=>b.classList.toggle('d-none',!canManageUsers()));
    $$('[data-add="aprovacoes"]').forEach(b=>b.classList.add('d-none'));
    $$('[data-add="liberacoes"]').forEach(b=>b.classList.toggle('d-none',!isAdmin()));
    $$('[data-add]').forEach(b=>{const m=b.dataset.add;if([...operationalModules].includes(m)){b.classList.toggle('d-none',!canCreateModule(m));b.disabled=!prerequisites(m);b.title=b.disabled?prerequisiteMessage(m):'';}});
    $$('[data-page="usuarios"],[data-page="lixeira"]').forEach(a=>a.classList.toggle('d-none',!isAdmin()));
    $$('.nav-label').forEach(el=>{ if(el.textContent.trim()==='ADMINISTRAÇÃO') el.classList.toggle('d-none',!isAdmin()); });
  }
  function renderAll(){applyPermissions();modules.forEach(renderModule);}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-edit]');if(b)openEdit(b.dataset.edit,b.dataset.id);const sbtn=e.target.closest('[data-submit-approval]');if(sbtn)submitForApproval(sbtn.dataset.submitApproval,sbtn.dataset.id);const dbtn=e.target.closest('[data-delete]');if(dbtn)deleteRecord(dbtn.dataset.delete,dbtn.dataset.id);const rb=e.target.closest('[data-restore]');if(rb)restoreTrash(rb.dataset.restore);const eb=e.target.closest('[data-empty-trash]');if(eb)emptyTrash();const nv=e.target.closest('[data-new-version]');if(nv)createNewRecipeVersion(nv.dataset.newVersion);const ntv=e.target.closest('[data-new-test-version]');if(ntv)createNewTestVersion(ntv.dataset.newTestVersion);});
  $$('[data-search]').forEach(input=>input.addEventListener('input',()=>{const module=input.dataset.search,query=input.value.toLocaleLowerCase('pt-BR');const tbody=$(`#tbody-${module}`);if(!tbody)return;$$('tr',tbody).forEach(tr=>{if(tr.classList.contains('empty-row'))return;tr.hidden=!tr.textContent.toLocaleLowerCase('pt-BR').includes(query);});}));

  // Valida a sessão (se a conta ainda existir) e desenha as tabelas ao abrir a página.
  // Antes, renderAll() nunca era chamado no carregamento e enterApp() não existia,
  // então a tabela de usuários só aparecia depois de alguma ação na tela.
  try{
    const user=users.find(u=>String(u.email||'').toLowerCase()===String(currentUser.email||'').toLowerCase());
    if(!user){sessionStorage.removeItem(currentUserKey);window.location.replace('../index.html');return;}
    // Mantém perfil/departamento da sessão sincronizados com a conta atual.
    currentUser={...currentUser,name:user.name,department:user.department,profile:user.profile};
    sessionStorage.setItem(currentUserKey,JSON.stringify(currentUser));
  }catch(_){}
  renderAll();
});

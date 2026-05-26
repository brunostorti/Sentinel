import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente (local ou prod)
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Necessita bypass RLS

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const firstNames = ["Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gabriel", "Helena", "Igor", "Julia", "Lucas", "Mariana", "Nicolas", "Olivia", "Pedro", "Raquel", "Samuel", "Tatiana", "Vinicius", "Yasmin"];
const lastNames = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa"];

async function seedEmployees() {
  console.log('Iniciando seed de colaboradores (employees)...');

  // 1. Buscar empresas criadas (GlobalCorp e AgileScale)
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name')
    .in('name', ['GlobalCorp S.A.', 'AgileScale Tech']);

  if (companiesError) {
    console.error('Erro ao buscar empresas:', companiesError);
    process.exit(1);
  }

  if (!companies || companies.length === 0) {
    console.error('Nenhuma empresa encontrada. Certifique-se de que GlobalCorp e AgileScale existem.');
    process.exit(1);
  }

  // 2. Buscar os departamentos dessas empresas
  const { data: departments, error: deptsError } = await supabase
    .from('departments')
    .select('id, name, company_id')
    .in('company_id', companies.map(c => c.id));

  if (deptsError) {
    console.error('Erro ao buscar departamentos:', deptsError);
    process.exit(1);
  }

  let totalInserted = 0;

  for (const company of companies) {
    const companyDepts = departments?.filter(d => d.company_id === company.id) || [];
    
    if (companyDepts.length === 0) {
      console.log(`Empresa ${company.name} não possui departamentos. Pulando.`);
      continue;
    }

    const isGlobalCorp = company.name === 'GlobalCorp S.A.';
    const numEmployees = isGlobalCorp ? 30 : 10;
    
    console.log(`Gerando ${numEmployees} colaboradores para ${company.name}...`);
    
    const newEmployees = [];
    
    for (let i = 0; i < numEmployees; i++) {
      // Pick a random department
      const randomDept = companyDepts[Math.floor(Math.random() * companyDepts.length)];
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const randomStr = Math.random().toString(36).substring(2, 6);
      
      const emailDomain = isGlobalCorp ? 'globalcorp.com' : 'agilescale.tech';
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}_${randomStr}@${emailDomain}`
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      newEmployees.push({
        company_id: company.id,
        department_id: randomDept.id,
        name: `${firstName} ${lastName}`,
        email: email,
      });
    }

    // Insert in chunks or all at once
    const { error: insertError } = await supabase
      .from('employees')
      .insert(newEmployees);

    if (insertError) {
      console.error(`Erro ao inserir colaboradores na ${company.name}:`, insertError);
    } else {
      console.log(`✅ ${newEmployees.length} colaboradores inseridos em ${company.name}.`);
      totalInserted += newEmployees.length;
    }
  }

  console.log(`Concluído. Total de colaboradores inseridos: ${totalInserted}`);
  process.exit(0);
}

seedEmployees();

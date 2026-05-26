import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPasswords() {
  const emails = ['rh.globalcorp@sentinel.com', 'rh.agilescale@sentinel.com'];
  
  for (const email of emails) {
    // Buscar o usuário
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Erro ao listar usuários:', listError);
      continue;
    }
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.error(`Usuário ${email} não encontrado.`);
      continue;
    }
    
    // Atualizar senha
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: 'senha123' }
    );
    
    if (error) {
      console.error(`Erro ao atualizar senha para ${email}:`, error);
    } else {
      console.log(`Senha atualizada com sucesso para ${email}`);
    }
  }
}

resetPasswords().then(() => console.log('Finalizado.'));

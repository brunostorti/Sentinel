# Modelos de e-mail do Supabase Auth

Cópia versionada dos modelos colados no painel (Authentication > Emails > Templates). Os
links trazem um `token_hash` e passam por `/api/auth/callback` → `/confirmar-acesso`, onde o
usuário clica para entrar. Assim o link funciona em qualquer aparelho e não é gasto pelos
verificadores de links do e-mail corporativo.

| Modelo no painel | Arquivo | Assunto |
|---|---|---|
| Magic Link | `magic-link.html` | Seu link de acesso ao Sentinel |
| Confirm signup | `confirm-signup.html` | Confirme seu acesso ao Sentinel |
| Invite user | `invite.html` | Você foi convidado para o Sentinel |

O link usa `{{ .RedirectTo }}`, que já leva o endereço do app e o `?next=`. Por isso, as
Redirect URLs do painel (Authentication > URL Configuration) precisam aceitar o endereço de
produção e o local (`https://<app>/**` e `http://localhost:3000/**`); se não aceitarem, o
Supabase troca pelo Site URL e o link quebra.

## Ordem de implantação

1. Publicar o código com `/confirmar-acesso` (deploy na Vercel).
2. Configurar o SMTP próprio (Authentication > Emails > SMTP Settings). O SMTP padrão do
   Supabase só entrega para membros da organização e envia poucos e-mails por hora.
3. Ajustar o limite de e-mails por hora (Authentication > Rate Limits).
4. Colar os três modelos e assuntos acima.

Os e-mails antigos (link com `?code=`) continuam aceitos pelo callback, mas só funcionam no
navegador que pediu o link.

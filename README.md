This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

### Configurar PostgreSQL para produção

O projeto usa PostgreSQL pelo pacote `pg`. As APIs criam as tabelas `expenses` e `aportes` automaticamente na primeira requisição. Em produção, o app bloqueia alterações se o banco estiver sem configuração ou indisponível; os dados nunca são tratados como salvos apenas no navegador.

1. Antes de publicar, abra o app no navegador que contém os dados atuais e use **Backup JSON** para baixar uma cópia. Dados guardados apenas no navegador não são enviados automaticamente ao banco.
2. No Vercel, abra **Marketplace → Storage** e instale um provedor PostgreSQL, como Neon, Supabase ou Prisma Postgres. Conecte o banco ao projeto e habilite a conexão para **Production**. O Vercel informa as variáveis de conexão do provedor no projeto.
3. Confirme que Production recebe uma variável de conexão PostgreSQL. O código reconhece `POSTGRES_URL`, `DATABASE_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_URL_POOLED`, `DATABASE_POSTGRES_URL` e `DATABASE_PRISMA_DATABASE_URL`. Não coloque a URL no código nem a envie pelo chat.
4. Em **Project Settings → Environment Variables**, configure também `APP_PASSWORD` e `AUTH_SECRET` como valores fortes e exclusivos para Production. Gere o segredo com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` e não reutilize os valores de desenvolvimento.
5. Faça um novo deploy após conectar o banco ou alterar variáveis. Faça login, confirme que o app carrega e restaure o JSON pelo botão **Restaurar Backup**. Essa ação substitui os dados existentes no banco.
6. Atualize a página e confirme que os lançamentos e aportes continuam lá. Um banco novo começa vazio até a restauração do backup.

Para desenvolvimento local, copie `.env.example` para `.env.local` e preencha as variáveis localmente. Mantenha `.env.local` fora do Git.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

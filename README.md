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

### Antes do primeiro deploy

1. Abra o app no navegador onde os dados atuais estão salvos e use **Backup JSON** para baixar uma cópia. Se esses dados estão só no navegador, faça isso antes de trocar de computador ou limpar os dados do navegador.
2. Crie um repositório privado no GitHub e envie este projeto. Não envie arquivos `.env` nem credenciais.
3. Importe o repositório no Vercel e crie um banco PostgreSQL gerenciado. Copie a connection string do banco.
4. Em **Project Settings → Environment Variables**, configure `POSTGRES_URL`, `APP_PASSWORD` e `AUTH_SECRET` para Production. Use uma senha de acesso própria e um segredo aleatório longo para `AUTH_SECRET` (por exemplo, gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Não use os valores de desenvolvimento.
5. Faça o deploy. Abra o endereço publicado, entre com `APP_PASSWORD` e use **Restaurar Backup** para importar o JSON baixado no passo 1. A restauração substitui os dados que já estiverem no banco.
6. Confira os lançamentos e aportes no Vercel antes de continuar usando o app. Com o banco indisponível, a versão de produção bloqueia alterações em vez de guardá-las apenas no navegador.

O schema das tabelas é criado automaticamente quando a API é acessada. Um banco novo fica vazio até você importar o backup.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Projeto Chalés em Barreirinhas",
  description: "Controle Detalhado de Materiais & Execução 2ª Fase",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full dark">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        />
      </head>
      <body className="h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}

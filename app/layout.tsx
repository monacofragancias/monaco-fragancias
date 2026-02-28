import "./globals.css";
import { CarritoProvider } from "./providers/CarritoProvider";

export const metadata = {
  title: "MONACO FRAGANCIAS",
  description: "Perfumes premium - Monaco Fragancias",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <CarritoProvider>{children}</CarritoProvider>
      </body>
    </html>
  );
}
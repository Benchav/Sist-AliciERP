import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, AlertCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50">
        <AlertCircle className="h-12 w-12 text-indigo-600" />
      </div>
      <h1 className="mb-2 text-4xl font-bold text-slate-900">Página no encontrada</h1>
      <p className="mb-8 text-lg text-slate-600 max-w-md">
        Lo sentimos, la página que estás buscando no existe o ha sido movida.
      </p>
      <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200">
        <Link to="/">
          <Home className="mr-2 h-4 w-4" />
          Volver al Inicio
        </Link>
      </Button>
    </div>
  );
};

export default NotFound;

import { ShieldCheck } from "lucide-react";
import { SuperAdminPanel } from "@/components/super-admin-panel";

export default function AdminPage(){return <div className="mx-auto max-w-6xl space-y-6"><div><p className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck size={16}/>SuperAdmin</p><h1 className="text-3xl font-black">Empresas clientes</h1><p className="mt-1 text-sm text-slate-500">Crea cada tenant y entrega una cuenta administradora inicial.</p></div><SuperAdminPanel/></div>}

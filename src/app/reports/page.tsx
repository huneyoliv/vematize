import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getReportData } from './actions';
import { SalesReportChart } from './components/sales-report-chart';

/**
 * Página de Relatórios - APENAS ADMIN
 * 
 * Exibe relatórios de vendas e métricas financeiras
 */
export default async function ReportsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Relatórios são apenas para admin
  if (session.type !== 'admin') {
    redirect('/dashboard');
  }

  // Busca dados de relatório
  const reportData = await getReportData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground mt-2">
          Visualize métricas de vendas e faturamento
        </p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {reportData.totalRevenue.toFixed(2).replace('.', ',')}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita total histórica (simulada)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita (Últimos 90 dias)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {reportData.revenueLast90Days.toFixed(2).replace('.', ',')}
            </div>
            <p className="text-xs text-muted-foreground">
              Faturamento dos últimos 90 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita (Últimos 30 dias)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {reportData.revenueLast30Days.toFixed(2).replace('.', ',')}
            </div>
            <p className="text-xs text-muted-foreground">
              Faturamento dos últimos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Vendas */}
      {reportData.dailySales.length > 0 ? (
        <SalesReportChart dailySales={reportData.dailySales} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Nenhum dado de vendas disponível ainda.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

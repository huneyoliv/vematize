import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Activity,
  Building,
  DollarSign,
  Users,
  CreditCard,
  Clock,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import { getKrovDashboardData } from '@/app/krov/dashboard/actions';
import { SalesReportChart } from '@/app/krov/reports/components/sales-report-chart';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export default async function AdminDashboard() {
  const data = await getKrovDashboardData();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Krov */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-background">
        <div className="p-6">
          <h2 className="text-lg font-bold">⚡ Krov Admin</h2>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <a href="/dashboard" className="block px-4 py-2 rounded-lg bg-primary text-primary-foreground">
            Dashboard
          </a>
          <a href="/krov/clients" className="block px-4 py-2 rounded-lg hover:bg-muted">
            Clientes
          </a>
          <a href="/krov/settings" className="block px-4 py-2 rounded-lg hover:bg-muted">
            Configurações
          </a>
          <a href="/krov/coupons" className="block px-4 py-2 rounded-lg hover:bg-muted">
            Cupons
          </a>
          <a href="/logout" className="block px-4 py-2 rounded-lg hover:bg-muted text-destructive">
            Sair
          </a>
        </nav>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto">
        <div className="border-b bg-background sticky top-0 z-10">
          <div className="flex h-16 items-center px-4 md:px-8">
            <h1 className="text-2xl font-bold tracking-tight">Dashboard Admin</h1>
          </div>
        </div>
        <div className="flex-1 space-y-4 p-4 md:p-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Receita Total
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  Total de vendas aprovadas
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Vendas (Mês)
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.monthSales)}</div>
                <p className="text-xs text-muted-foreground">
                  Vendas aprovadas este mês
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Vendas (Hoje)
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.todaySales)}</div>
                <p className="text-xs text-muted-foreground">
                  Vendas aprovadas hoje
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.averageTicket)}</div>
                <p className="text-xs text-muted-foreground">
                  Valor médio por venda
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 pt-4">
            <div className="lg:col-span-3">
              <SalesReportChart dailySales={data.salesChartData} />
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pedidos Pagos</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.paidOrders}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.pendingOrders}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.conversionRate.toFixed(2)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Clientes
                  </CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalClients}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Assinantes Ativos
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.activeSubscribers}</div>
                </CardContent>
              </Card>
              <div />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


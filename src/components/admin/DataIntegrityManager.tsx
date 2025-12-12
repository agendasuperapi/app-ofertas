import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Wrench,
  ChevronDown,
  ChevronRight,
  Clock,
  Store,
  Search,
  History,
  Shield,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAdminDataIntegrityCheck, IntegrityIssue, StoreIssues } from '@/hooks/useAdminDataIntegrityCheck';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ISSUE_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; autoFix: boolean }> = {
  order_total_mismatch: { 
    label: 'Valores de pedido desincronizados', 
    icon: <AlertCircle className="h-4 w-4" />,
    autoFix: true 
  },
  commission_items_mismatch: { 
    label: 'Soma de comissões inconsistente', 
    icon: <AlertTriangle className="h-4 w-4" />,
    autoFix: false 
  },
  affiliate_config_desync: { 
    label: 'Configurações de afiliado desincronizadas', 
    icon: <AlertTriangle className="h-4 w-4" />,
    autoFix: true 
  },
  missing_commission: { 
    label: 'Comissões não registradas', 
    icon: <XCircle className="h-4 w-4" />,
    autoFix: false 
  },
  negative_values: { 
    label: 'Valores negativos detectados', 
    icon: <XCircle className="h-4 w-4" />,
    autoFix: true 
  },
};

interface IssueCardProps {
  issue: IntegrityIssue;
  onFix: (storeId: string, issueType: string) => void;
  isFixing: boolean;
}

function IssueCard({ issue, onFix, isFixing }: IssueCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const config = ISSUE_TYPE_LABELS[issue.issue_type] || { 
    label: issue.issue_type, 
    icon: <AlertTriangle className="h-4 w-4" />,
    autoFix: false 
  };

  return (
    <div className={`rounded-lg border p-3 ${
      issue.severity === 'error' 
        ? 'border-destructive/50 bg-destructive/5' 
        : 'border-amber-500/50 bg-amber-500/5'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className={issue.severity === 'error' ? 'text-destructive' : 'text-amber-600'}>
            {config.icon}
          </div>
          <div>
            <p className="font-medium text-sm">{config.label}</p>
            <p className="text-xs text-muted-foreground">
              {issue.affected_count} registro(s) afetado(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={issue.severity === 'error' ? 'destructive' : 'secondary'}>
            {issue.severity === 'error' ? 'Erro' : 'Aviso'}
          </Badge>
          {config.autoFix && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onFix(issue.store_id, issue.issue_type)}
              disabled={isFixing}
            >
              <Wrench className="h-3 w-3 mr-1" />
              Corrigir
            </Button>
          )}
        </div>
      </div>
      
      {issue.sample_data && issue.sample_data.length > 0 && (
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="mt-2 h-6 text-xs">
              {showDetails ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
              Ver detalhes ({issue.sample_data.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-2 rounded bg-muted/50 text-xs max-h-32 overflow-auto">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(issue.sample_data.slice(0, 5), null, 2)}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

interface StoreIssuesCardProps {
  store: StoreIssues;
  onFix: (storeId: string, issueType: string) => void;
  isFixing: boolean;
}

function StoreIssuesCard({ store, onFix, isFixing }: StoreIssuesCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Store className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">{store.store_name}</CardTitle>
                  <CardDescription className="text-xs">
                    {store.issues.length} problema(s) detectado(s)
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {store.totalErrors > 0 && (
                  <Badge variant="destructive">{store.totalErrors} erro(s)</Badge>
                )}
                {store.totalWarnings > 0 && (
                  <Badge variant="secondary">{store.totalWarnings} aviso(s)</Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-2">
            {store.issues.map((issue, idx) => (
              <IssueCard 
                key={`${issue.issue_type}-${idx}`} 
                issue={issue} 
                onFix={onFix}
                isFixing={isFixing}
              />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function DataIntegrityManager() {
  const {
    storesWithIssues,
    history,
    isLoading,
    isFixing,
    lastChecked,
    totalIssues,
    totalErrors,
    totalWarnings,
    storesWithIssuesCount,
    totalStoresChecked,
    runCheck,
    fixIssue,
    fixAllIssues,
  } = useAdminDataIntegrityCheck();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Filter stores by search
  const filteredStores = storesWithIssues.filter(store => 
    store.store_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count stores with auto-fixable issues
  const autoFixableCount = storesWithIssues.reduce((count, store) => {
    return count + store.issues.filter(i => 
      ISSUE_TYPE_LABELS[i.issue_type]?.autoFix
    ).length;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${storesWithIssuesCount > 0 ? 'bg-destructive/10' : 'bg-emerald-500/10'}`}>
                  <Store className={`h-5 w-5 ${storesWithIssuesCount > 0 ? 'text-destructive' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{storesWithIssuesCount}</p>
                  <p className="text-xs text-muted-foreground">Lojas com problemas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${totalErrors > 0 ? 'bg-destructive/10' : 'bg-emerald-500/10'}`}>
                  <XCircle className={`h-5 w-5 ${totalErrors > 0 ? 'text-destructive' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalErrors}</p>
                  <p className="text-xs text-muted-foreground">Erros críticos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${totalWarnings > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                  <AlertTriangle className={`h-5 w-5 ${totalWarnings > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalWarnings}</p>
                  <p className="text-xs text-muted-foreground">Avisos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalStoresChecked}</p>
                  <p className="text-xs text-muted-foreground">Lojas verificadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar loja..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              
              {lastChecked && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Última verificação: {format(lastChecked, "HH:mm:ss", { locale: ptBR })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4 mr-2" />
                Histórico
              </Button>
              
              {autoFixableCount > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={fixAllIssues}
                  disabled={isFixing}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Corrigir Todos ({autoFixableCount})
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={runCheck}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Verificar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issues List */}
        <div className={showHistory ? 'lg:col-span-2' : 'lg:col-span-3'}>
          {totalIssues === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center gap-4">
                  <div className="p-4 rounded-full bg-emerald-500/10">
                    <Shield className="h-12 w-12 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Sistema Íntegro</h3>
                    <p className="text-muted-foreground">
                      {totalStoresChecked > 0 
                        ? `Todas as ${totalStoresChecked} lojas ativas foram verificadas. Nenhuma inconsistência detectada.`
                        : 'Nenhuma inconsistência de dados detectada em todas as lojas.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                <AnimatePresence>
                  {filteredStores.map((store, idx) => (
                    <motion.div
                      key={store.store_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <StoreIssuesCard 
                        store={store} 
                        onFix={fixIssue}
                        isFixing={isFixing}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* History Panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico de Correções
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {history.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Nenhuma correção realizada ainda.
                        </p>
                      ) : (
                        history.map((correction) => (
                          <div key={correction.id} className="border rounded-lg p-3 text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">{correction.store_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {ISSUE_TYPE_LABELS[correction.issue_type]?.label || correction.issue_type}
                                </p>
                              </div>
                              <Badge variant="outline">{correction.fixed_count}</Badge>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span>{correction.fixed_by_name}</span>
                              <span>{format(new Date(correction.fixed_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

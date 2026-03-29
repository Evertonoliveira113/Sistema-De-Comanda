import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const isNetworkError = this.state.error?.message.includes('fetch') || 
                            this.state.error?.message.includes('Network') ||
                            this.state.error?.message.includes('Supabase');

      return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[32px] border border-zinc-100 shadow-xl max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={40} className="text-red-600" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-zinc-900">Ops! Algo deu errado</h2>
              <p className="text-zinc-500 font-medium">
                {isNetworkError 
                  ? 'Não conseguimos conectar ao servidor. Verifique sua conexão ou as configurações do Supabase.'
                  : 'Ocorreu um erro inesperado na aplicação.'}
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-zinc-50 rounded-2xl text-left overflow-auto max-h-32">
                <code className="text-xs text-red-600 font-mono">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.reload()} className="w-full">
                <RefreshCw size={18} className="mr-2" />
                Recarregar Página
              </Button>
              <Button variant="ghost" onClick={() => this.setState({ hasError: false, error: null })} className="w-full">
                Tentar Novamente
              </Button>
            </div>
            
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Dica: Verifique se as chaves do Supabase estão corretas no painel de Secrets.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

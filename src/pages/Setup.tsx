import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Setup = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreateAdmin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: {
          email: 'douglas@pontua.com.br',
          password: 'pontua12345'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Sucesso!",
          description: "Usuário admin criado com sucesso. Você já pode fazer login.",
        });
        setTimeout(() => navigate('/login'), 2000);
      } else {
        throw new Error(data.error || 'Erro ao criar usuário');
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar usuário admin",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Setup Inicial</CardTitle>
          <CardDescription>
            Clique no botão abaixo para criar o primeiro usuário administrador do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm font-medium">Email:</p>
              <p className="text-sm text-muted-foreground">douglas@pontua.com.br</p>
              <p className="text-sm font-medium mt-2">Senha:</p>
              <p className="text-sm text-muted-foreground">pontua12345</p>
            </div>
            <Button 
              onClick={handleCreateAdmin} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Criando..." : "Criar Usuário Admin"}
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Ir para Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Setup;

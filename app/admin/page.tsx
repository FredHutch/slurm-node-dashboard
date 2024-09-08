"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { generateEmbeddingsAction } from "@/plugins/chat/actions/embeddings";
import { openaiPluginMetadata } from "@/actions/plugins";

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleGenerateEmbeddings = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const result = await generateEmbeddingsAction();
      setResult(result);
    } catch (error) {
      setResult({ success: false, message: "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-white mb-8">
          Admin Dashboard
        </h1>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Plugins</h2>
          {openaiPluginMetadata.isEnabled ? (
            <Card>
              <CardHeader>
                <CardTitle>OpenAI Functions</CardTitle>
                <CardDescription>
                  Manage and update embeddings for improved content search
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleGenerateEmbeddings}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Embeddings...
                    </>
                  ) : (
                    "Update Embeddings"
                  )}
                </Button>
              </CardContent>
              <CardFooter>
                {result && (
                  <Alert
                    variant={result.success ? "default" : "destructive"}
                    className="w-full"
                  >
                    {result.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {result.success ? "Success" : "Error"}
                    </AlertTitle>
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                )}
              </CardFooter>
            </Card>
          ) : (
            <Alert>
              <AlertTitle>Plugin Disabled</AlertTitle>
              <AlertDescription>
                The OpenAI Plugin is currently not enabled. Please check your
                configuration.
              </AlertDescription>
            </Alert>
          )}
        </section>
      </div>
    </div>
  );
}

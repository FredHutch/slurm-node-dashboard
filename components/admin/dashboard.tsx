"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
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
import { Separator } from "@/components/ui/separator";
import { Toaster, toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Home, LogOut } from "lucide-react";
import { generateEmbeddingsAction } from "@/plugins/chat/actions/embeddings";
import { openaiPluginMetadata } from "@/actions/plugins";

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const handleGenerateEmbeddings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateEmbeddingsAction();
      if (result.success) {
        toast.success(result.message, {
          duration: 2000,
        });
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div className="space-y-6 mx-5 mt-5">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      <Separator />

      <div className="max-w-[90%] mx-auto w-[1000px]">
        <Card>
          <CardHeader>
            <CardTitle>Plugins Management</CardTitle>
            <CardDescription>Manage and update plugin settings</CardDescription>
          </CardHeader>
          <CardContent>
            {openaiPluginMetadata.isEnabled ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>OpenAI Plugin Enabled</AlertTitle>
                  <AlertDescription>
                    The OpenAI Plugin is currently active and running.
                  </AlertDescription>
                </Alert>
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
              </div>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Plugin Disabled</AlertTitle>
                <AlertDescription>
                  The OpenAI Plugin is currently not enabled. Please check your
                  configuration.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          {error && (
            <CardFooter>
              <Alert variant="destructive" className="w-full">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}

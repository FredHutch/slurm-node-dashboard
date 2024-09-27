"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toaster, toast } from "sonner";
import { Home, LogOut } from "lucide-react";
import { generateEmbeddingsAction } from "@/plugins/chat/actions/embeddings";
import ClusterStats from "./cluster-stats";
import AdminPlugins from "./plugins";

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
        <AdminPlugins
          handleGenerateEmbeddings={handleGenerateEmbeddings}
          error={error}
          isLoading={isLoading}
        />
        <div className="mt-5">
          <ClusterStats />
        </div>
      </div>
    </div>
  );
}

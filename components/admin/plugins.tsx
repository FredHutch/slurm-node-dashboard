import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { AlertTitle, AlertDescription, Alert } from "../ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { openaiPluginMetadata } from "@/actions/plugins";
import { Button } from "../ui/button";

const AdminPlugins = ({ isLoading, error, handleGenerateEmbeddings }: any) => {
  return (
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
  );
};

export default AdminPlugins;

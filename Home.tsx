import React, { useState } from "react";
import { useAnalyzeUrl } from "@workspace/api-client-react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Globe,
  Image as ImageIcon,
  Search,
  Type,
  Zap,
  LayoutTemplate,
  Crosshair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
  status = "neutral",
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  description?: string;
  loading?: boolean;
  status?: "neutral" | "success" | "warning" | "error";
}) {
  const statusColors = {
    neutral: "text-muted-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    error: "text-destructive",
  };

  return (
    <Card className="rounded-none border-2 shadow-sm transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-semibold text-muted-foreground tracking-tight uppercase">
          {title}
        </CardTitle>
        <Icon className={`w-4 h-4 ${statusColors[status]}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24 mt-1" />
        ) : (
          <div className="text-2xl font-mono font-medium tracking-tight">
            {value}
          </div>
        )}
        {description && !loading && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const { mutate, isPending, data, error, isError } = useAnalyzeUrl();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    let finalUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      finalUrl = `https://${url}`;
    }

    mutate({ data: { url: finalUrl } });
  };

  // Determine status color based on HTTP code
  const getStatusType = (code: number) => {
    if (code >= 200 && code < 300) return "success";
    if (code >= 300 && code < 400) return "warning";
    return "error";
  };

  // Determine response time color
  const getTimeStatus = (time: number) => {
    if (time < 500) return "success";
    if (time < 1500) return "warning";
    return "error";
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-4 mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-primary text-primary-foreground mb-2 shadow-[4px_4px_0px_0px_hsl(var(--foreground))]">
            <Crosshair className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            SITE_ANALYZER<span className="text-primary animate-pulse">_</span>
          </h1>
          <p className="text-muted-foreground max-w-lg text-lg">
            Diagnostic telemetry for web pages. Enter a URL to run a precision extraction of technical metadata.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative z-10 group">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="example.com"
                className="pl-11 h-14 text-lg rounded-none border-2 border-foreground focus-visible:ring-0 focus-visible:border-primary shadow-[4px_4px_0px_0px_hsl(var(--foreground))] font-mono"
                data-testid="input-url"
              />
            </div>
            <Button
              type="submit"
              disabled={isPending || !url}
              className="h-14 px-8 rounded-none border-2 border-transparent text-lg font-semibold shadow-[4px_4px_0px_0px_hsl(var(--foreground))] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_hsl(var(--foreground))] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-analyze"
            >
              {isPending ? (
                <>
                  <Activity className="mr-2 h-5 w-5 animate-spin" />
                  SCANNING
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" />
                  ANALYZE
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Error State */}
        {isError && (
          <Alert variant="destructive" className="rounded-none border-2 shadow-[4px_4px_0px_0px_hsl(var(--destructive))]">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-bold text-lg">Analysis Failed</AlertTitle>
            <AlertDescription className="font-mono mt-1">
              {(error as any)?.error || "An unknown error occurred while analyzing the target."}
            </AlertDescription>
          </Alert>
        )}

        {/* Empty State / Prompt */}
        {!data && !isPending && !isError && (
          <div className="border-2 border-dashed border-muted-foreground/30 p-12 text-center text-muted-foreground/50">
            <LayoutTemplate className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-mono text-sm uppercase tracking-widest">Awaiting Target Coordinates</p>
          </div>
        )}

        {/* Results Dashboard */}
        {(data || isPending) && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Top Level Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded-none border-2 shadow-[4px_4px_0px_0px_hsl(var(--foreground))] md:col-span-2">
                <CardHeader className="pb-3 border-b-2 border-border/50 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Search className="w-5 h-5 text-primary" />
                      PAGE IDENTITY
                    </CardTitle>
                    {data && (
                      <Badge variant="outline" className="rounded-none font-mono text-xs px-2 py-1 bg-background">
                        TARGET: {url}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Title Tag</h3>
                    {isPending ? (
                      <Skeleton className="h-6 w-full" />
                    ) : (
                      <p className="text-lg font-medium leading-tight">
                        {data?.pageTitle || <span className="text-destructive font-mono text-sm">[MISSING]</span>}
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Meta Description</h3>
                    {isPending ? (
                      <Skeleton className="h-16 w-full" />
                    ) : (
                      <p className="text-sm text-foreground/80 line-clamp-3">
                        {data?.metaDescription || <span className="text-destructive font-mono">[MISSING]</span>}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="HTTP Status"
                value={
                  <div className="flex items-baseline gap-1">
                    {data?.httpStatus}
                    {data?.httpStatus && (
                      <span className="text-sm font-sans text-muted-foreground">
                        {data.httpStatus === 200 ? "OK" : ""}
                      </span>
                    )}
                  </div>
                }
                icon={Activity}
                loading={isPending}
                status={data ? getStatusType(data.httpStatus) : "neutral"}
                description="Server response code"
              />
              
              <StatCard
                title="Response Time"
                value={`${data?.responseTime}ms`}
                icon={Clock}
                loading={isPending}
                status={data ? getTimeStatus(data.responseTime) : "neutral"}
                description="Time to first byte"
              />

              <StatCard
                title="Word Count"
                value={data?.wordCount.toLocaleString()}
                icon={Type}
                loading={isPending}
                description="Extracted body text"
              />

              <StatCard
                title="H1 Elements"
                value={data?.h1Count}
                icon={LayoutTemplate}
                loading={isPending}
                status={data?.h1Count === 1 ? "success" : data?.h1Count === 0 ? "error" : "warning"}
                description={
                  data?.h1Count === 1 ? "Optimal" : data?.h1Count === 0 ? "Missing H1" : "Multiple H1s"
                }
              />
            </div>

            {/* Content Health */}
            <div className="grid grid-cols-1 gap-4">
               <Card className="rounded-none border-2 border-l-4 border-l-primary shadow-sm">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-none">
                      <ImageIcon className="w-6 h-6 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Image Accessibility</h3>
                      <p className="text-sm text-muted-foreground">Images missing alt attributes</p>
                    </div>
                  </div>
                  {isPending ? (
                    <Skeleton className="h-10 w-16" />
                  ) : (
                    <div className="text-3xl font-mono font-bold flex items-center gap-2">
                      <span className={data?.imagesMissingAlt && data.imagesMissingAlt > 0 ? "text-destructive" : "text-green-600"}>
                        {data?.imagesMissingAlt}
                      </span>
                      {data?.imagesMissingAlt === 0 && <CheckCircle2 className="w-6 h-6 text-green-600" />}
                      {data?.imagesMissingAlt && data.imagesMissingAlt > 0 ? <AlertCircle className="w-6 h-6 text-destructive" /> : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">CricketOS</p>
      <h1 className="font-display mt-3 text-4xl">The model stumbled.</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        This screen failed to load. The match is still 245 for 4. Try the page again.
      </p>
      <Button type="button" className="mt-6 w-fit" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}

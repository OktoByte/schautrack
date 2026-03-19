export default function Footer() {
  return (
    <footer className="mt-auto px-4 py-6 text-center text-xs text-muted-foreground">
      <p className="mb-2 italic opacity-70">You got this. Trust me.</p>
      <div className="flex justify-center gap-4">
        <a href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">Privacy</a>
        <a href="/terms" className="text-muted-foreground transition-colors hover:text-foreground">Terms</a>
        <a href="/imprint" className="text-muted-foreground transition-colors hover:text-foreground">Imprint</a>
      </div>
    </footer>
  );
}

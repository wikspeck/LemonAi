import { AnalyzerForm } from "@/app/components/analyzer-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="space-y-3">
          <p className="font-semibold text-yellow-700">Dein Lernassistent</p>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
            Lemon AI
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-zinc-600">
            Verwandle dein Lernmaterial in eine klare Zusammenfassung mit den wichtigsten Punkten.
          </p>
        </header>

        <AnalyzerForm />
      </div>
    </main>
  );
}


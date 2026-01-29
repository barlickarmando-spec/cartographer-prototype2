import Link from "next/link";
import TopNav from "@/components/TopNav";
import Card from "@/components/Card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Find Your Perfect Place
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Cartographer helps you discover where you can afford to live, buy a home, and build your future.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/onboarding"
              className="rounded-md bg-slate-900 px-6 py-3 text-base font-semibold text-white hover:bg-slate-800"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="text-base font-semibold leading-6 text-slate-900"
            >
              Learn more <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">How It Works</h2>
            <p className="mt-4 text-lg text-slate-600">
              Simple steps to find your ideal location
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            <Card>
              <div className="mb-4 h-12 w-12 rounded-lg bg-slate-900"></div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">1. Answer Questions</h3>
              <p className="text-slate-600">
                Tell us about your household, career, finances, and goals.
              </p>
            </Card>
            <Card>
              <div className="mb-4 h-12 w-12 rounded-lg bg-slate-900"></div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">2. Select Locations</h3>
              <p className="text-slate-600">
                Choose states and cities you're interested in exploring.
              </p>
            </Card>
            <Card>
              <div className="mb-4 h-12 w-12 rounded-lg bg-slate-900"></div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">3. Get Results</h3>
              <p className="text-slate-600">
                See detailed affordability analysis for each location.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* What We Answer */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">What We Answer</h2>
            <p className="mt-4 text-lg text-slate-600">
              Get answers to your most important questions
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <h3 className="mb-2 font-semibold text-slate-900">When can I afford a home?</h3>
              <p className="text-slate-600">
                We calculate exactly when you'll have enough saved for a down payment and mortgage.
              </p>
            </Card>
            <Card>
              <h3 className="mb-2 font-semibold text-slate-900">What's my debt-free timeline?</h3>
              <p className="text-slate-600">
                See when you'll pay off student loans and credit card debt.
              </p>
            </Card>
            <Card>
              <h3 className="mb-2 font-semibold text-slate-900">Can I afford kids?</h3>
              <p className="text-slate-600">
                Understand how having children affects your financial viability in each location.
              </p>
            </Card>
            <Card>
              <h3 className="mb-2 font-semibold text-slate-900">Which location is best?</h3>
              <p className="text-slate-600">
                Compare affordability, quality of life, and viability across locations.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-900 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Ready to find your place?
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Start your journey today with a free analysis.
          </p>
          <div className="mt-8">
            <Link
              href="/onboarding"
              className="rounded-md bg-white px-6 py-3 text-base font-semibold text-slate-900 hover:bg-slate-100"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

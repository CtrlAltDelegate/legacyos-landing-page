import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function HomePage() {
  const [legacyScore, setLegacyScore] = useState(0);

  useEffect(() => {
    // Animate legacy score on load
    const timer = setInterval(() => {
      setLegacyScore(prev => {
        if (prev >= 73) {
          clearInterval(timer);
          return 73;
        }
        return prev + 1;
      });
    }, 30);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Head>
        <title>LegacyOS - Your Family Office for Generational Wealth</title>
        <meta name="description" content="Build intentional wealth across six key areas with the proven SIXWING methodology. Level up your finances like a game, but create real generational impact for your family." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-lg z-50 border-b border-neutral-200/50">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
            LegacyOS
          </div>
          
          <div className="hidden md:flex space-x-8">
            <Link href="#features" className="text-neutral-600 hover:text-primary-500 font-medium transition-colors">
              Features
            </Link>
            <Link href="#wings" className="text-neutral-600 hover:text-primary-500 font-medium transition-colors">
              Six Wings
            </Link>
            <Link href="#pricing" className="text-neutral-600 hover:text-primary-500 font-medium transition-colors">
              Pricing
            </Link>
            <Link href="/login" className="text-neutral-600 hover:text-primary-500 font-medium transition-colors">
              Login
            </Link>
          </div>

          <Link 
            href="/register"
            className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Start Building Your Family Office
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center bg-gradient-to-br from-neutral-50 to-neutral-100 pt-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-5xl lg:text-6xl font-black leading-tight bg-gradient-to-r from-neutral-800 to-neutral-600 bg-clip-text text-transparent">
              The SIXWING System for Generational Wealth
            </h1>
            <p className="text-xl text-neutral-600 leading-relaxed">
              Build intentional wealth across six key areas with the proven SIXWING methodology. Level up your finances like a game, but create real generational impact for your family.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white font-medium text-lg rounded-lg hover:bg-purple-700 transition-colors"
              >
                Get My Legacy Score
              </Link>
              <Link 
                href="#demo"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-300 text-gray-700 font-medium text-lg rounded-lg hover:border-gray-400 hover:text-gray-900 transition-colors"
              >
                Watch How It Works
              </Link>
            </div>

            <div className="flex space-x-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-500">6</div>
                <div className="text-sm text-neutral-500 uppercase tracking-wide">Wealth Wings</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-500">5</div>
                <div className="text-sm text-neutral-500 uppercase tracking-wide">Levels Each</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-500">∞</div>
                <div className="text-sm text-neutral-500 uppercase tracking-wide">Legacy Impact</div>
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-8 transform perspective-1000 rotate-y-[-15deg] hover:rotate-y-[-10deg] transition-transform duration-500">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-200">
                <h3 className="text-xl font-bold text-neutral-800">The Johnson Family</h3>
                <div className="text-center bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-4 py-2 rounded-xl">
                  <div className="text-2xl font-black">{legacyScore}</div>
                  <div className="text-xs opacity-90">Legacy Score</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <WingPreviewCard 
                  name="🚀 Growth" 
                  level="Level 2 - Portfolio Pioneer" 
                  progress={65}
                  color="bg-wings-growth"
                />
                <WingPreviewCard 
                  name="🛡️ Preservation" 
                  level="Level 1 - Safety Net Starter" 
                  progress={30}
                  color="bg-wings-preservation"
                />
                <WingPreviewCard 
                  name="❤️ Philanthropy" 
                  level="Level 2 - Strategic Giver" 
                  progress={45}
                  color="bg-wings-philanthropy"
                />
                <WingPreviewCard 
                  name="🌟 Experiences" 
                  level="Level 2 - Adventure Planner" 
                  progress={80}
                  color="bg-wings-experiences"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-800 mb-4">
              The SIXWING Methodology
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              From beginner to institutional-level wealth management, the SIXWING System grows with your family's journey across all six critical areas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon="📊"
              title="Progress Tracking"
              description="Visual skill trees show your progress across all six wings of the SIXWING System. See what's lagging behind and get personalized recommendations to maintain balanced growth."
            />
            <FeatureCard 
              icon="🎯"
              title="Action Plan Generator"
              description="Get specific, actionable steps for each level. From opening your first investment account to setting up dynasty trusts - we guide every step."
            />
            <FeatureCard 
              icon="🔗"
              title="Tool Integrations"
              description="Connect seamlessly with Fidelity, Vanguard, Trust & Will, and other providers. Auto-fill applications and track progress across platforms."
            />
            <FeatureCard 
              icon="📋"
              title="Quarterly Reviews"
              description="Professional family office reports every quarter. Track net worth, assess risks, and align financial progress with family values."
            />
            <FeatureCard 
              icon="👥"
              title="Family Collaboration"
              description="Invite your spouse and children to participate. Assign tasks, make decisions together, and build financial literacy across generations."
            />
            <FeatureCard 
              icon="🏆"
              title="Legacy Score"
              description="Gamified but meaningful composite score based on balanced progress. Build wealth that creates lasting impact, not just accumulation."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl font-bold mb-6">Start Building Your Family Office Today</h2>
          <p className="text-xl mb-8 opacity-90">
            Join families who are building generational wealth with intention, balance, and purpose.
          </p>
          <Link 
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-purple-600 font-medium text-lg rounded-lg hover:bg-gray-50 transition-colors"
          >
            Get My Legacy Score
          </Link>
        </div>
      </section>
    </>
  );
}

// Component helpers
function WingPreviewCard({ name, level, progress, color }: {
  name: string;
  level: string;
  progress: number;
  color: string;
}) {
  return (
    <div className={`p-3 rounded-lg border-l-4 ${color.replace('bg-', 'border-l-')} bg-neutral-50`}>
      <div className="font-semibold text-sm text-neutral-800 mb-1">{name}</div>
      <div className="text-xs text-neutral-600 mb-2">{level}</div>
      <div className="bg-neutral-200 rounded-full h-1">
        <div 
          className={`h-1 rounded-full ${color} transition-all duration-1000 ease-out`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-neutral-800 mb-3">{title}</h3>
      <p className="text-neutral-600 leading-relaxed">{description}</p>
    </div>
  );
} 
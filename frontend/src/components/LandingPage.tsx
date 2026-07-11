import React from 'react';
import { Community } from '../lib/contract/types';

interface LandingPageProps {
  communities: Community[];
  onNavigate: (path: string) => void;
  onConnectWallet: () => void;
  isConnected: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  communities,
  onNavigate,
  onConnectWallet,
  isConnected,
}) => {
  // Show first 4 communities
  const activeCommunities = communities.slice(0, 4);

  return (
    <div className="bg-[#000000] text-white min-h-screen">
      {/* Hero Section */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#222222]">
        <div className="max-w-4xl">
          <h1 className="font-mono text-5xl sm:text-6xl md:text-7xl font-black leading-[0.9] mb-6 tracking-tight">
            YOUR RULES.<br />
            YOUR COMMUNITY.<br />
            ENFORCED BY AI.
          </h1>
          <p className="text-[#888888] text-lg max-w-2xl leading-relaxed mb-8">
            Communities write their own constitutions in plain English. GenLayer AI validators evaluate reported content against your rules on-chain. No hidden algorithms. Just your rules.
          </p>

          <div className="flex gap-4 mt-6 mb-4">
            <button
              onClick={() => onNavigate('/communities')}
              className="bg-white text-black px-6 py-3 font-bold text-sm tracking-wider uppercase transition-colors hover:bg-white/80"
            >
              Explore Communities
            </button>
            <button
              onClick={() => onNavigate('/create')}
              className="border border-white text-white px-6 py-3 font-bold text-sm tracking-wider uppercase transition-colors hover:bg-[#111111]"
            >
              Create a Community
            </button>
          </div>

          <p className="text-[#555555] text-[10px] mt-4 uppercase tracking-widest font-mono">
            {isConnected ? (
              <span className="text-[#16a34a]">✓ Wallet Connected. Ready to participate.</span>
            ) : (
              <span>No account required. Connect wallet to participate.</span>
            )}
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#222222]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 font-sans">
          {/* Col 1 */}
          <div className="flex gap-6">
            <div className="font-mono text-3xl font-bold text-white select-none">01</div>
            <div>
              <h3 className="font-bold mb-1 text-white">Write Your Constitution</h3>
              <p className="text-[#888888] text-sm leading-relaxed">
                Your rules live on-chain as plain English. The AI reads exactly what you write.
              </p>
            </div>
          </div>

          {/* Col 2 */}
          <div className="flex gap-6">
            <div className="font-mono text-3xl font-bold text-white select-none">02</div>
            <div>
              <h3 className="font-bold mb-1 text-white">Community Reports</h3>
              <p className="text-[#888888] text-sm leading-relaxed">
                Members report posts that violate rules. Thresholds trigger AI review automatically.
              </p>
            </div>
          </div>

          {/* Col 3 */}
          <div className="flex gap-6">
            <div className="font-mono text-3xl font-bold text-white select-none">03</div>
            <div>
              <h3 className="font-bold mb-1 text-white">AI Consensus</h3>
              <p className="text-[#888888] text-sm leading-relaxed">
                GenLayer validators evaluate content. Verdicts and reasoning are stored permanently.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Communities Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-8">
          <h2 className="font-mono font-bold text-xl uppercase tracking-wider text-white">Active Communities</h2>
          <button
            onClick={() => onNavigate('/communities')}
            className="text-[#555555] text-xs font-mono uppercase tracking-widest hover:text-white transition-colors"
          >
            VIEW ALL &rarr;
          </button>
        </div>

        {activeCommunities.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-40 bg-[#111111] border border-[#222222]"></div>
            <div className="h-40 bg-[#111111] border border-[#222222]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCommunities.map((comm) => (
              <div
                key={comm.community_id}
                className="bg-[#111111] border border-[#222222] p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-mono text-lg font-bold text-white">{comm.name}</h3>
                    <span className="text-[10px] text-[#555555] font-mono">
                      0x{comm.founder.slice(2, 6)}...{comm.founder.slice(-4)}
                    </span>
                  </div>

                  <p className="text-[#888888] text-xs line-clamp-2 mb-3 leading-relaxed">
                    {comm.description}
                  </p>

                  <div className="flex gap-2 mb-4">
                    {comm.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] border border-[#222222] px-2 py-0.5 text-[#888888] uppercase font-mono"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="text-[10px] text-[#555555] mb-4">
                    <span className="text-[#888888] italic font-mono block truncate">
                      "{comm.constitution.slice(0, 100)}..."
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#555555] font-mono mb-3 uppercase tracking-wider">
                    {comm.member_count} members · {comm.post_count} posts
                  </div>
                  <button
                    onClick={() => onNavigate(`/communities/${comm.community_id}`)}
                    className="w-full border border-white py-2 text-[11px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
                  >
                    Enter Community
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Simple Footer */}
      <footer className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#222222] text-[11px] text-[#555555] uppercase tracking-[0.2em] flex flex-col sm:flex-row justify-between gap-4 items-center">
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">
            Terms of Protocol
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Documentation
          </a>
          <a href="#" className="hover:text-white transition-colors">
            GenLayer
          </a>
        </div>
        <div>&copy; 2026 SovereignSpaces — Decentralized Justice</div>
      </footer>
    </div>
  );
};

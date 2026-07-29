import React, { useState } from 'react';
import { useWallet } from '../lib/genlayer/wallet.ts';
import { useCreateCommunity } from '../hooks/SovereignSpaces.ts';

interface CreateCommunityPageProps {
  onAddToast: (text: string, type: 'success' | 'error' | 'warning') => void;
  onNavigate: (path: string) => void;
}

export const CreateCommunityPage: React.FC<CreateCommunityPageProps> = ({
  onAddToast,
  onNavigate,
}) => {
  const { address: wallet, connectWallet } = useWallet();
  const { isPending: isCreatingCommunity, mutate: createCommunity } = useCreateCommunity()

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [constitution, setConstitution] = useState('');
  const [reportThreshold, setReportThreshold] = useState(3);
  const [appealThreshold, setAppealThreshold] = useState<'simple' | 'supermajority'>('simple');

  // Transaction States
  const [txState, setTxState] = useState<'idle' | 'approving' | 'submitting' | 'confirmed'>('idle');

  const parsedTags = tagsInput
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
    .slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet) {
      onAddToast('Please connect your wallet first to broadcast the transaction.', 'warning');
      connectWallet()
      return;
    }

    if (!name.trim()) {
      onAddToast('Community name is required.', 'error');
      return;
    }

    if (!constitution.trim()) {
      onAddToast('Constitution text is required to program the AI validator.', 'error');
      return;
    }

    createCommunity({
      name: name, 
      description: description, 
      constitution: constitution, 
      report_threshold: reportThreshold,
      appeal_threshold: appealThreshold,
      avatar_url: "",
      banner_url: "",
      tags: tagsInput.split(",")
    }, {
      onSuccess: () => {
        onAddToast('Community created successfully.', 'success');
        onNavigate("/communities")
      },
      onError: () => {
        onAddToast('Failed to create community.', 'error');
      }
    })
  };

  return (
    <div className="bg-[#000000] text-white min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-mono tracking-tight uppercase text-white">
          Create a Community
        </h1>
        <p className="text-[#888888] text-sm mt-1">
          Define your community's rules. Decentralized AI validators will enforce them on-chain.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 flex flex-col gap-8">
          {/* Identity Section */}
          <div className="bg-[#0d0d0d] border border-[#222222] p-6">
            <h2 className="text-sm font-bold font-mono tracking-wider uppercase mb-4 text-white border-b border-[#222222] pb-2">
              01. Identity
            </h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-mono text-[#888888] uppercase tracking-wide mb-1">
                  Community Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CryptographyPraxis"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#111111] border border-[#222222] font-mono text-white text-sm px-3 py-2 outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#888888] uppercase tracking-wide mb-1">
                  Description
                </label>
                <textarea
                  placeholder="What is the purpose of this community? (truncated in cards)"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#111111] border border-[#222222] text-white text-sm px-3 py-2 outline-none focus:border-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#888888] uppercase tracking-wide mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. cryptography, zk-proofs, math"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-[#111111] border border-[#222222] font-mono text-white text-sm px-3 py-2 outline-none focus:border-white"
                />
                <span className="text-[10px] text-[#555555] font-mono mt-1 block uppercase">
                  Separate tags with commas. Max 10 tags.
                </span>
              </div>
            </div>
          </div>

          {/* Constitution Section */}
          <div className="bg-[#0d0d0d] border border-[#222222] p-6">
            <h2 className="text-sm font-bold font-mono tracking-wider uppercase mb-4 text-white border-b border-[#222222] pb-2">
              02. The Constitution
            </h2>

            <label className="block text-xs font-mono text-white uppercase tracking-wide mb-1 font-bold">
              Community Constitution <span className="text-red-500">*</span>
            </label>
            <p className="text-[#888888] text-xs leading-relaxed mb-4">
              Write your rules in plain English. Be specific. The AI reads exactly what you write and will
              enforce exactly what you say. Vague rules lead to inconsistent moderation. Specific rules lead to
              fair outcomes.
            </p>

            {/* Examples Gray Box */}
            <div className="bg-[#111111] border border-[#222222] p-4 text-xs font-mono text-[#888888] leading-relaxed mb-4">
              <span className="text-white font-bold block uppercase mb-2 text-[10px]">Example Rules:</span>
              <ul className="list-disc pl-4 space-y-1">
                <li>Posts must be strictly about cryptography or privacy research.</li>
                <li>No promotional content, shilling, or affiliate presale links.</li>
                <li>Personal attacks, harassment, or flame wars are strictly prohibited.</li>
                <li>Off-topic memes are allowed ONLY if they contain a cryptography angle.</li>
                <li>No reposting external content without direct author attribution.</li>
              </ul>
            </div>

            <textarea
              required
              placeholder="CONSTITUTION OF YOUR COMMUNITY&#10;===============================&#10;&#10;RULE 1: ..."
              rows={12}
              maxLength={5000}
              value={constitution}
              onChange={(e) => setConstitution(e.target.value)}
              className="w-full bg-[#111111] border border-[#222222] font-mono text-white text-sm p-4 outline-none focus:border-white resize-y"
            />
            <div className="text-right text-[10px] text-[#555555] font-mono mt-1 uppercase">
              {constitution.length} / 5000 CHARACTERS
            </div>
          </div>

          {/* Moderation Settings */}
          <div className="bg-[#0d0d0d] border border-[#222222] p-6">
            <h2 className="text-sm font-bold font-mono tracking-wider uppercase mb-4 text-white border-b border-[#222222] pb-2">
              03. Moderation Settings
            </h2>

            <div className="flex flex-col gap-6">
              <div>
                <label className="block text-xs font-mono text-[#888888] uppercase tracking-wide mb-1">
                  Reports needed to trigger AI review
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={reportThreshold}
                  onChange={(e) => setReportThreshold(Math.max(1, Number(e.target.value)))}
                  className="bg-[#111111] border border-[#222222] font-mono text-white text-sm px-3 py-2 outline-none focus:border-white w-24"
                />
                <span className="text-[10px] text-[#555555] font-mono mt-1.5 block uppercase">
                  How many member flags before AI evaluates the post against your constitution?
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#888888] uppercase tracking-wide mb-2">
                  Appeal threshold / Standard
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Card 1 */}
                  <div
                    onClick={() => setAppealThreshold('simple')}
                    className={`p-4 border cursor-pointer select-none transition-colors ${appealThreshold === 'simple'
                        ? 'border-white bg-[#111111]'
                        : 'border-[#222222] bg-transparent hover:border-white/40'
                      }`}
                  >
                    <div className="font-bold text-xs font-mono text-white uppercase mb-1">
                      Simple Majority
                    </div>
                    <p className="text-[10px] text-[#888888] leading-relaxed">
                      AI gives standard, balanced evaluations of the context on appeal. Standard threshold.
                    </p>
                  </div>

                  {/* Card 2 */}
                  <div
                    onClick={() => setAppealThreshold('supermajority')}
                    className={`p-4 border cursor-pointer select-none transition-colors ${appealThreshold === 'supermajority'
                        ? 'border-white bg-[#111111]'
                        : 'border-[#222222] bg-transparent hover:border-white/40'
                      }`}
                  >
                    <div className="font-bold text-xs font-mono text-white uppercase mb-1">
                      Supermajority Protection
                    </div>
                    <p className="text-[10px] text-[#888888] leading-relaxed">
                      AI gives significant benefit of the doubt to the author on appeal. Excellent for highly open communities.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={isCreatingCommunity}
              className="w-full bg-white text-black py-3 px-4 font-bold uppercase tracking-wider text-sm hover:bg-[#dddddd] transition-colors disabled:bg-[#222222] disabled:text-[#555555] disabled:cursor-not-allowed"
            >
              {!isCreatingCommunity ? 'Create Community' : 'Creating sovereign space...'}
            </button>
            <p className="text-center text-[10px] text-[#555555] font-mono uppercase">
              Creating a community is free. No deposit required.
            </p>
          </div>
        </form>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 sticky top-24 flex flex-col gap-4">
          <span className="text-xs font-mono text-[#555555] uppercase tracking-widest">
            Live Community Card Preview
          </span>

          <div className="bg-[#111111] border border-[#222222] p-6">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold font-mono text-white truncate max-w-[70%]">
                {name.trim() || 'UntitledCommunity'}
              </h3>
              <span className="text-[10px] text-[#555555] font-mono">
                {wallet ? `0x${wallet.slice(2, 6)}...${wallet.slice(-4)}` : '0xConnectWallet'}
              </span>
            </div>

            <p className="text-[#888888] text-xs mb-4 min-h-[2rem] line-clamp-2 leading-relaxed">
              {description.trim() || 'No description provided. Start typing above to update this card live.'}
            </p>

            <div className="flex flex-wrap gap-1 mb-4 h-6 overflow-hidden">
              {parsedTags.length === 0 ? (
                <span className="text-[10px] text-[#555555] border border-[#222222]/50 px-2 py-0.5 font-mono uppercase">
                  #notags
                </span>
              ) : (
                parsedTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] text-[#888888] border border-[#222222] px-2 py-0.5 font-mono uppercase"
                  >
                    #{tag}
                  </span>
                ))
              )}
            </div>

            <div className="text-[11px] text-[#888888] font-mono mb-4 pb-4 border-b border-[#222222]">
              1 members · 0 posts · Created by You
            </div>

            {/* Constitution preview */}
            <div className="bg-[#0d0d0d] border border-[#222222] p-4 mb-4">
              <div className="text-[9px] font-mono text-[#555555] tracking-widest uppercase mb-1">
                CONSTITUTION PREVIEW
              </div>
              <p className="text-xs text-[#888888] font-mono italic leading-relaxed line-clamp-3 min-h-[3.5rem]">
                {constitution.trim() ? `"${constitution}"` : '"No constitution written yet. Begin rule declaration..."'}
              </p>
            </div>

            <div className="text-[10px] font-mono text-[#555555] mb-4 uppercase tracking-wide">
              ⚠️ Posts flagged after {reportThreshold} reports trigger decentralized AI validation
            </div>

            <button
              disabled
              className="w-full text-center bg-transparent border border-[#222222] text-[#555555] py-2.5 px-4 font-mono font-bold text-xs uppercase cursor-not-allowed"
            >
              Enter Community
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

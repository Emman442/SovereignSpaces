import React, { useState, useEffect } from 'react';
import { ToastContainer, ToastMessage } from './components/Toast.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { ExplorePage } from './components/ExplorePage.tsx';
import { CommunityPage } from './components/CommunityPage.tsx';
import { CreateCommunityPage } from './components/CreateCommunityPage.tsx';
import { PostDetailPage } from './components/PostDetailPage.tsx';
import { ProfilePage } from './components/ProfilePage.tsx';
import { Community } from './lib/contract/types.ts';
import { useFetchCommunities } from './hooks/SovereignSpaces.ts';
import { useWallet } from './lib/genlayer/wallet.ts';
import { WalletProvider } from './lib/genlayer/wallet.ts';

function MainAppContent() {
  const { address: wallet, connectWallet, disconnectWallet } = useWallet();

  // Router State
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'success' | 'error' | 'warning') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch all communities to populate homepage and explore

  const {data: communities, isPending: isLoadingCommunities} = useFetchCommunities()


  // Programmatic Navigate
  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Routing Logic and Param Parsing
  const renderRoute = () => {
    // 1. Landing Page
    if (currentPath === '/' || currentPath === '') {
      return (
        <LandingPage
          communities={communities || []}
          onNavigate={navigateTo}
          onConnectWallet={() => connectWallet}
          isConnected={!!wallet}
        />
      );
    }

    // 2. Explore Communities
    if (currentPath === '/communities') {
      return (
        <ExplorePage
          communities={communities || []}
          onNavigate={navigateTo}
          isLoading={isLoadingCommunities}
        />
      );
    }

    // 3. Create Community Form
    if (currentPath === '/create') {
      return (
        <CreateCommunityPage
          onAddToast={addToast}
          onNavigate={navigateTo}
        />
      );
    }

    // 4. Post Detail View: /communities/:id/posts/:postId
    const postDetailMatch = currentPath.match(/^\/communities\/([^/]+)\/posts\/([^/]+)$/);
    if (postDetailMatch) {
      const [_, communityId, postId] = postDetailMatch;
      return (
        <PostDetailPage
          communityId={communityId}
          postId={postId}
          onAddToast={addToast}
          onNavigate={navigateTo}
        />
      );
    }

    // 5. Community Detail Page: /communities/:id
    const communityMatch = currentPath.match(/^\/communities\/([^/]+)$/);
    if (communityMatch) {
      const [_, communityId] = communityMatch;
      return (
        <CommunityPage
          communityId={communityId}
          onAddToast={addToast}
          onNavigate={navigateTo}
        />
      );
    }

    // 6. Profile Page: /profile/:wallet
    const profileMatch = currentPath.match(/^\/profile\/([^/]+)$/);
    if (profileMatch) {
      const [_, viewingWallet] = profileMatch;
      return (
        <ProfilePage
          viewingWallet={viewingWallet}
          onAddToast={addToast}
          onNavigate={navigateTo}
        />
      );
    }

    // 404 Fallback
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center font-mono">
        <h2 className="text-xl font-bold uppercase text-white mb-2">Protocol Error 404</h2>
        <p className="text-[#888888] text-xs mb-6">Specified block path is unregistered on-chain.</p>
        <button
          onClick={() => navigateTo('/')}
          className="bg-white text-black py-2.5 px-6 font-bold uppercase text-xs hover:bg-[#dddddd]"
        >
          Return to Core Hub
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col font-sans select-none antialiased selection:bg-white selection:text-black">
      {/* Sticky Header Navbar */}
      <header className="sticky top-0 z-40 bg-[#000000] border-b border-[#222222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span
              onClick={() => navigateTo('/')}
              className="text-xl font-bold font-mono tracking-tighter text-white cursor-pointer uppercase hover:opacity-85 select-none"
            >
              SOVEREIGNSPACES
            </span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 border border-[#222222] text-[9px] font-mono uppercase tracking-wide text-[#888888] bg-transparent">
              ● GenLayer Studionet
            </span>
          </div>

          {/* Center Links */}
          <nav className="hidden md:flex gap-8 text-sm font-sans">
            <button
              onClick={() => navigateTo('/communities')}
              className={`hover:text-[#888888] transition-colors cursor-pointer ${
                currentPath === '/communities' ? 'text-white font-medium' : 'text-[#888888]'
              }`}
            >
              Explore
            </button>
            <button
              onClick={() => navigateTo('/create')}
              className={`hover:text-[#888888] transition-colors cursor-pointer ${
                currentPath === '/create' ? 'text-white font-medium' : 'text-[#888888]'
              }`}
            >
              Create Community
            </button>
          </nav>

          {/* Right Actions: Connected wallet or Trigger */}
          <div className="flex items-center gap-3 font-mono">
            {wallet ? (
              <div className="flex items-center gap-2">
                <div
                  onClick={() => navigateTo(`/profile/${wallet}`)}
                  className="bg-[#111111] border border-[#222222] hover:border-white/50 cursor-pointer px-3 py-1.5 flex items-center gap-2 transition-colors"
                >
                  <span className="text-[10px] text-[#888888] uppercase hidden sm:inline">
                    {"USER"}
                  </span>
                  <span className="text-xs font-bold text-white select-none">
                    0x{wallet.slice(2, 6)}...{wallet.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    disconnectWallet();
                    addToast('Wallet identity disconnected.', 'warning');
                    navigateTo('/');
                  }}
                  className="text-[#888888] hover:text-white hover:bg-[#111111] border border-transparent hover:border-[#222222] p-1.5 transition-all text-xs"
                  title="Disconnect Wallet"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-white text-black px-4 py-2 font-medium text-sm transition-colors hover:bg-white/80"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-grow">{renderRoute()}</main>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <MainAppContent />
    </WalletProvider>
  );
}

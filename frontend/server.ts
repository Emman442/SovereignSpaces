import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { dbService } from './serverDb.ts';
import { Community, Post, Verdict, ModerationLog, Amendment, Member, Profile } from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy Gemini Initialization & Call function
async function runAiReview(
  postTitle: string,
  postContent: string,
  constitution: string,
  appealContext?: string,
  isAppeal = false,
  appealThreshold: 'simple' | 'supermajority' = 'simple'
) {
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyPlaceholder = !apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '';

  if (isKeyPlaceholder) {
    console.warn('GEMINI_API_KEY is not set or is placeholder. Using rule-based simulated AI validator.');
    return runMockAiReview(postTitle, postContent, constitution, appealContext, isAppeal, appealThreshold);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const appealInstruction = isAppeal
      ? `This is an APPEAL. The author of the post has provided the following additional context: "${appealContext}".
         Re-evaluate the post taking into account this explanation. 
         ${
           appealThreshold === 'supermajority'
             ? `CRITICAL NOTE: This community uses "Supermajority Protection" for appeals. You must give extreme benefit of the doubt to the author. Unless the post is a gross, explicit, and direct violation of the constitution, you MUST return "no_violation" or "inconclusive". If there is any reasonable interpretation under which the post can remain, you must rule "no_violation".`
             : 'Evaluate the appeal fairly and objectively.'
         }`
      : 'Analyze the post objectively against the rules provided.';

    const systemInstruction = `You are a GenLayer decentralized on-chain AI Validator. 
Your sole function is to evaluate if a community post violates that community's Constitution.
You must be strict, literal, and follow the plain English rules of the Constitution exactly. 
Do not apply external corporate speech policies, political biases, or unwritten rules. Only what is written in the Constitution is law.

Return your decision in structured JSON format. 
You MUST provide the following fields:
- "verdict": Must be exactly 'violation', 'no_violation', or 'inconclusive'
- "ruleViolated": Specify which rule, section, or line number was violated (or 'None' if no_violation)
- "reasoning": A thorough, step-by-step reasoning citing the specific clauses and analyzing the post content.
- "confidence": An integer between 0 and 100 representing your confidence.
- "actionTaken": 'Post Removed' (if violation), 'Post Hidden' (if inconclusive), or 'No Action' (if no_violation)

${appealInstruction}`;

    const prompt = `COMMUNITY CONSTITUTION:
"""
${constitution}
"""

POST TO EVALUATE:
Title: ${postTitle}
Content:
"""
${postContent}
"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdict: {
              type: Type.STRING,
              description: "Must be exactly 'violation', 'no_violation', or 'inconclusive'",
            },
            ruleViolated: {
              type: Type.STRING,
              description: "Specific section/clause violated, or 'None' if no violation.",
            },
            reasoning: {
              type: Type.STRING,
              description: "Step-by-step reasoning citing the constitution clauses.",
            },
            confidence: {
              type: Type.INTEGER,
              description: 'Confidence rating as an integer from 0 to 100.',
            },
            actionTaken: {
              type: Type.STRING,
              description: "Must be 'Post Removed', 'Post Hidden', or 'No Action'.",
            },
          },
          required: ['verdict', 'ruleViolated', 'reasoning', 'confidence', 'actionTaken'],
        },
      },
    });

    const text = response.text || '';
    const cleanJsonText = text.trim();
    const result = JSON.parse(cleanJsonText);
    return {
      verdict: result.verdict as 'violation' | 'no_violation' | 'inconclusive',
      ruleViolated: result.ruleViolated || 'None',
      reasoning: result.reasoning || 'No explanation provided.',
      confidence: result.confidence || 90,
      actionTaken: result.actionTaken || 'No Action',
    };
  } catch (error) {
    console.error('Error invoking Gemini API:', error);
    return runMockAiReview(postTitle, postContent, constitution, appealContext, isAppeal, appealThreshold);
  }
}

// Fallback high-fidelity rule-based simulated AI validator
function runMockAiReview(
  postTitle: string,
  postContent: string,
  constitution: string,
  appealContext?: string,
  isAppeal = false,
  appealThreshold: 'simple' | 'supermajority' = 'simple'
) {
  const titleLower = postTitle.toLowerCase();
  const contentLower = postContent.toLowerCase();
  const constLower = constitution.toLowerCase();

  let verdict: 'violation' | 'no_violation' | 'inconclusive' = 'no_violation';
  let ruleViolated = 'None';
  let reasoning = 'The AI validator evaluated the post against the plain-text clauses of the community constitution.';
  let confidence = 85;
  let actionTaken = 'No Action';

  // Basic keyword rule matching matching seeded database logic
  if (
    titleLower.includes('presale') ||
    contentLower.includes('presale') ||
    titleLower.includes('join our telegram') ||
    contentLower.includes('tg.me') ||
    titleLower.includes('airdrop') ||
    contentLower.includes('airdrop') ||
    contentLower.includes('yield farm') ||
    contentLower.includes('yield-booster') ||
    titleLower.includes('100x') ||
    contentLower.includes('100x') ||
    contentLower.includes('scam-link')
  ) {
    if (constLower.includes('trading') || constLower.includes('shilling') || constLower.includes('spam') || constLower.includes('promotion')) {
      verdict = 'violation';
      ruleViolated = 'Anti-Spam / Trading Restrictions Section';
      reasoning = `The post is promotional and advertises high-yield farming, presales, or speculative tokens. The community constitution explicitly bans promotional spam and token price speculation.`;
      actionTaken = 'Post Removed';
      confidence = 98;
    }
  } else if (titleLower.includes('trump') || titleLower.includes('biden') || contentLower.includes('partisan') || contentLower.includes('debate')) {
    if (constLower.includes('partisan') || constLower.includes('politics')) {
      verdict = 'violation';
      ruleViolated = 'Section 2.1 Off-Topic Partisan Politics';
      reasoning = `The post discusses national political figures and general election outcomes which does not pertain to voting mechanics or liquid democracy software, violating the prohibition on off-topic partisan politics.`;
      actionTaken = 'Post Removed';
      confidence = 95;
    }
  } else if (
    contentLower.includes('idiot') ||
    contentLower.includes('moron') ||
    contentLower.includes('fool') ||
    titleLower.includes('scam') && contentLower.length < 100
  ) {
    if (constLower.includes('harassment') || constLower.includes('respect') || constLower.includes('personal attack')) {
      verdict = 'inconclusive';
      ruleViolated = 'Civility Clause';
      reasoning = `The post contains hostile or insulting language directed at individuals. While it does not warrant full deletion, it violates basic civility guidelines and has been hidden for detailed review.`;
      actionTaken = 'Post Hidden';
      confidence = 70;
    }
  }

  // Handle Appeal mechanics
  if (isAppeal && verdict === 'violation') {
    if (appealThreshold === 'supermajority') {
      // In supermajority, unless extremely clear scam, we reverse the ban
      if (contentLower.includes('scam-link') || contentLower.includes('scam')) {
        reasoning = `Appeal Rejected. Even under Supermajority Protection, the post links to known malicious/scam vectors which is an egregious and un-appealable violation of security rules.`;
      } else {
        verdict = 'no_violation';
        ruleViolated = 'None';
        reasoning = `Appeal Approved. Under the community's Supermajority Protection, the author's explanation ("${appealContext}") provides sufficient context to grant the benefit of the doubt. The violation was reversed.`;
        actionTaken = 'No Action';
        confidence = 92;
      }
    } else {
      // Simple majority appeal
      if (appealContext && appealContext.length > 15) {
        verdict = 'no_violation';
        ruleViolated = 'None';
        reasoning = `Appeal Approved. The author clarified the off-topic elements in their appeal: "${appealContext}". The validator accepted this reasoning as satisfying the constitution in spirit.`;
        actionTaken = 'No Action';
        confidence = 80;
      } else {
        reasoning = `Appeal Rejected. The provided appeal context ("${appealContext || 'None'}") does not sufficiently address or justify the constitutional violation detected.`;
      }
    }
  }

  return { verdict, ruleViolated, reasoning, confidence, actionTaken };
}

// REST API Routes

// 1. Get all communities
app.get('/api/communities', (req, res) => {
  const db = dbService.get();
  res.json(Object.values(db.communities));
});

// 2. Get single community details + posts + amendments + logs
app.get('/api/communities/:id', (req, res) => {
  const { id } = req.params;
  const db = dbService.get();
  const community = db.communities[id];

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  const posts = Object.values(db.posts).filter((p) => p.communityId === id);
  const logs = db.moderationLogs.filter((l) => l.communityId === id);
  const amendments = db.amendments[id] || [];
  const members = Object.values(db.members[id] || {});

  res.json({
    community,
    posts,
    logs,
    amendments,
    members,
  });
});

// 3. Create a community
app.post('/api/communities', (req, res) => {
  const { id, name, description, tags, constitution, reportThreshold, appealThreshold, creator } = req.body;

  if (!id || !name || !constitution || !creator) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const db = dbService.get();

  if (db.communities[id]) {
    return res.status(400).json({ error: 'Community ID already exists' });
  }

  const newCommunity: Community = {
    id,
    name,
    description: description || '',
    tags: tags || [],
    constitution,
    reportThreshold: Number(reportThreshold) || 3,
    appealThreshold: appealThreshold || 'simple',
    creator,
    founded: new Date().toISOString(),
    memberCount: 1,
    postCount: 0,
    moderators: [creator],
    founder: creator,
  };

  db.communities[id] = newCommunity;

  // Set up initial membership list
  if (!db.members[id]) {
    db.members[id] = {};
  }
  db.members[id][creator] = {
    communityId: id,
    wallet: creator,
    joinedAt: new Date().toISOString(),
    postsCount: 0,
    role: 'founder',
  };

  // Set up initial amendments entry
  if (!db.amendments[id]) {
    db.amendments[id] = [];
  }

  dbService.save(db);
  res.status(201).json(newCommunity);
});

// 4. Create a post
app.post('/api/communities/:id/posts', (req, res) => {
  const { id } = req.params;
  const { title, content, contentType, author } = req.body;

  if (!title || !content || !author) {
    return res.status(400).json({ error: 'Missing post title, content, or author wallet' });
  }

  const db = dbService.get();
  const community = db.communities[id];

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  const postId = `post-${Date.now()}`;
  const newPost: Post = {
    id: postId,
    communityId: id,
    author,
    title,
    content,
    contentType: contentType || 'text',
    createdAt: new Date().toISOString(),
    reports: [],
    status: 'active',
    verdict: null,
  };

  db.posts[postId] = newPost;
  community.postCount += 1;

  // Increment author's post count in membership
  if (db.members[id] && db.members[id][author]) {
    db.members[id][author].postsCount += 1;
  }

  dbService.save(db);
  res.status(201).json(newPost);
});

// 5. Report a post
app.post('/api/posts/:id/report', (req, res) => {
  const { id } = req.params;
  const { wallet } = req.body;

  if (!wallet) {
    return res.status(400).json({ error: 'Reporter wallet address is required' });
  }

  const db = dbService.get();
  const post = db.posts[id];

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (post.reports.includes(wallet)) {
    return res.status(400).json({ error: 'You have already reported this post' });
  }

  post.reports.push(wallet);

  const community = db.communities[post.communityId];
  if (post.reports.length >= community.reportThreshold && post.status === 'active') {
    // Flag the post but don't delete yet—waiting for AI Review
    post.status = 'active'; // Remains active, but shows "Trigger AI Review"
  }

  dbService.save(db);
  res.json(post);
});

// 6. Delete your own post
app.post('/api/posts/:id/delete', (req, res) => {
  const { id } = req.params;
  const { wallet } = req.body;

  const db = dbService.get();
  const post = db.posts[id];

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (post.author.toLowerCase() !== wallet.toLowerCase()) {
    return res.status(403).json({ error: 'Only the author can delete this post' });
  }

  delete db.posts[id];
  const community = db.communities[post.communityId];
  if (community) {
    community.postCount = Math.max(0, community.postCount - 1);
  }

  dbService.save(db);
  res.json({ success: true });
});

// 7. Trigger AI review of a post
app.post('/api/posts/:id/trigger-review', async (req, res) => {
  const { id } = req.params;
  const { triggeredBy } = req.body;

  const db = dbService.get();
  const post = db.posts[id];

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const community = db.communities[post.communityId];
  if (!community) {
    return res.status(404).json({ error: 'Associated community not found' });
  }

  try {
    const aiResult = await runAiReview(
      post.title,
      post.content,
      community.constitution,
      undefined,
      false,
      community.appealThreshold
    );

    const verdictId = `verdict-${Date.now()}`;
    const newVerdict: Verdict = {
      id: verdictId,
      postId: id,
      communityId: post.communityId,
      verdict: aiResult.verdict,
      ruleViolated: aiResult.ruleViolated,
      reasoning: aiResult.reasoning,
      confidence: aiResult.confidence,
      actionTaken: aiResult.actionTaken,
      moderatedAt: new Date().toISOString(),
      isAppeal: false,
      triggeredBy: triggeredBy || 'System Protocol',
    };

    post.verdict = newVerdict;

    // Apply the action
    if (aiResult.verdict === 'violation') {
      post.status = 'removed';
    } else if (aiResult.verdict === 'inconclusive') {
      post.status = 'hidden';
    } else {
      post.status = 'active';
    }

    // Add to chronological moderation logs
    const newLog: ModerationLog = {
      id: `log-${Date.now()}`,
      postId: id,
      postTitle: post.title,
      communityId: post.communityId,
      communityName: community.name,
      verdict: aiResult.verdict,
      actionTaken: aiResult.actionTaken,
      reasoning: aiResult.reasoning,
      ruleViolated: aiResult.ruleViolated,
      timestamp: new Date().toISOString(),
      triggeredBy: triggeredBy || 'System Protocol',
    };

    db.moderationLogs.unshift(newLog);
    dbService.save(db);

    res.json({ post, verdict: newVerdict });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI review execution failed' });
  }
});

// 8. Appeal a moderation decision
app.post('/api/posts/:id/appeal', async (req, res) => {
  const { id } = req.params;
  const { wallet, appealContext } = req.body;

  if (!appealContext) {
    return res.status(400).json({ error: 'Appeal explanation is required' });
  }

  const db = dbService.get();
  const post = db.posts[id];

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (post.author.toLowerCase() !== wallet.toLowerCase()) {
    return res.status(403).json({ error: 'Only the post author can submit an appeal' });
  }

  const community = db.communities[post.communityId];
  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  // Set post state to appealing
  post.status = 'appealing';
  post.appealContext = appealContext;
  dbService.save(db);

  try {
    // Run AI review again taking the appeal context and threshold style into account
    const aiResult = await runAiReview(
      post.title,
      post.content,
      community.constitution,
      appealContext,
      true,
      community.appealThreshold
    );

    const verdictId = `verdict-appeal-${Date.now()}`;
    const newVerdict: Verdict = {
      id: verdictId,
      postId: id,
      communityId: post.communityId,
      verdict: aiResult.verdict,
      ruleViolated: aiResult.ruleViolated,
      reasoning: aiResult.reasoning,
      confidence: aiResult.confidence,
      actionTaken: aiResult.actionTaken === 'No Action' ? 'Reinstated' : aiResult.actionTaken,
      moderatedAt: new Date().toISOString(),
      isAppeal: true,
      triggeredBy: wallet,
    };

    post.verdict = newVerdict;

    if (aiResult.verdict === 'violation') {
      post.status = 'removed';
    } else if (aiResult.verdict === 'inconclusive') {
      post.status = 'hidden';
    } else {
      post.status = 'active';
    }

    // Add appeal event to logs
    const newLog: ModerationLog = {
      id: `log-${Date.now()}`,
      postId: id,
      postTitle: post.title,
      communityId: post.communityId,
      communityName: community.name,
      verdict: aiResult.verdict,
      actionTaken: aiResult.actionTaken === 'No Action' ? 'Reinstated on Appeal' : `Appeal Rejected: ${aiResult.actionTaken}`,
      reasoning: aiResult.reasoning,
      ruleViolated: aiResult.ruleViolated,
      timestamp: new Date().toISOString(),
      triggeredBy: wallet,
    };

    db.moderationLogs.unshift(newLog);
    dbService.save(db);

    res.json({ post, verdict: newVerdict });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Appeal execution failed' });
  }
});

// 9. Propose an Amendment
app.post('/api/communities/:id/amendments', (req, res) => {
  const { id } = req.params;
  const { proposedBy, description, oldConstitution, newConstitution } = req.body;

  if (!proposedBy || !description || !newConstitution) {
    return res.status(400).json({ error: 'Missing amendment details' });
  }

  const db = dbService.get();
  const community = db.communities[id];

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  // Ensure proposer is a moderator or founder
  const membership = db.members[id]?.[proposedBy];
  if (!membership || (membership.role !== 'moderator' && membership.role !== 'founder')) {
    return res.status(403).json({ error: 'Only founders and moderators can propose constitution amendments' });
  }

  const amendmentId = `amend-${Date.now()}`;
  const newAmendment: Amendment = {
    id: amendmentId,
    communityId: id,
    proposedBy,
    description,
    oldConstitution: oldConstitution || community.constitution,
    newConstitution,
    status: 'voting',
    votesFor: [proposedBy], // Proposer votes For by default
    votesAgainst: [],
    createdAt: new Date().toISOString(),
  };

  if (!db.amendments[id]) {
    db.amendments[id] = [];
  }
  db.amendments[id].push(newAmendment);

  dbService.save(db);
  res.status(201).json(newAmendment);
});

// 10. Vote on an Amendment
app.post('/api/communities/:id/amendments/:amendmentId/vote', (req, res) => {
  const { id, amendmentId } = req.params;
  const { wallet, support } = req.body;

  if (!wallet || support === undefined) {
    return res.status(400).json({ error: 'Wallet and vote option are required' });
  }

  const db = dbService.get();
  const community = db.communities[id];

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  // Check if wallet is a member
  const membership = db.members[id]?.[wallet];
  if (!membership) {
    return res.status(403).json({ error: 'Only community members can vote on amendments' });
  }

  const amendments = db.amendments[id] || [];
  const amendment = amendments.find((a) => a.id === amendmentId);

  if (!amendment) {
    return res.status(404).json({ error: 'Amendment not found' });
  }

  if (amendment.status !== 'voting') {
    return res.status(400).json({ error: 'Voting on this amendment has already closed' });
  }

  // Remove previous votes by this wallet
  amendment.votesFor = amendment.votesFor.filter((w) => w.toLowerCase() !== wallet.toLowerCase());
  amendment.votesAgainst = amendment.votesAgainst.filter((w) => w.toLowerCase() !== wallet.toLowerCase());

  if (support) {
    amendment.votesFor.push(wallet);
  } else {
    amendment.votesAgainst.push(wallet);
  }

  dbService.save(db);
  res.json(amendment);
});

// 11. Resolve an Amendment (Founder only)
app.post('/api/communities/:id/amendments/:amendmentId/resolve', (req, res) => {
  const { id, amendmentId } = req.params;
  const { wallet } = req.body;

  const db = dbService.get();
  const community = db.communities[id];

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  if (community.founder.toLowerCase() !== wallet.toLowerCase()) {
    return res.status(403).json({ error: 'Only the founder can resolve and merge amendments' });
  }

  const amendments = db.amendments[id] || [];
  const amendment = amendments.find((a) => a.id === amendmentId);

  if (!amendment) {
    return res.status(404).json({ error: 'Amendment not found' });
  }

  if (amendment.status !== 'voting') {
    return res.status(400).json({ error: 'Amendment already resolved' });
  }

  // Determine outcome
  const yesVotes = amendment.votesFor.length;
  const noVotes = amendment.votesAgainst.length;

  if (yesVotes > noVotes) {
    amendment.status = 'passed';
    // MERGE the new constitution text!
    community.constitution = amendment.newConstitution;
  } else {
    amendment.status = 'rejected';
  }

  dbService.save(db);
  res.json({ community, amendment });
});

// 12. Join Community
app.post('/api/communities/:id/join', (req, res) => {
  const { id } = req.params;
  const { wallet } = req.body;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  const db = dbService.get();
  const community = db.communities[id];

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  if (!db.members[id]) {
    db.members[id] = {};
  }

  if (db.members[id][wallet]) {
    return res.status(400).json({ error: 'You are already a member of this community' });
  }

  db.members[id][wallet] = {
    communityId: id,
    wallet,
    joinedAt: new Date().toISOString(),
    postsCount: 0,
    role: 'member',
  };

  community.memberCount += 1;
  dbService.save(db);

  res.json({ success: true, member: db.members[id][wallet], community });
});

// 13. Leave Community
app.post('/api/communities/:id/leave', (req, res) => {
  const { id } = req.params;
  const { wallet } = req.body;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  const db = dbService.get();
  const community = db.communities[id];

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  if (community.founder.toLowerCase() === wallet.toLowerCase()) {
    return res.status(400).json({ error: 'Founders cannot leave their own community.' });
  }

  if (!db.members[id] || !db.members[id][wallet]) {
    return res.status(400).json({ error: 'You are not a member of this community' });
  }

  delete db.members[id][wallet];
  community.memberCount = Math.max(1, community.memberCount - 1);

  // Remove moderator role if they were a mod
  community.moderators = community.moderators.filter((m) => m.toLowerCase() !== wallet.toLowerCase());

  dbService.save(db);
  res.json({ success: true, community });
});

// 14. Founder Moderation actions (Appoint Mod, Remove Mod, Ban)
app.post('/api/communities/:id/members/action', (req, res) => {
  const { id } = req.params;
  const { founderWallet, targetWallet, action } = req.body;

  if (!founderWallet || !targetWallet || !action) {
    return res.status(400).json({ error: 'Missing action details' });
  }

  const db = dbService.get();
  const community = db.communities[id];

  if (!community) {
    return res.status(404).json({ error: 'Community not found' });
  }

  if (community.founder.toLowerCase() !== founderWallet.toLowerCase()) {
    return res.status(403).json({ error: 'Only the founder can manage member roles.' });
  }

  const targetMember = db.members[id]?.[targetWallet];
  if (!targetMember) {
    return res.status(404).json({ error: 'Target member not found in community' });
  }

  if (action === 'appoint_mod') {
    targetMember.role = 'moderator';
    if (!community.moderators.includes(targetWallet)) {
      community.moderators.push(targetWallet);
    }
  } else if (action === 'remove_mod') {
    targetMember.role = 'member';
    community.moderators = community.moderators.filter((m) => m.toLowerCase() !== targetWallet.toLowerCase());
  } else if (action === 'ban') {
    delete db.members[id][targetWallet];
    community.memberCount = Math.max(1, community.memberCount - 1);
    community.moderators = community.moderators.filter((m) => m.toLowerCase() !== targetWallet.toLowerCase());
  } else {
    return res.status(400).json({ error: 'Invalid action' });
  }

  dbService.save(db);
  res.json({ success: true, targetMember, community });
});

// 15. Profiles & user activity
app.get('/api/profile/:wallet', (req, res) => {
  const { wallet } = req.params;
  const db = dbService.get();

  const profile = db.profiles[wallet] || { wallet, username: 'Anonymous' };
  const posts = Object.values(db.posts).filter((p) => p.author.toLowerCase() === wallet.toLowerCase());
  
  // Find all communities the user is a member of
  const joinedCommunities: Community[] = [];
  Object.keys(db.members).forEach((commId) => {
    if (db.members[commId][wallet]) {
      const comm = db.communities[commId];
      if (comm) joinedCommunities.push(comm);
    }
  });

  // Logs initiated or triggered by this user
  const logs = db.moderationLogs.filter((l) => l.triggeredBy.toLowerCase() === wallet.toLowerCase());

  res.json({
    profile,
    posts,
    communities: joinedCommunities,
    logs,
  });
});

app.post('/api/profile', (req, res) => {
  const { wallet, username } = req.body;

  if (!wallet || !username) {
    return res.status(400).json({ error: 'Wallet and display name required' });
  }

  const db = dbService.get();
  db.profiles[wallet] = {
    wallet,
    username,
  };

  dbService.save(db);
  res.json({ success: true, profile: db.profiles[wallet] });
});

// Serve Frontend Assets & SPA support
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SovereignSpaces Node Server listening on port ${PORT}`);
  });
}

startServer();

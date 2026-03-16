const Generation = require('../models/Generation');
const { generateContent } = require('../services/gemini');
const ffmpeg = require('fluent-ffmpeg');
const ffprobePath = require('ffprobe-static').path;
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfprobePath(ffprobePath);
ffmpeg.setFfmpegPath(ffmpegPath);

const { CREDIT_COSTS, PLANS } = require('../config/plans_backend');

// Helper to deduct credits after successful generation
const deductCredit = async (user, toolKey) => {
  if (user) {
    const amount = CREDIT_COSTS[toolKey] || 1;
    user.credits_remaining = Math.max(0, user.credits_remaining - amount);
    await user.save();
  }
};

const checkPlanAccess = (user, toolKey) => {
  // Demo/Guest users handle access through demoMiddleware
  if (!user) return true;
  if (user.role === 'admin') return true;
  const userPlan = user.plan || 'free';
  const planConfig = PLANS[userPlan];
  if (!planConfig) return false;
  return planConfig.features.includes(toolKey);
};

// Robust JSON extraction helper
const parseAIJSON = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI failed to generate a valid JSON response. Please try again.");
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    throw new Error("AI generated an invalid JSON structure.");
  }
};

/**
 * AI Hook Generation
 */
exports.generateHook = async (req, res) => {
  try {
    const { topic, platform, audience, hookStyle, language } = req.body;

    const prompt = `You are a world-class viral content strategist for ${platform}.
    Generate 10 viral hooks in ${language} for the topic: "${topic}".
    Target Audience: ${audience}
    Hook Style: ${hookStyle}

    Return the response in this EXACT JSON format:
    {
      "hooks": [
        {
          "text": "The hook text here",
          "type": "${hookStyle} Hook",
          "score": 8.5,
          "explanation": "Short explanation of why this works for ${audience} on ${platform}."
        }
      ]
    }`;

    // Check Plan Access
    if (!checkPlanAccess(req.fullUser, 'hooks')) {
      return res.status(403).json({ success: false, error: "This feature is locked in your current plan. Upgrade to unlock." });
    }

    const aiResponse = await generateContent(prompt);
    const parsedOutput = parseAIJSON(aiResponse);

    const generation = new Generation({
      type: 'hook',
      input: { topic, platform, audience, hookStyle, language },
      output: parsedOutput,
      platform,
      user: req.user._id
    });

    await generation.save();

    // Deduct credit
    await deductCredit(req.fullUser, 'generate-hook');

    res.status(200).json(parsedOutput);
  } catch (error) {
    console.error("Hook Generation Error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message.includes('JSON') ? "AI failed to generate a viral response. Please try with a more specific topic." : "An error occurred during generation. Our team has been notified."
    });
  }
};

/**
 * AI Reel Script Generation
 */
exports.generateScript = async (req, res) => {
  try {
    const { topic, language, duration } = req.body;

    const prompt = `You are a viral reel script writer. 
    Generate a viral reel script in ${language} about: "${topic}".
    Total duration: ${duration} seconds.

    Return the response in this EXACT JSON format:
    {
      "hook": "The opening hook",
      "script": "The full script body",
      "cta": "Call to action",
      "caption": "Suggested caption",
      "hashtags": ["tag1", "tag2", "tag3"]
    }`;

    // Check Plan Access
    if (!checkPlanAccess(req.fullUser, 'script-generator')) {
      return res.status(403).json({ success: false, error: "This feature is locked in your current plan. Upgrade to unlock." });
    }

    // Check Credits
    if (req.fullUser.credits_remaining < (CREDIT_COSTS['script-generator'] || 2)) {
      return res.status(403).json({ success: false, error: "Insufficient credits. Upgrade your plan to continue." });
    }

    const aiResponse = await generateContent(prompt);
    const parsedOutput = parseAIJSON(aiResponse);

    const generation = new Generation({
      type: 'script',
      input: { topic, language, duration },
      output: parsedOutput,
      user: req.user._id
    });

    await generation.save();

    // Deduct credit
    await deductCredit(req.fullUser, 'script-generator');

    res.status(200).json(parsedOutput);
  } catch (error) {
    console.error("Script Generation Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * AI Hook Analysis
 */
exports.analyzeHook = async (req, res) => {
  try {
    const { hook, platform, topic } = req.body;

    const prompt = `You are a world-class viral content strategist.
    Analyze the following social media hook based on modern algorithms (YouTube Shorts, Instagram Reels, TikTok).
    
    Hook: "${hook}"
    Platform: "${platform}"
    Topic: "${topic}"

    Analyze factors like Curiosity Gap, Emotional Trigger, Scroll-Stopping Power, Clarity, and Algorithm Friendliness.

    Return the output in this EXACT JSON format:
    {
      "viralScore": 85,
      "retentionPotential": "High",
      "emotionTrigger": "Curiosity",
      "explanation": "Why it works...",
      "strengths": ["...", "..."],
      "weaknesses": ["...", "..."],
      "improvedHooks": ["...", "...", "..."]
    }`;

    // Check Plan Access
    if (!checkPlanAccess(req.fullUser, 'hooks')) {
      return res.status(403).json({ success: false, error: "This feature is locked in your current plan. Upgrade to unlock." });
    }

    const aiResponse = await generateContent(prompt);
    const parsedOutput = parseAIJSON(aiResponse);

    const generation = new Generation({
      type: 'hook_analysis',
      input: { hook, topic },
      output: parsedOutput,
      platform,
      user: req.user._id
    });

    await generation.save();

    // Deduct credit
    await deductCredit(req.fullUser, 'hooks');

    res.status(200).json(parsedOutput);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * AI Title Generation
 */
exports.generateTitle = async (req, res) => {
  try {
    const { topic, platform } = req.body;
    const prompt = `You are a viral content strategist. Generate 10 attention-grabbing titles for "${topic}" on ${platform}.
    Return in JSON format: { "titles": ["...", "..."] }`;

    // Check Plan Access
    if (!checkPlanAccess(req.fullUser, 'titles')) {
      return res.status(403).json({ success: false, error: "This feature is locked in your current plan. Upgrade to unlock." });
    }

    const aiResponse = await generateContent(prompt);
    const parsedOutput = parseAIJSON(aiResponse);

    const generation = new Generation({ type: 'title', input: { topic }, output: parsedOutput, platform, user: req.user._id });
    await generation.save();

    // Deduct credit
    await deductCredit(req.fullUser, 'titles');

    res.status(200).json(parsedOutput);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * AI Script Analysis
 */
exports.analyzeScript = async (req, res) => {
  try {
    const { script, platform } = req.body;
    const prompt = `Analyze this video script for ${platform}: "${script}".
    Provide feedback on pacing, hooks, and retention.
    Return JSON: { "score": 85, "feedback": "...", "suggestions": ["...", "..."] }`;

    // Check Plan Access
    if (!checkPlanAccess(req.fullUser, 'scripts')) {
      return res.status(403).json({ success: false, error: "This feature is locked in your current plan. Upgrade to unlock." });
    }

    const aiResponse = await generateContent(prompt);
    const parsedOutput = parseAIJSON(aiResponse);

    const generation = new Generation({ type: 'script_analysis', input: { script }, output: parsedOutput, platform, user: req.user._id });
    await generation.save();

    // Deduct credit
    await deductCredit(req.fullUser, 'reel-analyzer'); // Script analyzer is pro

    res.status(200).json(parsedOutput);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * AI Idea Generation
 */
exports.generateIdeas = async (req, res) => {
  try {
    const { topic } = req.body;
    const prompt = `Generate 10 viral content ideas for the topic: "${topic}".
    Return JSON: { "ideas": [{ "title": "...", "angle": "..." }] }`;

    // Check Plan Access
    if (!checkPlanAccess(req.fullUser, 'ideas')) {
      return res.status(403).json({ success: false, error: "This feature is locked in your current plan. Upgrade to unlock." });
    }

    const aiResponse = await generateContent(prompt);
    const parsedOutput = parseAIJSON(aiResponse);

    if (!req.isDemo) {
      const generation = new Generation({ type: 'ideas', input: { topic }, output: parsedOutput, user: req.user._id });
      await generation.save();

      // Deduct credit
      await deductCredit(req.fullUser, 'ideas');
    }

    res.status(200).json(parsedOutput);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * AI Reel Analysis
 */
exports.analyzeReel = async (req, res) => {
  try {
    const { platform } = req.body;
    const prompt = `You are a viral reel strategist. Provide a comprehensive viral analysis for a ${platform} video.
    Return JSON: { 
      "score": 92, 
      "sections": [
        { "label": "Hook Strength", "score": 95, "desc": "..." },
        { "label": "Watch Retention", "score": 88, "desc": "..." }
      ],
      "suggestions": ["...", "..."]
    }`;

    // Check Plan Access
    if (!checkPlanAccess(req.fullUser, 'reel-analyzer')) {
      return res.status(403).json({ success: false, error: "This feature is locked in your current plan. Upgrade to unlock." });
    }

    const aiResponse = await generateContent(prompt);
    const parsedOutput = parseAIJSON(aiResponse);

    const generation = new Generation({ type: 'reel_analysis', input: { platform }, output: parsedOutput, platform, user: req.user._id });
    await generation.save();

    // Deduct credit
    await deductCredit(req.fullUser, 'reel-analyzer');

    res.status(200).json(parsedOutput);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * AI Trending Topics
 */
exports.getTrending = async (req, res) => {
  try {
    const { category = 'All' } = req.query;
    const prompt = `Identify top 5 trending topics for content creators in the category: "${category}".
    Return JSON: { "trends": [{ "topic": "...", "score": 95, "category": "...", "opportunity": "High" }] }`;

    const aiResponse = await generateContent(prompt);
    const parsedOutput = parseAIJSON(aiResponse);

    res.status(200).json(parsedOutput);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Dashboard Stats
 */
exports.getStats = async (req, res) => {
  try {
    const hooksCount = await Generation.countDocuments({ type: 'hook', user: req.user._id });
    const titlesCount = await Generation.countDocuments({ type: 'title', user: req.user._id });
    const scriptsCount = await Generation.countDocuments({ type: 'script', user: req.user._id });
    const analysisCount = await Generation.countDocuments({ type: { $in: ['hook_analysis', 'reel_analysis', 'script_analysis'] }, user: req.user._id });

    // Fetch latest user data for real credits
    const User = require('../models/User');
    const user = await User.findById(req.user._id);

    res.status(200).json({
      hooks: hooksCount,
      titles: titlesCount,
      scripts: scriptsCount,
      analysis: analysisCount,
      credits: user?.credits_remaining || 0,
      plan: user?.plan || 'free'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Recent Activity History
 */
exports.getHistory = async (req, res) => {
  try {
    const history = await Generation.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(10);
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * AI Instagram Caption Generation
 */
exports.generateCaption = async (req, res) => {
  try {
    const { topic, tone, platform } = req.body;

    const prompt = `You are a world-class ${platform} content creator.
    Generate 10 viral captions for: "${topic}".
    Tone: ${tone}
    Platform: ${platform}

    Return the response in this EXACT JSON format:
    {
      "options": [
        "Caption option 1",
        "Caption option 2",
        "Caption option 3",
        "Caption option 4",
        "Caption option 5",
        "Caption option 6",
        "Caption option 7",
        "Caption option 8",
        "Caption option 9",
        "Caption option 10"
      ],
      "hook": "One strong opening hook",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
    }`;

    // Check Plan Access
    if (!checkPlanAccess(req.fullUser, 'captions')) {
      return res.status(403).json({ success: false, error: "This feature is locked in your current plan. Upgrade to unlock." });
    }

    const aiResponse = await generateContent(prompt);
    const parsedOutput = parseAIJSON(aiResponse);

    if (!req.isDemo) {
      const generation = new Generation({
        type: 'caption',
        input: { topic, tone, platform },
        output: parsedOutput,
        platform,
        user: req.user._id
      });

      await generation.save();
      await deductCredit(req.fullUser, 'captions');
    }

    res.status(200).json(parsedOutput);
  } catch (error) {
    console.error("Caption Generation Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * AI Reel Viral Score Analysis
 */
exports.analyzeViralScore = async (req, res) => {
  try {
    const { caption, hook, topic } = req.body;

    const prompt = `Analyze the viral potential of this Reel content:
    Topic: "${topic}"
    Hook: "${hook}"
    Caption: "${caption}"

    Return the response in this EXACT JSON format:
    {
      "viralScore": 82,
      "strengths": ["Curiosity gap", "Short structure", "Emotional trigger"],
      "improvements": ["Add CTA", "Trending keywords", "Better hook"]
    }`;

    const aiResponse = await generateContent(prompt);
    const parsedOutput = parseAIJSON(aiResponse);

    const generation = new Generation({
      type: 'viral_score',
      input: { caption, hook, topic },
      output: parsedOutput,
      user: req.user._id
    });

    await generation.save();
    await deductCredit(req.fullUser, 'reel-analyzer');

    res.status(200).json(parsedOutput);
  } catch (error) {
    console.error("Viral Score Analysis Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * AI Improve Caption
 */
exports.improveCaption = async (req, res) => {
  try {
    const { caption } = req.body;

    const prompt = `Improve this Instagram caption for better engagement:
    Current Caption: "${caption}"

    Optimize it for:
    1. Hook strength
    2. Curiosity gap
    3. Structural clarity

    Return the response in this EXACT JSON format:
    {
      "originalScore": 65,
      "improvedScore": 88,
      "improvedCaption": "The better version here",
      "changesMade": "Detailed changes summary"
    }`;

    const aiResponse = await generateContent(prompt);
    const parsedOutput = parseAIJSON(aiResponse);

    const generation = new Generation({
      type: 'improve_caption',
      input: { caption },
      output: parsedOutput,
      user: req.user._id
    });

    await generation.save();
    await deductCredit(req.fullUser, 'captions');

    res.status(200).json(parsedOutput);
  } catch (error) {
    console.error("Improve Caption Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * AI Video Viral Score Analysis
 */
exports.analyzeVideoViralScore = async (req, res) => {
  try {
    const { caption, hashtags } = req.body;
    const videoFile = req.file;

    if (!req.user && !req.isDemo) {
      console.error("Video Viral Analysis: User not found in request (Unauthorized).");
      return res.status(401).json({ error: "User authentication failed." });
    }

    if (!videoFile) {
      console.error("Video Viral Analysis: No video file found in request.");
      return res.status(400).json({ error: "No video file uploaded." });
    }

    // 1. Extract Metadata
    const getMetadata = (filePath) => {
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) reject(err);
          else resolve(metadata);
        });
      });
    };

    let videoMetadata = {};
    try {
      const metadata = await getMetadata(videoFile.path);
      videoMetadata = {
        duration: metadata.format?.duration || "Unknown",
        size: metadata.format?.size || videoFile.size,
        format: metadata.format?.format_name || path.extname(videoFile.originalname),
        hasAudio: metadata.streams ? metadata.streams.some(s => s.codec_type === 'audio') : "Unknown",
        width: metadata.streams && metadata.streams[0] ? metadata.streams[0].width : 0,
        height: metadata.streams && metadata.streams[0] ? metadata.streams[0].height : 0
      };
    } catch (err) {
      console.warn("Metadata extraction failed, falling back to basic info:", err.message);
      videoMetadata = {
        duration: "Unknown",
        size: videoFile.size,
        hasAudio: "Unknown",
        format: path.extname(videoFile.originalname)
      };
    }

    // 2. AI Analysis Prompt
    const prompt = `You are a world-class viral video strategist.
    Analyze the following video content data for viral potential on Instagram Reels/TikTok/Shorts.

    Video Details:
    - Duration: ${videoMetadata.duration} seconds
    - Size: ${videoMetadata.size} bytes
    - Has Audio: ${videoMetadata.hasAudio}
    - Caption provided: "${caption || 'None'}"
    - Hashtags provided: "${hashtags || 'None'}"

    Analyze Hook Strength (based on first 3 seconds), Video Length vs Engagement, Caption Quality, and Hashtag Effectiveness.

    Return the response in this EXACT JSON format:
    {
      "score": 82,
      "sections": [
        { "label": "Hook Strength", "score": 85, "desc": "Brief explanation..." },
        { "label": "Watch Retention", "score": 75, "desc": "Brief explanation..." },
        { "label": "Content Clarity", "score": 90, "desc": "Brief explanation..." },
        { "label": "Emotional Impact", "score": 80, "desc": "Brief explanation..." },
        { "label": "Shareability", "score": 88, "desc": "Brief explanation..." }
      ],
      "suggestions": [
        "Suggestion 1",
        "Suggestion 2",
        "Suggestion 3"
      ]
    }`;

    // Check Plan Access
    if (!checkPlanAccess(req.fullUser, 'reel-analyzer')) {
      return res.status(403).json({ success: false, error: "This feature is locked in your current plan. Upgrade to unlock." });
    }

    const aiResponse = await generateContent(prompt);
    const parsedOutput = parseAIJSON(aiResponse);

    // 3. Save to History
    if (!req.isDemo) {
      const generation = new Generation({
        type: 'video_viral_score',
        input: {
          filename: videoFile.originalname,
          filesize: videoFile.size,
          caption,
          hashtags,
          metadata: videoMetadata
        },
        output: parsedOutput,
        user: req.user._id
      });

      await generation.save();

      // 4. Deduct credit
      await deductCredit(req.fullUser, 'analyze-video-viral-score');
    }

    res.status(200).json(parsedOutput);
  } catch (error) {
    console.error("Video Viral Analysis Error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message.includes('JSON') ? "AI failed to analyze this video properly. Ensure the video content is clear." : "Video performance analysis failed. Please try again later."
    });
  }
};

/**
 * AI Hashtag Generator
 */
exports.generateHashtags = async (req, res) => {
  try {
    const { topic, platform, contentType } = req.body;

    const prompt = `You are a world-class social media strategist specializing in viral growth.
    Generate a highly optimized list of hashtags for the following content:
    Topic: "${topic}"
    Platform: "${platform}"
    Content Type: "${contentType}"

    The hashtags should be grouped into three categories to maximize reach and engagement.

    Return the response in this EXACT JSON format:
    {
      "viral": ["#viral", "#explorepage", "... (5-7 tags)"],
      "medium": ["#tag", "#tag", "... (5-7 tags)"],
      "niche": ["#tag", "#tag", "... (5-7 tags)"]
    }
    Make sure the total count of hashtags is exactly 20.`;

    // Check Plan Access
    if (!checkPlanAccess(req.fullUser, 'hashtags')) {
      return res.status(403).json({ success: false, error: "This feature is locked in your current plan. Upgrade to unlock." });
    }

    const aiResponse = await generateContent(prompt);
    const parsedOutput = parseAIJSON(aiResponse);

    if (!req.isDemo) {
      const generation = new Generation({
        type: 'hashtags',
        input: { topic, platform, contentType },
        output: parsedOutput,
        platform,
        user: req.user._id
      });

      await generation.save();
      await deductCredit(req.fullUser, 'hashtags');
    }

    res.status(200).json(parsedOutput);
  } catch (error) {
    console.error("Hashtag Generation Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * AI Profile Screenshot Analysis
 */
exports.analyzeProfile = async (req, res) => {
  try {
    const { platform } = req.body;
    const screenshot = req.file;

    if (!screenshot) {
      return res.status(400).json({ error: "No profile screenshot uploaded." });
    }

    const { analyzeImage } = require('../services/gemini');

    const prompt = `You are a social media growth expert.
    Analyze this ${platform} profile screenshot and give a short growth report.

    IMPORTANT:
    - Keep the response short and clear.
    - Do NOT generate long paragraphs.
    - Provide only concise actionable points.
    - The Growth Score MUST be a single integer between 1 and 10. DO NOT exceed 10.

    Return the result in this EXACT JSON format:
    {
      "summary": {
        "username": "...",
        "followers": "...",
        "niche": "..."
      },
      "growthScore": 8,
      "topGrowthTips": ["Tip 1", "Tip 2", "Tip 3"],
      "bestPostingTime": "Concise time suggestion",
      "contentStrategy": "1-2 short suggestions",
      "viralContentIdea": "One short reel/video idea",
      "hashtagSeoTip": "One short discoverability tip"
    }

    Keep each point short and actionable.`;

    // Check Plan Access
    if (!checkPlanAccess(req.fullUser, 'profile-analyzer')) {
      return res.status(403).json({ success: false, error: "This feature is locked in your current plan. Upgrade to unlock." });
    }

    const aiResponse = await analyzeImage(prompt, screenshot.path, screenshot.mimetype);
    const parsedOutput = parseAIJSON(aiResponse);

    // Validation: Ensure growth score is within 1-10
    if (parsedOutput.growthScore) {
      parsedOutput.growthScore = Math.min(10, Math.max(1, parseInt(parsedOutput.growthScore) || 5));
    }

    // Save to History
    if (!req.isDemo) {
      const generation = new Generation({
        type: 'profile_analysis',
        input: { platform, filename: screenshot.originalname },
        output: parsedOutput,
        platform,
        user: req.user._id
      });

      await generation.save();
      await deductCredit(req.fullUser, 'profile-analyzer');
    }

    // Clean up uploaded file
    fs.unlink(screenshot.path, (err) => {
      if (err) console.error("Error deleting temp file:", err);
    });

    res.status(200).json(parsedOutput);
  } catch (error) {
    console.error("Profile Analysis Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * AI Full Post Generator
 */
exports.generateFullPost = async (req, res) => {
  try {
    const { topic, platform = 'Instagram' } = req.body;

    const prompt = `You are a world-class ${platform} growth strategist.
    Create a complete, high-converting social media post package for the topic: "${topic}".
    
    The package MUST include:
    1. 10 Viral Hooks: Each hook should use a different psychological trigger (curiosity, fear, desire, etc.)
    2. 10 Captions: Ranging from short & punchy to long & storytelling.
    3. 20 Hashtags: Optimized for maximum reach (mix of viral, medium, and niche).
    4. 3 Suggested Posting Times: Based on peak engagement for this niche.

    Return the response in this EXACT JSON format:
    {
      "hooks": [
        { "text": "Hook text", "trigger": "Trigger name" }
      ],
      "captions": [
        "Caption option 1",
        "..."
      ],
      "hashtags": ["#tag1", "#tag2", "..."],
      "postingTimes": ["Time 1", "Time 2", "Time 3"]
    }
    
    Ensure there are exactly 10 hooks, 10 captions, and 20 hashtags.`;

    // Check Plan Access
    if (!checkPlanAccess(req.fullUser, 'full-post')) {
      return res.status(403).json({ success: false, error: "This feature is locked in your current plan. Upgrade to unlock." });
    }

    const aiResponse = await generateContent(prompt);
    const parsedOutput = parseAIJSON(aiResponse);

    if (!req.isDemo) {
      const generation = new Generation({
        type: 'full_post',
        input: { topic, platform },
        output: parsedOutput,
        platform: platform.toLowerCase(),
        user: req.user._id
      });

      await generation.save();
      await deductCredit(req.fullUser, 'full-post');
    }

    res.status(200).json(parsedOutput);
  } catch (error) {
    console.error("Full Post Generation Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * AI Daily Viral Idea Feed
 */
exports.getDailyViralIdeas = async (req, res) => {
  try {
    const { category = 'Motivation', platform = 'Instagram Reels', language = 'English' } = req.query;

    const prompt = `You are a viral content strategist. Generate 5-10 fresh, trending viral content ideas for ${platform} in the category: "${category}".
    The ideas must be generated in the ${language} language.
    Each idea must be highly engaging and current.
    
    Return the response in this EXACT JSON format:
    {
      "ideas": [
        {
          "title": "Short catchy title in ${language}",
          "description": "Short description of the idea and why it works in ${language}",
          "platform": "${platform}",
          "category": "${category}",
          "viralityScore": 85
        }
      ]
    }`;

    const aiResponse = await generateContent(prompt);
    const parsedOutput = parseAIJSON(aiResponse);

    res.status(200).json(parsedOutput);
  } catch (error) {
    console.error("Daily Viral Ideas Error:", error);
    res.status(500).json({ error: error.message });
  }
};

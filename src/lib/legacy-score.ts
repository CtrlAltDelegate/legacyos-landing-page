import { WingProgress, LegacyScore, WingSlug } from '@/types';
import { WINGS_CONFIG } from './wings-config';

export function calculateLegacyScore(wingProgress: WingProgress[]): LegacyScore {
  const wingScores: LegacyScore['wingScores'] = {};
  let totalScore = 0;
  const maxPossibleTotal = WINGS_CONFIG.length * 100; // Each wing max 100 points

  WINGS_CONFIG.forEach(wingConfig => {
    const progress = wingProgress.find(wp => wp.wing.slug === wingConfig.slug);
    
    if (progress) {
      // Calculate score based on level completion and milestones
      const maxLevel = wingConfig.levels.length;
      const currentLevel = progress.currentLevel;
      const levelProgress = Math.min(currentLevel / maxLevel, 1);
      
      // Add bonus for completed milestones in current level
      const currentLevelConfig = wingConfig.levels.find(l => l.level === currentLevel);
      const milestoneBonus = currentLevelConfig 
        ? (progress.completedMilestones.length / currentLevelConfig.milestones.length) * 0.2
        : 0;
      
      const wingScore = Math.round((levelProgress + milestoneBonus) * 100);
      
      wingScores[wingConfig.slug] = {
        current: wingScore,
        max: 100,
        percentage: wingScore,
      };
      
      totalScore += wingScore;
    } else {
      // No progress yet
      wingScores[wingConfig.slug] = {
        current: 0,
        max: 100,
        percentage: 0,
      };
    }
  });

  return {
    total: Math.round(totalScore / WINGS_CONFIG.length), // Average across all wings
    wingScores,
    lastCalculated: new Date(),
  };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'; // Green
  if (score >= 60) return '#f59e0b'; // Yellow
  if (score >= 40) return '#f97316'; // Orange
  return '#ef4444'; // Red
}

export function getScoreLevel(score: number): string {
  if (score >= 90) return 'Exceptional';
  if (score >= 80) return 'Advanced';
  if (score >= 70) return 'Proficient';
  if (score >= 60) return 'Developing';
  if (score >= 40) return 'Beginning';
  return 'Foundation';
}

export function getNextMilestone(wingProgress: WingProgress): string | null {
  const wingConfig = WINGS_CONFIG.find(w => w.slug === wingProgress.wing.slug as WingSlug);
  if (!wingConfig) return null;
  
  const currentLevelConfig = wingConfig.levels.find(l => l.level === wingProgress.currentLevel);
  if (!currentLevelConfig) return null;
  
  // Find next incomplete milestone
  const completedMilestoneIds = wingProgress.completedMilestones;
  const nextMilestone = currentLevelConfig.milestones.find(
    milestone => !completedMilestoneIds.includes(milestone.title) // Using title as ID for now
  );
  
  return nextMilestone?.title || null;
}

export function calculateProgressPercentage(wingProgress: WingProgress): number {
  const wingConfig = WINGS_CONFIG.find(w => w.slug === wingProgress.wing.slug as WingSlug);
  if (!wingConfig) return 0;
  
  const currentLevelConfig = wingConfig.levels.find(l => l.level === wingProgress.currentLevel);
  if (!currentLevelConfig) return 0;
  
  const totalMilestones = currentLevelConfig.milestones.length;
  const completedMilestones = wingProgress.completedMilestones.length;
  
  return Math.round((completedMilestones / totalMilestones) * 100);
} 
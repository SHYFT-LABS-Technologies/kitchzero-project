export interface WasteTag {
  tag: string;
  confidence: number;
}

export function generateWasteTags(reason: string, wasteType: 'RAW' | 'PRODUCT'): string[] {
  const lowerReason = reason.toLowerCase();
  const tags: string[] = [];
  
  // Basic AI logic for waste categorization
  if (lowerReason.includes('expired') || lowerReason.includes('spoiled') || lowerReason.includes('rotten')) {
    tags.push('avoidable', 'storage issue');
  }
  
  if (lowerReason.includes('overcooked') || lowerReason.includes('burnt') || lowerReason.includes('ruined')) {
    tags.push('avoidable', 'preparation error');
  }
  
  if (lowerReason.includes('dropped') || lowerReason.includes('spilled') || lowerReason.includes('accident')) {
    tags.push('avoidable', 'handling error');
  }
  
  if (lowerReason.includes('leftover') || lowerReason.includes('customer') || lowerReason.includes('returned')) {
    tags.push('unavoidable', 'customer related');
  }
  
  if (lowerReason.includes('trim') || lowerReason.includes('peel') || lowerReason.includes('bone')) {
    tags.push('unavoidable', 'preparation waste');
  }
  
  if (lowerReason.includes('overorder') || lowerReason.includes('excess') || lowerReason.includes('surplus')) {
    tags.push('avoidable', 'planning issue');
  }
  
  if (lowerReason.includes('contaminated') || lowerReason.includes('cross-contamination')) {
    tags.push('avoidable', 'food safety');
  }
  
  // Default tags if no specific patterns found
  if (tags.length === 0) {
    tags.push(wasteType === 'RAW' ? 'raw waste' : 'product waste');
  }
  
  return [...new Set(tags)]; // Remove duplicates
}

export function calculateWasteScore(tags: string[]): number {
  let score = 0;
  
  if (tags.includes('avoidable')) score += 10;
  if (tags.includes('unavoidable')) score += 2;
  if (tags.includes('storage issue')) score += 8;
  if (tags.includes('preparation error')) score += 6;
  if (tags.includes('planning issue')) score += 9;
  if (tags.includes('food safety')) score += 10;
  
  return Math.min(score, 10); // Cap at 10
}

export function getSustainabilityInsights(wasteLogs: Array<{ tags: string[]; cost: number }>): {
  avoidableWaste: number;
  topIssues: Array<{ issue: string; cost: number; count: number }>;
  sustainabilityScore: number;
} {
  let avoidableWaste = 0;
  const issueMap = new Map<string, { cost: number; count: number }>();
  
  wasteLogs.forEach(log => {
    if (log.tags.includes('avoidable')) {
      avoidableWaste += log.cost;
    }
    
    log.tags.forEach(tag => {
      if (!issueMap.has(tag)) {
        issueMap.set(tag, { cost: 0, count: 0 });
      }
      const issue = issueMap.get(tag)!;
      issue.cost += log.cost;
      issue.count += 1;
    });
  });
  
  const topIssues = Array.from(issueMap.entries())
    .map(([issue, data]) => ({ issue, ...data }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);
  
  const totalWaste = wasteLogs.reduce((sum, log) => sum + log.cost, 0);
  const sustainabilityScore = totalWaste > 0 ? 
    Math.max(0, 100 - Math.round((avoidableWaste / totalWaste) * 100)) : 100;
  
  return {
    avoidableWaste,
    topIssues,
    sustainabilityScore
  };
}
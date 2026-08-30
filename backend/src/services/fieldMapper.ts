import { 
  SPARK_TB_FIELDS, 
  SPARK_GL_FIELDS, 
  OMNIA_TB_FIELDS, 
  OMNIA_GL_FIELDS, 
  COA_FIELDS, 
  StandardFieldDefinition 
} from '../config/standardSchemas';
import { FieldMappingItem, DatasetClassification, MatchType, WorkflowType } from '../types';

export class FieldMapper {
  // Levenshtein similarity calculation between 0.0 and 1.0
  public static calculateSimilarity(s1: string, s2: string): number {
    const a = s1.toLowerCase().trim();
    const b = s2.toLowerCase().trim();

    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;

    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    const distance = matrix[b.length][a.length];
    const maxLen = Math.max(a.length, b.length);
    return Math.max(0, 1 - distance / maxLen);
  }

  public static cleanHeader(h: string): string {
    return h
      .toLowerCase()
      .trim()
      .replace(/[_\s\-\.\/\(\)]+/g, ' ')
      .replace(/[^a-z0-9 ]/g, '')
      .trim();
  }

  public static getStandardFieldsForDataset(
    dataset: DatasetClassification, 
    workflow: WorkflowType = 'SPARK_JET'
  ): StandardFieldDefinition[] {
    if (workflow === 'SPARK_JET') {
      switch (dataset) {
        case 'TRIAL_BALANCE':
          return SPARK_TB_FIELDS;
        case 'GENERAL_LEDGER':
        case 'POPULATION':
          return SPARK_GL_FIELDS;
        case 'COA':
          return COA_FIELDS;
        default:
          return [];
      }
    } else {
      // OMNIA_JET
      switch (dataset) {
        case 'TRIAL_BALANCE':
          return OMNIA_TB_FIELDS;
        case 'GENERAL_LEDGER':
        case 'POPULATION':
          return OMNIA_GL_FIELDS;
        case 'COA':
          return COA_FIELDS;
        default:
          return [];
      }
    }
  }

  public static mapFields(
    sourceHeaders: string[],
    dataset: DatasetClassification,
    workflow: WorkflowType = 'SPARK_JET',
    existingMappings?: Record<string, string>
  ): FieldMappingItem[] {
    const standardFields = this.getStandardFieldsForDataset(dataset, workflow);
    const results: FieldMappingItem[] = [];
    const usedSourceHeaders = new Set<string>();

    for (const std of standardFields) {
      // 1. Check if explicit user override exists
      if (existingMappings && existingMappings[std.name] !== undefined) {
        const customSource = existingMappings[std.name];
        results.push({
          standardField: std.name,
          sourceField: customSource,
          matchType: 'MANUAL',
          confidence: 100,
          status: customSource ? 'OVERRIDDEN' : std.required ? 'UNMATCHED' : 'OPTIONAL',
          required: std.required,
          description: std.description,
        });
        if (customSource) usedSourceHeaders.add(customSource);
        continue;
      }

      let bestMatch: { sourceField: string; matchType: MatchType; confidence: number } = {
        sourceField: '',
        matchType: 'EXACT',
        confidence: 0,
      };

      const stdClean = this.cleanHeader(std.name);
      const stdLabelClean = this.cleanHeader(std.label);

      for (const src of sourceHeaders) {
        if (!src) continue;
        const srcClean = this.cleanHeader(src);

        // Tier 1: Exact string match
        if (src.toLowerCase().trim() === std.name.toLowerCase().trim()) {
          bestMatch = { sourceField: src, matchType: 'EXACT', confidence: 100 };
          break;
        }

        // Tier 2: Normalized exact match
        if (srcClean === stdClean || srcClean === stdLabelClean) {
          if (bestMatch.confidence < 98) {
            bestMatch = { sourceField: src, matchType: 'NORMALIZED', confidence: 98 };
          }
        }

        // Tier 3: Alias dictionary match
        for (const alias of std.aliases) {
          const aliasClean = this.cleanHeader(alias);
          if (srcClean === aliasClean || src.toLowerCase().trim() === alias.toLowerCase().trim()) {
            if (bestMatch.confidence < 95) {
              bestMatch = { sourceField: src, matchType: 'ALIAS', confidence: 95 };
            }
          } else if (srcClean.includes(aliasClean) || aliasClean.includes(srcClean)) {
            const sim = this.calculateSimilarity(srcClean, aliasClean);
            if (sim > 0.8 && bestMatch.confidence < Math.round(sim * 90)) {
              bestMatch = { sourceField: src, matchType: 'ALIAS', confidence: Math.round(sim * 90) };
            }
          }
        }

        // Tier 4: Fuzzy string similarity
        const nameSim = this.calculateSimilarity(srcClean, stdClean);
        const labelSim = this.calculateSimilarity(srcClean, stdLabelClean);
        const maxSim = Math.max(nameSim, labelSim);

        if (maxSim >= 0.75 && bestMatch.confidence < Math.round(maxSim * 90)) {
          bestMatch = { sourceField: src, matchType: 'FUZZY', confidence: Math.round(maxSim * 90) };
        }
      }

      const isMatched = bestMatch.confidence >= 65 && Boolean(bestMatch.sourceField);
      results.push({
        standardField: std.name,
        sourceField: isMatched ? bestMatch.sourceField : '',
        matchType: isMatched ? bestMatch.matchType : 'EXACT',
        confidence: isMatched ? bestMatch.confidence : 0,
        status: isMatched ? 'MATCHED' : std.required ? 'UNMATCHED' : 'OPTIONAL',
        required: std.required,
        description: std.description,
      });

      if (isMatched) {
        usedSourceHeaders.add(bestMatch.sourceField);
      }
    }

    return results;
  }
}

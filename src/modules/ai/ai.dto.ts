export interface AiSuggestionResponseDTO {
  title: string;
  tags: string[];
  summary: string;
}

export interface AiImproveResponseDTO {
  improvedContent: string;
  changes: string[];
  readingTimeMinutes: number;
}

export interface AiOutlineSectionDTO {
  heading: string;
  keyPoints: string[];
}

export interface AiOutlineResponseDTO {
  title: string;
  targetAudience: string;
  sections: AiOutlineSectionDTO[];
}

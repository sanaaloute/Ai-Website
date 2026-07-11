import { IsString, IsOptional, IsObject, IsArray } from 'class-validator';

export class ChatDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsString()
  prompt: string;

}

export class AnalyzeEditIntentDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsObject()
  manifest?: Record<string, unknown>;

}

export class CodeComponentDto {
  @IsObject()
  section: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  tokens?: Record<string, unknown>;

}

export class CodePageDto {
  @IsObject()
  page: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  sections?: Array<Record<string, unknown>>;

}

export class DesignTokensDto {
  @IsOptional()
  @IsObject()
  spec?: Record<string, unknown>;

}

export class SummarizeSpecDto {
  @IsString()
  prompt: string;

}

export class UiUxBlueprintDto {
  @IsOptional()
  @IsObject()
  spec?: Record<string, unknown>;

}

export class FilePlanDto {
  @IsOptional()
  @IsObject()
  spec?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  blueprint?: Record<string, unknown>;
}
